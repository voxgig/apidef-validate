const { test, describe, after } = require('node:test')
const assert = require('node:assert')
const Fs = require('node:fs')
const Os = require('node:os')
const Path = require('node:path')
const { spawnSync } = require('node:child_process')

const V1 = Path.join(__dirname, '..')
const SCRIPT = Path.join(__dirname, 'port-diff.js')

const model = (name) => ({ main: { kit: { entity: { planet: { name } } } } })

const made = []
after(() => made.forEach((dir) => Fs.rmSync(dir, { recursive: true, force: true })))

function tmpDir(prefix) {
  const dir = Fs.mkdtempSync(Path.join(Os.tmpdir(), prefix))
  made.push(dir)
  return dir
}

function dumpDir(files) {
  const dir = tmpDir('port-diff-')
  for (const [file, content] of Object.entries(files)) {
    Fs.writeFileSync(Path.join(dir, file), JSON.stringify(content))
  }
  return dir
}

function portDiff(...args) {
  const run = spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' })
  return { status: run.status, out: run.stdout + run.stderr }
}

const PAIR = { 'solar-1-openapi.ts.json': model('planet'), 'solar-1-openapi.go.json': model('moon') }


describe('port-diff script', () => {

  test('pair', () => {
    const run = portDiff(dumpDir(PAIR))
    assert.equal(run.status, 0, run.out)
    assert.match(run.out, /\| entity name \| solar-1-openapi \| 1 \| 0 \| 0 \| 1 \|/)
    assert.match(run.out, /^1 cases compared$/m)
    assert.doesNotMatch(run.out, /one side only/)
  })


  test('one-sided', () => {
    const dir = dumpDir({
      ...PAIR,
      'petstore-1-swagger.ts.json': model('pet'),
      'taxonomy-1-openapi.go.json': model('term'),
    })
    const run = portDiff(dir)
    assert.notEqual(run.status, 0, run.out)
    assert.match(run.out, /^ {2}TS only: petstore-1-swagger$/m)
    assert.match(run.out, /^ {2}Go only: taxonomy-1-openapi$/m)
    assert.match(run.out, /^1 cases compared$/m)

    const allowed = portDiff(dir, '--allow-one-sided')
    assert.equal(allowed.status, 0, allowed.out)
    assert.match(allowed.out, /^ {2}TS only: petstore-1-swagger$/m)
    assert.match(allowed.out, /^ {2}Go only: taxonomy-1-openapi$/m)
  })


  test('ts-only', () => {
    const graphql = dumpDir({ ...PAIR, 'linear-1-graphql.ts.json': model('issue') })
    const expected = portDiff(graphql, '--ts-only=graphql')
    assert.equal(expected.status, 0, expected.out)
    assert.match(expected.out, /^ {2}TS only: linear-1-graphql \(expected: --ts-only=graphql\)$/m)
    assert.notEqual(portDiff(graphql).status, 0)

    const gographql = dumpDir({ ...PAIR, 'linear-1-graphql.go.json': model('issue') })
    assert.notEqual(portDiff(gographql, '--ts-only=graphql').status, 0)

    const openapi = dumpDir({ ...PAIR, 'petstore-1-swagger.ts.json': model('pet') })
    assert.notEqual(portDiff(openapi, '--ts-only=graphql').status, 0)
  })


  test('nothing-compared', () => {
    for (const dir of [
      dumpDir({}),
      dumpDir({ 'solar-1-openapi.go.json': model('moon') }),
      Path.join(dumpDir({}), 'absent'),
    ]) {
      for (const flags of [[], ['--allow-one-sided']]) {
        const run = portDiff(dir, ...flags)
        assert.notEqual(run.status, 0, run.out)
        assert.match(run.out, /no case was compared/)
      }
    }
  })


  test('usage', () => {
    assert.equal(portDiff().status, 2)
    assert.equal(portDiff(dumpDir(PAIR), '--unknown').status, 2)
  })
})


const MAKE = spawnSync('make', ['--version']).status === 0
const NO_MAKE = ('win32' === process.platform || !MAKE) && 'needs make and a POSIX shell'

const INHERITED = ['MAKEFLAGS', 'MFLAGS', 'MAKELEVEL', 'GO', 'GOTEST', 'PORT_DIFF_DIR', 'PORT_DIFF_FLAGS']

function make(args, env) {
  const base = Object.fromEntries(Object.entries(process.env).filter(([key]) => !INHERITED.includes(key)))
  const run = spawnSync('make', ['-s', ...args], { cwd: V1, encoding: 'utf8', env: { ...base, ...env } })
  return { status: run.status, out: run.stdout + run.stderr }
}

// Stands in for npm and go on PATH: each writes the dump DUMP_MODEL names,
// then exits with the status given.
function stubHarnesses(tsExit, goExit) {
  const bin = tmpDir('port-diff-bin-')
  const stub = (port, exit) => '#!/bin/sh\nmkdir -p "$DUMP_MODEL"\n' +
    `echo '${JSON.stringify(model('planet'))}' > "$DUMP_MODEL/solar-1-openapi.${port}.json"\n` +
    `echo "${port} stub exit ${exit}"\nexit ${exit}\n`
  Fs.writeFileSync(Path.join(bin, 'npm'), stub('ts', tsExit), { mode: 0o755 })
  Fs.writeFileSync(Path.join(bin, 'go'), stub('go', goExit), { mode: 0o755 })
  return { PATH: bin + Path.delimiter + process.env.PATH }
}


describe('make port-diff', { skip: NO_MAKE }, () => {

  test('relative-dir', () => {
    const abs = Path.join(V1, 'relative-out')
    for (const [args, env] of [
      [['-n', 'port-diff', 'PORT_DIFF_DIR=relative-out'], {}],
      [['-n', 'port-diff'], { PORT_DIFF_DIR: 'relative-out' }],
    ]) {
      const run = make(args, env)
      assert.equal(run.status, 0, run.out)
      const dumps = [...run.out.matchAll(/DUMP_MODEL=(\S+)/g)].map((m) => m[1])
      assert.deepEqual(dumps, [abs, abs], run.out)
      assert.match(run.out, new RegExp(`^rm -rf ${abs}$`, 'm'))
      assert.match(run.out, new RegExp(`port-diff\\.js ${abs} `))
    }
  })


  test('harness-exit', () => {
    const out = tmpDir('port-diff-out-')

    const clean = make(['port-diff', 'PORT_DIFF_DIR=' + out], stubHarnesses(0, 0))
    assert.equal(clean.status, 0, clean.out)
    assert.match(clean.out, /^1 cases compared$/m)

    for (const [tsExit, goExit, port] of [[3, 0, 'TS'], [0, 4, 'Go']]) {
      const failed = make(['port-diff', 'PORT_DIFF_DIR=' + out], stubHarnesses(tsExit, goExit))
      assert.notEqual(failed.status, 0, failed.out)
      assert.match(failed.out, /^1 cases compared$/m)
      const log = Path.join(out, port.toLowerCase() + '-harness.log')
      assert.ok(failed.out.includes(`the ${port} harness exited ${tsExit || goExit}; see ${log}`), failed.out)
      assert.match(Fs.readFileSync(log, 'utf8'), new RegExp(`stub exit ${tsExit || goExit}`))
    }
  })
})
