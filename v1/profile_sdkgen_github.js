'use strict'

// Standalone profile of @voxgig/sdkgen on the github case.
// Loads the already-resolved model via aontu (no apidef build step),
// then calls sdkgen.generate() with per-component timing instrumentation.

const Path = require('node:path')
const Fs = require('node:fs')

const SDK_DIR = Path.resolve(process.env.HOME, 'Projects/voxgig-sdk/github-sdk/.sdk')

// Write our own log so the piped tail doesn't buffer everything.
const LOG_FILE = '/tmp/sdkgen_profile.log'
try { Fs.unlinkSync(LOG_FILE) } catch {}
function log(...args) {
  const line = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ') + '\n'
  Fs.appendFileSync(LOG_FILE, line)
  process.stdout.write(line)
}

// Make sure we resolve jostraca/apidef/sdkgen from the github-sdk node_modules
// so the exact same package instances as the real build run are exercised.
process.chdir(SDK_DIR)

const JostracaModule = require(Path.join(SDK_DIR, 'node_modules/jostraca'))
const { Aontu } = require(Path.join(SDK_DIR, 'node_modules/aontu'))
const SdkGenModule = require(Path.join(SDK_DIR, 'node_modules/@voxgig/sdkgen'))
const ApiDefModule = require(Path.join(SDK_DIR, 'node_modules/@voxgig/apidef'))

const { SdkGen } = SdkGenModule

// ---------------- timing state ----------------
const compTime = new Map()
const compCalls = new Map()
function record(name, dtNs) {
  compTime.set(name, (compTime.get(name) || 0n) + dtNs)
  compCalls.set(name, (compCalls.get(name) || 0) + 1)
}

// Wrap a cmp so that we time the synchronous body (excluding the cmp framework overhead)
function wrap(name, cmpFn) {
  // cmpFn was produced by jostraca's cmp() — it has special internal behavior.
  // We wrap it by creating a new cmp over a timing function that delegates.
  return JostracaModule.cmp(function wrapped(props, children) {
    const t = process.hrtime.bigint()
    try {
      return cmpFn(props, children)
    } finally {
      record(name, process.hrtime.bigint() - t)
    }
  })
}

// The sdkgen.js barrel re-exports via getters so we cannot overwrite there.
// But each component lives in its own CommonJS module (dist/cmp/<Name>.js)
// whose `exports` is a plain object — patch those directly. Other files that
// already required these modules hold a live reference to that same exports
// object, so later cmp[Name](...) calls will see the wrapped function.
const SDKGEN_CMP_DIR = Path.join(SDK_DIR, 'node_modules/@voxgig/sdkgen/dist/cmp')
const CMP_NAMES = [
  'Main',
  'Entity',
  'Feature',
  'Readme',
  'ReadmeTop',
  'ReadmeInstall',
  'ReadmeQuick',
  'ReadmeIntro',
  'ReadmeModel',
  'ReadmeOptions',
  'ReadmeEntity',
  'ReadmeHowto',
  'ReadmeExplanation',
  'ReadmeRef',
  'Test',
  'FeatureHook',
]
for (const n of CMP_NAMES) {
  const mod = require(Path.join(SDKGEN_CMP_DIR, `${n}.js`))
  if (mod[n]) {
    Object.defineProperty(mod, n, {
      value: wrap(n, mod[n]),
      writable: true,
      configurable: true,
      enumerable: true,
    })
  }
}

// Also wrap the top-level Root (defined in the github-sdk src) since that is
// the entry point jostraca calls, and the walk time dominated by its children
// is what we want to attribute.
const RootModule = require(Path.join(SDK_DIR, 'dist/Root.js'))
if (RootModule.Root) {
  RootModule.Root = wrap('__Root', RootModule.Root)
}
// Target-specific wrappers: load each Entity_<target>, Main_<target>, Test_<target>
// eagerly and wrap them so we can attribute time per target-specific renderer.
const TARGETS = ['ts', 'js', 'go', 'lua', 'php', 'py', 'rb']
const TARGET_CMP = ['Entity', 'Main', 'Test']
for (const t of TARGETS) {
  for (const c of TARGET_CMP) {
    const p = Path.join(SDK_DIR, `dist/cmp/${t}/${c}_${t}.js`)
    if (Fs.existsSync(p)) {
      const mod = require(p)
      if (mod[c]) mod[c] = wrap(`${c}_${t}`, mod[c])
    }
  }
}

// ---------------- model load ----------------
async function main() {
  const modelPath = Path.join(SDK_DIR, 'model/sdk.jsonic')
  const src = Fs.readFileSync(modelPath, 'utf8')

  const aontu = new Aontu()
  const errs = []
  log('[PHASE] starting aontu model load')
  const tModelStart = process.hrtime.bigint()
  const model = aontu.generate(src, { path: modelPath, errs })
  const tModelNs = process.hrtime.bigint() - tModelStart
  if (errs.length) {
    log('model errors count:', errs.length, 'first:', errs[0]?.msg)
  }
  log(`[TIME] aontu model load: ${(Number(tModelNs) / 1e6).toFixed(1)} ms`)

  // The real pipeline also runs apidef.makeBuild, which mutates the model
  // (e.g. adds computed entity metadata). Run that ONCE so sdkgen sees the
  // same shape as `npm run generate`, but outside the sdkgen timer.
  const fakeBuild = {
    log: require(Path.join(SDK_DIR, 'node_modules/pino'))({ level: 'warn' }),
    spec: { debug: false },
  }

  const RUN_APIDEF = process.env.NO_APIDEF !== '1'
  if (RUN_APIDEF) {
    log('[PHASE] running apidef build (pre+post)')
    const apidefBuild = await ApiDefModule.ApiDef.makeBuild({
      folder: Path.join(SDK_DIR, 'model'),
    })
    const tApidefStart = process.hrtime.bigint()
    try {
      await apidefBuild(model, fakeBuild, { step: 'pre', state: {} })
      await apidefBuild(model, fakeBuild, { step: 'post', state: {} })
    } catch (e) {
      log('[WARN] apidef build step failed:', e.message)
    }
    const tApidefNs = process.hrtime.bigint() - tApidefStart
    log(`[TIME] apidef build (excluded from sdkgen total): ${(Number(tApidefNs) / 1e6).toFixed(1)} ms`)
  } else {
    log('[PHASE] NO_APIDEF=1 — skipping apidef build; sdkgen will see raw aontu model')
  }

  // ---------------- sdkgen generate ----------------
  const sdkgenBuild = await SdkGen.makeBuild({
    root: Path.join(SDK_DIR, 'dist/Root.js'),
    folder: Path.join(SDK_DIR, '..'),
    meta: { name: 'github' },
    model: { folder: Path.join(SDK_DIR, 'model') },
    existing: { txt: { merge: true } },
  })

  const RUNS = Number(process.env.SDKGEN_RUNS || 1)
  const sdkgenTotals = []
  let res
  for (let i = 0; i < RUNS; i++) {
    // Reset per-component counters for this run
    compTime.clear()
    compCalls.clear()
    log(`[PHASE] running sdkgen.generate (run ${i + 1}/${RUNS})`)
    const tGenStart = process.hrtime.bigint()
    res = await sdkgenBuild(model, fakeBuild, { step: 'post', state: {} })
    const tGenNs = process.hrtime.bigint() - tGenStart
    sdkgenTotals.push(Number(tGenNs) / 1e6)
    log(`[TIME] sdkgen run ${i + 1}: ${(Number(tGenNs) / 1e6).toFixed(1)} ms   ok=${res && res.ok}`)
  }

  const avgMs = sdkgenTotals.reduce((a, b) => a + b, 0) / sdkgenTotals.length
  log(`\n[TIME] sdkgen avg over ${RUNS} run(s): ${avgMs.toFixed(1)} ms`)
  const tGenNs = BigInt(Math.round(avgMs * 1e6))

  // ---------------- report ----------------
  const rows = [...compTime.entries()]
    .map(([name, ns]) => ({ name, ms: Number(ns) / 1e6, calls: compCalls.get(name) || 0 }))
    .sort((a, b) => b.ms - a.ms)

  const totalMs = Number(tGenNs) / 1e6
  log('\nPer-component time (body-only, sdkgen + target renderers):')
  log(' rank  component                        calls     total ms     avg ms     % of sdkgen')
  let i = 1
  for (const r of rows) {
    log(
      String(i++).padStart(5) + '  ' +
      r.name.padEnd(32) +
      String(r.calls).padStart(6) + '   ' +
      r.ms.toFixed(1).padStart(10) + '   ' +
      (r.ms / Math.max(1, r.calls)).toFixed(2).padStart(8) + '   ' +
      ((r.ms / totalMs) * 100).toFixed(1).padStart(6) + '%'
    )
  }
}

main().catch(e => { console.error(e); process.exit(1) })
