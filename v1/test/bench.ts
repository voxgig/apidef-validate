/* Copyright (c) 2025 Voxgig Ltd, MIT License */

import * as Fs from 'node:fs'
import Path from 'node:path'

import { ApiDef } from '@voxgig/apidef'

import {
  makefs,
} from '../..'


type FST = typeof Fs

type Case = {
  name: string
  version: string
  spec: string
  format: string
}

const TOP_FOLDER = Path.join(__dirname, '..')


let cases: Case[] = [
  { name: 'solar', version: '1.0.0', spec: 'openapi-3.0.0', format: 'yaml' },
  { name: 'petstore', version: '1.0.7', spec: 'swagger-2.0', format: 'json' },
  { name: 'taxonomy', version: '1.0.0', spec: 'openapi-3.1.0', format: 'yaml' },
  { name: 'foo', version: '1.0.0', spec: 'openapi-3.1.0', format: 'yaml' },
  { name: 'learnworlds', version: '2', spec: 'openapi-3.1.0', format: 'yaml' },
  { name: 'statuspage', version: '1.0.0', spec: 'openapi-3.0.0', format: 'json' },
  { name: 'contentfulcma', version: '1.0.0', spec: 'openapi-3.0.0', format: 'yaml' },
  { name: 'cloudsmith', version: 'v1', spec: 'swagger-2.0', format: 'json' },
  { name: 'pokeapi', version: '20220523', spec: 'openapi-3.0.0', format: 'yaml' },
  { name: 'dingconnect', version: 'v1', spec: 'swagger-2.0', format: 'json' },
  { name: 'codatplatform', version: '3.0.0', spec: 'openapi-3.1.0', format: 'yaml' },
  { name: 'shortcut', version: 'v3', spec: 'openapi-3.0.0', format: 'json' },
  { name: 'github', version: '1.1.4', spec: 'openapi-3.0.3', format: 'yaml' },
  { name: 'gitlab', version: 'v4', spec: 'swagger-2.0', format: 'yaml' },
]

const caseSelector = (process.env.TEST_CASE ?? '').split(',').filter(Boolean)
if (0 < caseSelector.length) {
  cases = cases.filter(c => 0 < caseSelector.filter(cs => c.name.includes(cs)).length)
}


function fullname(c: Case) {
  return `${c.name}-${c.version}-${c.spec}`
}


function prepfs() {
  const vol = { 'model': { 'guide': {} } }
  return makefs(vol)
}


async function prepCaseGuide(c: Case, fs: FST) {
  const guideFileName = fullname(c) + '-guide.jsonic'
  const realGuideFilePath = Path.join(TOP_FOLDER, 'guide', guideFileName)
  const virtualGuideFilePath = Path.join('/model', 'guide', guideFileName)

  let guideFileSrc = ''
  if (fs.existsSync(realGuideFilePath)) {
    guideFileSrc = fs.readFileSync(realGuideFilePath).toString('utf8')
  } else {
    guideFileSrc = `
@"@voxgig/apidef/model/guide.jsonic"

@"${fullname(c)}-base-guide.jsonic"

guide:{}
`
    fs.writeFileSync(realGuideFilePath, guideFileSrc)
  }
  fs.writeFileSync(virtualGuideFilePath, guideFileSrc)
}


async function makeBuild(c: Case, fs: FST) {
  const buildSpec: any = {
    folder: '/model',
    debug: 'debug',
    outprefix: fullname(c) + '-',
    why: { show: true },
    fs,
  }
  return ApiDef.makeBuild(buildSpec)
}


async function runBuild(c: Case, build: any, step: any) {
  const model = { name: c.name, def: fullname(c) + '.' + c.format }
  const spec = {
    spec: {
      base: Path.normalize(Path.join(__dirname, '..')),
      buildargs: { apidef: { ctrl: { step } } },
    }
  }
  return build(model, spec, {})
}


async function timeOnce(c: Case, step: any, requireOk: boolean) {
  const { fs } = prepfs()
  await prepCaseGuide(c, fs)
  const build = await makeBuild(c, fs)
  const t0 = Date.now()
  const bres = await runBuild(c, build, step)
  const t1 = Date.now()
  if (requireOk && !bres?.ok) {
    throw new Error(`build not ok for ${fullname(c)}: ${bres?.err?.message ?? ''}`)
  }
  if (!bres?.steps?.includes('parse')) {
    throw new Error(`parse step did not run for ${fullname(c)}`)
  }
  return t1 - t0
}


async function main() {
  const PARSE_ONLY = {
    parse: true, guide: false, transformers: false, builders: false, generate: false,
  }
  const FULL = {
    parse: true, guide: true, transformers: true, builders: true, generate: true,
  }

  const REPS = Number(process.env.BENCH_REPS ?? '3')

  type Row = { case: string, parse: number, model: number, total: number }
  const rows: Row[] = []

  for (const c of cases) {
    const cfn = fullname(c)
    process.stderr.write(`benchmark: ${cfn}\n`)
    // Warm up once (JIT, fs cache) to reduce first-run skew.
    await timeOnce(c, FULL, true)

    const parseRuns: number[] = []
    const totalRuns: number[] = []
    for (let i = 0; i < REPS; i++) {
      parseRuns.push(await timeOnce(c, PARSE_ONLY, false))
      totalRuns.push(await timeOnce(c, FULL, true))
    }
    const parseMs = Math.min(...parseRuns)
    const totalMs = Math.min(...totalRuns)
    const modelMs = Math.max(0, totalMs - parseMs)
    rows.push({ case: cfn, parse: parseMs, model: modelMs, total: totalMs })
  }

  const w = (s: string | number, n: number) => String(s).padStart(n)
  const wL = (s: string | number, n: number) => String(s).padEnd(n)
  const caseW = Math.max(4, ...rows.map(r => r.case.length))

  const sep = `${'-'.repeat(caseW)}  ${'-'.repeat(10)}  ${'-'.repeat(10)}  ${'-'.repeat(10)}`
  console.log()
  console.log(`${wL('case', caseW)}  ${w('parse(ms)', 10)}  ${w('model(ms)', 10)}  ${w('total(ms)', 10)}`)
  console.log(sep)
  let pSum = 0, mSum = 0, tSum = 0
  for (const r of rows) {
    console.log(`${wL(r.case, caseW)}  ${w(r.parse, 10)}  ${w(r.model, 10)}  ${w(r.total, 10)}`)
    pSum += r.parse; mSum += r.model; tSum += r.total
  }
  console.log(sep)
  console.log(`${wL('TOTAL', caseW)}  ${w(pSum, 10)}  ${w(mSum, 10)}  ${w(tSum, 10)}`)
}


main().catch(err => { console.error(err); process.exit(1) })
