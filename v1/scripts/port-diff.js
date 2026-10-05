// Compares the API models the two harnesses write with DUMP_MODEL set,
// `<case>.ts.json` from the TS port and `<case>.go.json` from the Go port, and
// counts their differences by class, as a markdown table. A case only one port
// dumped fails the run unless --allow-one-sided is given or --ts-only=<spec>
// names its spec; a run that pairs no case always fails.

const Fs = require('node:fs')
const Path = require('node:path')

const args = process.argv.slice(2)
const flags = args.filter((arg) => arg.startsWith('--'))
const [dir, ...extra] = args.filter((arg) => !arg.startsWith('--'))
const tsOnlySpecs = flags.filter((flag) => flag.startsWith('--ts-only=')).map((flag) => flag.slice('--ts-only='.length))
const known = (flag) => ['--detail', '--allow-one-sided'].includes(flag) || /^--ts-only=./.test(flag)
if (null == dir || 0 < extra.length || !flags.every(known)) {
  console.error('usage: node scripts/port-diff.js <dir> [--detail] [--allow-one-sided] [--ts-only=<spec>]...')
  process.exit(2)
}
const detail = flags.includes('--detail')
const allowOneSided = flags.includes('--allow-one-sided')

const isMap = (v) => null != v && 'object' === typeof v && !Array.isArray(v)

// Only the Go port writes an active flag left at its default, and neither
// renders it, so `a: true` and `active: true` are dropped from both sides.
function normalize(v) {
  if (Array.isArray(v)) return v.map(normalize)
  if (!isMap(v)) return v
  const out = {}
  for (const [key, val] of Object.entries(v)) {
    if (!(('a' === key || 'active' === key) && true === val)) out[key] = normalize(val)
  }
  return out
}

// Each difference is a path and which side holds it: ts, go, or both (differ).
function diff(ts, go, path, out) {
  if (isMap(ts) && isMap(go)) {
    for (const key of new Set([...Object.keys(ts), ...Object.keys(go)])) {
      if (!(key in go)) out.push({ path: [...path, key], side: 'ts', ts: ts[key] })
      else if (!(key in ts)) out.push({ path: [...path, key], side: 'go', go: go[key] })
      else diff(ts[key], go[key], [...path, key], out)
    }
  }
  else if (Array.isArray(ts) && Array.isArray(go)) {
    for (let i = 0; i < Math.max(ts.length, go.length); i++) {
      if (i >= go.length) out.push({ path: [...path, i], side: 'ts', ts: ts[i] })
      else if (i >= ts.length) out.push({ path: [...path, i], side: 'go', go: go[i] })
      else diff(ts[i], go[i], [...path, i], out)
    }
  }
  else if (JSON.stringify(ts) !== JSON.stringify(go)) {
    out.push({ path, side: 'differ', ts, go })
  }
}

// The class a difference belongs to, and the unit it is counted by.
function classify(path) {
  const [, , area, name, part, sub, attr] = path
  if ('entity' === area) {
    if (null == part) return ['entity', name]
    if ('relations' === part) return ['relations', name]
    if ('fields' === part) {
      if (null == attr) return ['field', name + '.' + sub]
      return ['union' === attr ? 'union' : 'field ' + attr, name + '.' + sub]
    }
    if ('op' === part) {
      if (null == attr) return ['op', name + '.' + sub]
      if ('points' === attr && null != path[8]) {
        return ['point ' + path[8], name + '.' + sub + '.' + path[7]]
      }
      return ['op ' + attr, name + '.' + sub]
    }
    return ['entity ' + part, name]
  }
  if ('flow' === area) {
    if (null == part) return ['flow', name]
    if ('step' === part) return ['flow step', name + '.' + sub]
    return ['flow ' + part, name]
  }
  return [path.slice(0, 3).join('.'), path.slice(0, 4).join('.')]
}

function listDir(dir) {
  try {
    return Fs.readdirSync(dir)
  }
  catch (err) {
    if ('ENOENT' === err.code) return []
    throw err
  }
}

const files = listDir(dir)
const dumped = (port) => new Set(files
  .filter((file) => file.endsWith('.' + port + '.json'))
  .map((file) => file.slice(0, -('.' + port + '.json').length)))
const tsCases = dumped('ts')
const goCases = dumped('go')

const cases = [...tsCases].filter((name) => goCases.has(name)).sort()
const oneSided = [...new Set([...tsCases, ...goCases])]
  .filter((name) => !(tsCases.has(name) && goCases.has(name)))
  .sort()
  .map((name) => tsCases.has(name)
    ? { name, port: 'TS', spec: tsOnlySpecs.find((spec) => name.endsWith('-' + spec)) }
    : { name, port: 'Go' })

const read = (name, port) =>
  normalize(JSON.parse(Fs.readFileSync(Path.join(dir, name + '.' + port + '.json'), 'utf8')))

const rows = []
const totals = {}
for (const name of cases) {
  const found = []
  diff(read(name, 'ts'), read(name, 'go'), [], found)

  const classes = {}
  for (const d of found) {
    const [cls, unit] = classify(d.path)
    const units = (classes[cls] = classes[cls] ?? { ts: new Set(), go: new Set(), differ: new Set(), seen: [] })
    units[d.side].add(unit)
    units.seen.push(d)
  }

  for (const cls of Object.keys(classes).sort()) {
    const units = classes[cls]
    const all = new Set([...units.ts, ...units.go, ...units.differ])
    const counts = [all.size, ...['ts', 'go', 'differ'].map((side) => units[side].size)]
    rows.push([cls, name, ...counts])
    const total = (totals[cls] = totals[cls] ?? [0, 0, 0, 0, 0])
    counts.forEach((n, i) => total[i] += n)
    total[4]++

    if (detail) {
      for (const d of units.seen.slice(0, 3)) {
        const show = (v) => undefined === v ? '' : JSON.stringify(v).slice(0, 120)
        console.log(`  ${name} ${cls} ${d.path.join('.')} [${d.side}] ts=${show(d.ts)} go=${show(d.go)}`)
      }
    }
  }
}

// A unit is an entity, field, operation, point or flow step. It counts once
// under Units, and under each side that holds part of its difference.
console.log('| Class | Cases | Units | TS only | Go only | Differ |')
console.log('| --- | --- | --- | --- | --- | --- |')
for (const cls of Object.keys(totals).sort()) {
  const [units, ts, go, differ, ncases] = totals[cls]
  console.log(`| ${cls} | ${ncases} | ${units} | ${ts} | ${go} | ${differ} |`)
}

console.log('\n| Class | Case | Units | TS only | Go only | Differ |')
console.log('| --- | --- | --- | --- | --- | --- |')
for (const [cls, name, units, ts, go, differ] of rows) {
  console.log(`| ${cls} | ${name} | ${units} | ${ts} | ${go} | ${differ} |`)
}

console.log(`\n${cases.length} cases compared`)

const unexpected = oneSided.filter((one) => null == one.spec)
if (0 < oneSided.length) {
  console.log(`${oneSided.length} cases dumped by one port only ` +
    `(${oneSided.length - unexpected.length} expected, ${unexpected.length} unexpected):`)
  for (const { name, port, spec } of oneSided) {
    console.log(`  ${port} only: ${name}` + (null == spec ? '' : ` (expected: --ts-only=${spec})`))
  }
}

if (0 === cases.length) {
  console.error(`port-diff: no case was compared: ${dir} holds no <case>.ts.json and <case>.go.json pair`)
  process.exit(1)
}
if (0 < unexpected.length && !allowOneSided) {
  console.error(`port-diff: ${unexpected.length} unexpected cases dumped by one port only; ` +
    'the other harness did not write them (--allow-one-sided compares the rest)')
  process.exit(1)
}
