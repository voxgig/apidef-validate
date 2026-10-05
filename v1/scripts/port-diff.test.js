const { test, describe, after } = require('node:test')
const assert = require('node:assert')
const Fs = require('node:fs')
const Os = require('node:os')
const Path = require('node:path')
const { spawn, spawnSync } = require('node:child_process')

const V1 = Path.join(__dirname, '..')
const REPO = Path.join(V1, '..')
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
  return { status: run.status, stdout: run.stdout, stderr: run.stderr, out: run.stdout + run.stderr }
}

const PAIR = { 'solar-1-openapi.ts.json': model('planet'), 'solar-1-openapi.go.json': model('moon') }

const ONE_SIDED = /cases dumped by one port only/
const ONE_SIDED_COUNTS = /^(\d+) cases dumped by one port only \((\d+) expected, (\d+) unexpected\):$/m


describe('port-diff script', () => {

  test('pair', () => {
    const run = portDiff(dumpDir(PAIR))
    assert.equal(run.status, 0, run.out)
    assert.match(run.out, /\| entity name \| solar-1-openapi \| 1 \| 0 \| 0 \| 1 \|/)
    assert.match(run.out, /^1 cases compared$/m)
    assert.doesNotMatch(run.out, ONE_SIDED)
  })


  test('one-sided', () => {
    const dir = dumpDir({
      ...PAIR,
      'petstore-1-swagger.ts.json': model('pet'),
      'taxonomy-1-openapi.go.json': model('term'),
    })
    const run = portDiff(dir)
    assert.notEqual(run.status, 0, run.out)
    assert.match(run.stdout, ONE_SIDED)
    assert.match(run.stdout, /^2 cases dumped by one port only \(0 expected, 2 unexpected\):$/m)
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
    assert.match(expected.out, /^1 cases dumped by one port only \(1 expected, 0 unexpected\):$/m)
    assert.match(expected.out, /^ {2}TS only: linear-1-graphql \(expected: --ts-only=graphql\)$/m)
    assert.notEqual(portDiff(graphql).status, 0)

    const gographql = dumpDir({ ...PAIR, 'linear-1-graphql.go.json': model('issue') })
    assert.notEqual(portDiff(gographql, '--ts-only=graphql').status, 0)

    const openapi = dumpDir({ ...PAIR, 'petstore-1-swagger.ts.json': model('pet') })
    assert.notEqual(portDiff(openapi, '--ts-only=graphql').status, 0)
  })


  test('mixed-one-sided', () => {
    const dir = dumpDir({
      ...PAIR,
      'linear-1-graphql.ts.json': model('issue'),
      'petstore-1-swagger.ts.json': model('pet'),
    })
    const run = portDiff(dir, '--ts-only=graphql')
    assert.notEqual(run.status, 0, run.out)
    const listed = run.stdout.match(ONE_SIDED_COUNTS)
    assert.ok(listed, run.out)
    assert.deepEqual(listed.slice(1).map(Number), [2, 1, 1])
    const refused = run.stderr.match(/^port-diff: (\d+) unexpected cases dumped by one port only;/m)
    assert.ok(refused, run.out)
    assert.equal(refused[1], listed[3])
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

const INHERITED = [
  'MAKEFLAGS', 'MFLAGS', 'MAKELEVEL', 'GO', 'GOTEST', 'PORT_DIFF_DIR', 'PORT_DIFF_FLAGS', 'PORT_DIFF_BEAT',
]

// What make port-diff writes in its folder, and so all it may remove there.
const OWN = ['*.ts.json', '*.go.json', 'ts-harness.log', 'go-harness.log']

function makeEnv(env) {
  const base = Object.fromEntries(Object.entries(process.env).filter(([key]) => !INHERITED.includes(key)))
  return { ...base, ...env }
}

function make(args, env) {
  const run = spawnSync('make', ['-s', ...args], { cwd: V1, encoding: 'utf8', env: makeEnv(env) })
  return { status: run.status, out: run.stdout + run.stderr }
}

// The paths named by the rm lines of a dry run.
function removals(out) {
  return out.split('\n').filter((line) => /^rm /.test(line))
    .flatMap((line) => line.split(/\s+/).slice(1).filter((arg) => '' !== arg && !arg.startsWith('-')))
}

// Stands in for npm and go on PATH: each writes the dump DUMP_MODEL names,
// waits the seconds given, then exits with the status given.
function stubHarnesses(tsExit, goExit, seconds = 0) {
  const bin = tmpDir('port-diff-bin-')
  const stub = (port, exit) => '#!/bin/sh\nmkdir -p "$DUMP_MODEL"\n' +
    `echo '${JSON.stringify(model('planet'))}' > "$DUMP_MODEL/solar-1-openapi.${port}.json"\n` +
    `echo "${port} stub exit ${exit}"\nsleep ${seconds}\nexit ${exit}\n`
  Fs.writeFileSync(Path.join(bin, 'npm'), stub('ts', tsExit), { mode: 0o755 })
  Fs.writeFileSync(Path.join(bin, 'go'), stub('go', goExit), { mode: 0o755 })
  return { PATH: bin + Path.delimiter + process.env.PATH }
}

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))


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
      assert.deepEqual(removals(run.out), OWN.map((file) => Path.join(abs, file)), run.out)
      assert.match(run.out, new RegExp(`port-diff\\.js ${abs} `))
    }
  })


  test('refused-dir', () => {
    const link = Path.join(tmpDir('port-diff-link-'), 'repo')
    Fs.symlinkSync(REPO, link)
    for (const dir of ['.', '..', './', 'go/..', REPO, '/', 'go', link]) {
      for (const [args, env] of [
        [['-n', 'port-diff', 'PORT_DIFF_DIR=' + dir], {}],
        [['-n', 'port-diff'], { PORT_DIFF_DIR: dir }],
      ]) {
        const run = make(args, env)
        assert.notEqual(run.status, 0, dir + '\n' + run.out)
        assert.match(run.out, /port-diff: PORT_DIFF_DIR=\S+ (is \S+ or a folder above it|holds files port-diff did not write: .+); name a new or empty folder/)
        assert.deepEqual(removals(run.out), [], run.out)
      }
    }
  })


  test('foreign-files', () => {
    const out = tmpDir('port-diff-out-')
    Fs.writeFileSync(Path.join(out, 'notes.md'), 'kept')
    Fs.writeFileSync(Path.join(out, 'old-1-openapi.go.json'), '{}')
    const run = make(['port-diff', 'PORT_DIFF_DIR=' + out], stubHarnesses(0, 0))
    assert.notEqual(run.status, 0, run.out)
    assert.match(run.out, /holds files port-diff did not write: notes\.md;/)
    assert.deepEqual(Fs.readdirSync(out).sort(), ['notes.md', 'old-1-openapi.go.json'])
  })


  test('stale-dumps', () => {
    const out = tmpDir('port-diff-out-')
    for (const file of ['.keep', 'old-1-openapi.go.json', 'ts-harness.log']) {
      Fs.writeFileSync(Path.join(out, file), 'stale')
    }
    const run = make(['port-diff', 'PORT_DIFF_DIR=' + out], stubHarnesses(0, 0))
    assert.equal(run.status, 0, run.out)
    assert.deepEqual(Fs.readdirSync(out).sort(), [
      '.keep', 'go-harness.log', 'solar-1-openapi.go.json', 'solar-1-openapi.ts.json', 'ts-harness.log',
    ])
    assert.equal(Fs.readFileSync(Path.join(out, '.keep'), 'utf8'), 'stale')
    assert.match(Fs.readFileSync(Path.join(out, 'ts-harness.log'), 'utf8'), /ts stub exit 0/)
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


  test('heartbeat', () => {
    const out = tmpDir('port-diff-out-')
    const run = make(['port-diff', 'PORT_DIFF_DIR=' + out], { ...stubHarnesses(0, 0, 3), PORT_DIFF_BEAT: '1' })
    assert.equal(run.status, 0, run.out)
    for (const phase of ['1/3 TS', '2/3 Go']) {
      const beat = new RegExp(`^port-diff: ${phase} harness running \\d+s, 1 of ([1-9]\\d*) cases dumped \\((\\d+)%\\)$`, 'm')
      const [, total, pct] = run.out.match(beat) ?? assert.fail(run.out)
      assert.equal(Number(pct), Math.floor(100 / Number(total)), run.out)
    }
  })


  test('heartbeat-interrupted', { timeout: 30000 }, async () => {
    const out = tmpDir('port-diff-out-')
    const env = makeEnv({ ...stubHarnesses(0, 0, 30), PORT_DIFF_BEAT: '1' })
    const child = spawn('make', ['-s', 'port-diff', 'PORT_DIFF_DIR=' + out], { cwd: V1, env, detached: true })
    let text = ''
    child.stdout.on('data', (data) => text += data)
    child.stderr.on('data', (data) => text += data)
    const closed = new Promise((resolve) => child.on('close', () => resolve('closed')))
    try {
      for (let waited = 0; !/harness running/.test(text); waited += 50) {
        assert.ok(waited < 10000, 'no status line within 10s:\n' + text)
        await pause(50)
      }
      process.kill(-child.pid, 'SIGINT')
      let timer
      const ended = await Promise.race([
        closed,
        new Promise((resolve) => { timer = setTimeout(resolve, 5000, 'still printing') }),
      ])
      clearTimeout(timer)
      assert.equal(ended, 'closed', 'a status loop outlived the interrupted recipe:\n' + text)
    }
    finally {
      try { process.kill(-child.pid, 'SIGKILL') } catch {}
    }
  })
})
