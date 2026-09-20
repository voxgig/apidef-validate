const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')

const root = path.resolve(__dirname, '../v1')
const { repository, revision } = require('../v1/apidef-source.json')
if (!/^[a-f0-9]{40}$/.test(revision)) {
  throw new Error('apidef-source.json must pin a full commit SHA')
}

const checkout = path.join(root, 'node_modules', '.apidef-source', revision)
const packageRoot = path.join(checkout, 'ts')
const marker = path.join(checkout, '.validator-built')
const link = path.join(root, 'node_modules', '@voxgig', 'apidef')

function run(command, args, cwd) {
  return execFileSync(command, args, { cwd, stdio: 'inherit' })
}

if (!fs.existsSync(marker)) {
  if (!process.env.npm_execpath) {
    throw new Error('Run npm run setup-apidef from v1 to prepare apidef')
  }
  fs.mkdirSync(checkout, { recursive: true })
  run('git', ['init', '--quiet'], checkout)
  run('git', ['fetch', '--depth=1', repository, revision], checkout)
  run('git', ['checkout', '--detach', 'FETCH_HEAD'], checkout)
  run(process.execPath, [process.env.npm_execpath, 'ci'], packageRoot)
  run(process.execPath, [process.env.npm_execpath, 'run', 'build'], packageRoot)
  fs.writeFileSync(marker, revision + '\n')
}

const actualRevision = execFileSync('git', ['rev-parse', 'HEAD'], {
  cwd: checkout, encoding: 'utf8',
}).trim()
if (actualRevision !== revision) {
  throw new Error(`Expected apidef ${revision}, found ${actualRevision}`)
}

let currentTarget
try {
  currentTarget = fs.realpathSync(link)
} catch (err) {
  if (err.code !== 'ENOENT') throw err
}
if (currentTarget !== fs.realpathSync(packageRoot)) {
  fs.mkdirSync(path.dirname(link), { recursive: true })
  fs.rmSync(link, { recursive: true, force: true })
  fs.symlinkSync(packageRoot, link, process.platform === 'win32' ? 'junction' : 'dir')
}
console.log(`apidef source: ${revision}`)
