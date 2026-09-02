/* Copyright (c) 2025 Voxgig Ltd, MIT License */

import * as Fs from 'node:fs'
import Path from 'node:path'
import { test, describe } from 'node:test'

import assert from 'node:assert'

import { ApiDef, formatJSONIC } from '@voxgig/apidef'

import { each } from 'jostraca'

import {
  makefs,
  Diff,
} from '../..'


import {
  main
} from '..'



type FST = typeof Fs


type Case = {
  name: string
  version: string
  spec: string
  format: string

  // GraphQL cases only. A schema declares neither a deployment URL nor an
  // HTTP auth scheme, so the endpoint has to be supplied out of band; it is
  // never called, but apidef requires servers[0].url to exist.
  endpoint?: string
}


// A GraphQL case is identified by its spec slug, which is also what the def
// file extension follows.
function isGraphql(c: Case) {
  return 'graphql' === c.spec
}


// GraphQL ingestion landed after the currently published @voxgig/apidef, so
// the installed copy may not understand these cases at all. Detect the
// capability from the shipped model rather than by version arithmetic:
// a pre-GraphQL apidef simply has no graphql block in its point schema.
function graphqlCapable(): boolean {
  try {
    let modelPath = ''
    try { modelPath = require.resolve('@voxgig/apidef/model/apidef.aon') }
    catch (e: any) { modelPath = require.resolve('@voxgig/apidef/model/apidef.aontu') }
    return Fs.readFileSync(modelPath, 'utf8').includes("'graphql'")
  }
  catch (err: any) {
    return false
  }
}


const GRAPHQL_CAPABLE = graphqlCapable()


const TOP_FOLDER = Path.join(__dirname, '..')


let cases: Case[] = [
  { name: 'solar', version: '1.0.0', spec: 'openapi-3.0.0', format: 'yaml' },
  { name: 'petstore', version: '1.0.7', spec: 'swagger-2.0', format: 'json' },
  { name: 'taxonomy', version: '1.0.0', spec: 'openapi-3.1.0', format: 'yaml' },
  { name: 'foo', version: '1.0.0', spec: 'openapi-3.1.0', format: 'yaml' },

  // The elementdemo reference SDK's own spec, and the only case in this
  // corpus that puts a SERVER VARIABLE in the base URL: the account id is
  // `/api/{account_id}/...`, declared on the server rather than repeated as
  // a path parameter on all seventeen operations. That is the one shape a
  // generated SDK substitutes at CONSTRUCTION time instead of per call, and
  // nothing else here exercised it.
  //
  // It is also the only spec with a token EXCHANGE — POST /auth/token
  // answering `expires_in_requests` — so the auth-exchange classification
  // has a regression case, and it nests sub-resources two deep
  // (/element/{element_id}/isotope/{isotope_id}/decay) with action ops
  // (ionize, decay) hanging off both levels.
  { name: 'elementdemo', version: '1.0.0', spec: 'openapi-3.0.0', format: 'yaml' },

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

  // GraphQL. Real schemas, same treatment: classified into entities and ops,
  // compared against goldens.
  {
    name: 'linear', version: '2026.08', spec: 'graphql', format: 'graphql',
    endpoint: 'https://api.linear.app/graphql',
  },

  // GitHub's GraphQL API, alongside its OpenAPI def above: the one API in
  // this corpus present in both formats, so the two models can be compared.
  // Its mutations are overwhelmingly commands rather than CRUD, which is
  // what exercises action folding at scale.
  {
    name: 'github', version: '2026.08', spec: 'graphql', format: 'graphql',
    endpoint: 'https://api.github.com/graphql',
  },

  // Shopify's Storefront API, supplied as INTROSPECTION JSON rather than
  // SDL — the only case exercising that parser branch. Its query root is
  // named QueryRoot, not Query, which a schema-literal reading would miss.
  {
    name: 'shopifystorefront', version: '2026.04', spec: 'graphql',
    format: 'json',
    endpoint: 'https://example.myshopify.com/api/2026-04/graphql.json',
  },
]

if (!GRAPHQL_CAPABLE) {
  const skipped = cases.filter(isGraphql).map(c => c.name)
  if (0 < skipped.length) {
    console.log('SKIPPING GRAPHQL CASES (installed @voxgig/apidef predates' +
      ' GraphQL ingestion): ' + skipped.join(', '))
  }
  cases = cases.filter(c => !isGraphql(c))
}

const caseSelector = (process.env.TEST_CASE ?? '').split(',')

if (0 < caseSelector.length) {
  cases = cases.filter(c => 0 < caseSelector.filter(cs => c.name.includes(cs)).length)
}


describe('main', () => {

  test('happy', async () => {
    assert.equal(main(), 'main')
  })


  test('guide-case', async () => {
    const { fs, vol } = prepfs(cases)

    const fails: any[] = []
    const testmetrics = {
      todo: 0
    }

    for (let c of cases) {
      try {
        await prepCaseGuide(c, fs)

        const build = await makeBuild(c, fs)


        const bres = await runBuild(c, build, {
          parse: true,
          guide: true,
          transformers: false,
          builders: false,
          generate: false,
        })

        if (!bres?.ok) {
          fails.push('BUILD FAIL: ' + fullname(c) + ' build not ok')
        }
        else {
          validateGuide(c, fails, bres, fs, vol, testmetrics)
        }
      }
      catch (err: any) {
        fails.push('BUILD ERROR: ' + fullname(c) + ' ' + (err?.message || err))
      }
    }

    console.log('TOTAL TODOS: ' + testmetrics.todo)

    if (0 < fails.length) {
      assert.fail(fails.join('\n---\n'))
    }

  })


  test('model-case', async () => {
    // console.log('MODEL-CASES', cases)

    const { fs, vol } = prepfs(cases)

    const fails: any[] = []
    const testmetrics = {
      todo: 0
    }

    for (let c of cases) {
      try {
        // console.log('MODEL-CASE', c)

        await prepCaseGuide(c, fs)

        const build = await makeBuild(c, fs)
        const bres = await runBuild(c, build, {
          parse: true,
          guide: true,
          transformers: true,
          builders: true,
          generate: true,
        })

        // console.log('BRES', c, bres)

        if (!bres?.ok) {
          fails.push('BUILD FAIL: ' + fullname(c) + ' build not ok')
        }
        else {
          validateGuide(c, fails, bres, fs, vol, testmetrics)
          validateModel(c, fails, bres, fs, vol, testmetrics)
        }
      }
      catch (err: any) {
        fails.push('BUILD ERROR: ' + fullname(c) + ' ' + (err?.message || err))
      }
    }

    console.log('TOTAL TODOS: ' + testmetrics.todo)

    if (0 < fails.length) {
      assert.fail(fails.join('\n---\n'))
    }

  })


})


// APIDEF WRITES `.aon`; IT USED TO WRITE `.aontu`.
//
// Model source files (guide, base-guide, entity) were renamed as part of the
// aontu file-extension change. apidef migrates a legacy `.aontu` guide it is
// GIVEN, but everything it WRITES is `.aon`. Reading only one extension makes
// this harness silently version-locked: against the other apidef the memfs
// lookup is `undefined` and every case dies on `.trim() of undefined`, a
// harness bug wearing the costume of an apidef regression.
//
// So read whichever apidef produced, and if neither is there say so with both
// names — the failure is then self-explaining.
function readModelSource(volJSON: any, dir: string, stem: string): string {
  for (const ext of ['aon', 'aontu']) {
    const src = volJSON[`${dir}/${stem}.${ext}`]
    if (null != src) { return String(src).trim() }
  }
  throw new Error(
    `apidef wrote no model source for ${dir}/${stem}: ` +
    `tried .aon and .aontu; found: ` +
    Object.keys(volJSON).filter((k: string) => k.startsWith(dir + '/')).join(', ')
  )
}


function fullname(c: Case) {
  return `${c.name}-${c.version}-${c.spec}`
}


function prepfs(cases: Case[]) {
  const vol = {
    'model': {
      'guide': {

      }

      /*
  
        cases.reduce((a: any, c: Case) => {
            a[fullname(c) + '-guide.aontu'] = `
  @"@voxgig/apidef/model/guide.aontu"
  
  @"${fullname(c)}-base-guide.aontu"
  
  guide:{}
  `
            return a
            }, {})
                    */
    }
  }

  const ufs = makefs(vol)
  return ufs
}



async function prepCaseGuide(c: Case, fs: FST) {
  const guideFileName = fullname(c) + '-guide.aontu'
  const realGuideFilePath = Path.join(TOP_FOLDER, 'guide', guideFileName)
  const virtualGuideFilePath = Path.join('/model', 'guide', guideFileName)

  // TWO FILESYSTEMS, AND THE PATH DECIDES WHICH.
  //
  // Anything under TOP_FOLDER is this harness's own bookkeeping — guide
  // sources, .gen output, goldens — and belongs on real disk where a human
  // can read and diff it. Anything under /model is generated output and
  // belongs in the sandbox. `fs` is the union with the in-memory fs winning,
  // so using it for a repo path silently swallows the write: that is exactly
  // how a golden refresh came back with nothing to refresh.
  let guideFileSrc = ''
  const realExists = Fs.existsSync(realGuideFilePath)

  if (realExists) {
    guideFileSrc = Fs.readFileSync(realGuideFilePath).toString('utf8')
  }
  else {
    guideFileSrc = `
@"@voxgig/apidef/model/guide.aontu"

@"${fullname(c)}-base-guide.aontu"

guide:{}
`
    Fs.writeFileSync(realGuideFilePath, guideFileSrc)
  }

  // Ensure guide file is in virtual fs — a /model path, so the injected fs.
  fs.writeFileSync(virtualGuideFilePath, guideFileSrc)

  // console.log('PREP-CASE-GUIDE', guideFileName, realGuideFilePath, realExists, virtualGuideFilePath, guideFileSrc)

}


async function makeBuild(c: Case, fs: FST) {
  let folder = '/model'
  // let folder = TOP_FOLDER
  let outprefix = fullname(c) + '-'

  const buildSpec: any = {
    folder,
    debug: 'debug',
    outprefix,
    why: {
      show: true
    }
  }

  if (isGraphql(c)) {
    buildSpec.kind = 'GraphQL'
    buildSpec.endpoint = c.endpoint
  }

  buildSpec.fs = fs

  const build = await ApiDef.makeBuild(buildSpec)

  return build
}


async function runBuild(c: Case, build: any, step: any) {
  const model = {
    name: c.name,
    def: fullname(c) + '.' + c.format
  }

  const spec = {
    spec: {
      base: Path.normalize(Path.join(__dirname, '..')),
      buildargs: {
        apidef: {
          ctrl: {
            step
          }
        }
      }
    }
  }

  const bres = await build(model, spec, {})

  return bres
}



function validateGuide(c: Case, fails: any[], bres: any, fs: FST, vol: any, testmetrics: any) {
  const todoarg = process.env.TEST_TODO
  const showtodo = ('' + todoarg).match(/hide/i)

  const cfn = fullname(c)

  const volJSON = vol.toJSON()
  const baseGuide = readModelSource(volJSON, '/model/guide', `${cfn}-base-guide`)


  const generatedBaseGuideFile = Path.join(TOP_FOLDER, 'guide', `${cfn}-base-guide.gen.aontu`)
  Fs.writeFileSync(generatedBaseGuideFile, baseGuide)


  const expectedBaseGuideFile = Path.join(TOP_FOLDER, 'guide', `${cfn}-base-guide.aontu`)

  if (!Fs.existsSync(expectedBaseGuideFile)) {
    Fs.writeFileSync(expectedBaseGuideFile, baseGuide)
  }

  const expectedBaseGuide = Fs.readFileSync(expectedBaseGuideFile, 'utf8').trim()


  // console.log('<' + expectedBaseGuide + '>')

  if (expectedBaseGuide !== baseGuide) {
    const difflines = Diff.diffLines(expectedBaseGuide, baseGuide)

    // Comments with ## are considered TODOs
    let todocount = 0
    const cleanExpected =
      expectedBaseGuide.replace(/[^\n#]*##[^\n]*\n/g, () => (todocount++, ''))
    testmetrics.todo += todocount
    if (cleanExpected !== baseGuide) {
      fails.push('MISMATCH:' + cfn + '\n' + prettyDiff(difflines))
    }
    else {
      console.log("OPEN TODOS: " + cfn + ' ' + todocount)
      if (!showtodo) {
        console.log('\n' + prettyDiff(difflines) + '\n')
      }
    }
  }


  const finalGuide = formatJSONIC(bres.guide).trim()

  // Keep the generated final-guide on disk next to the expected one, the same
  // way base-guide and the entity models do. Without it, final-guide is the
  // one fixture family that can only be refreshed by deleting the expected
  // file first.
  const generatedFinalGuideFile =
    Path.join(TOP_FOLDER, 'guide', `${cfn}-final-guide.gen.aontu`).trim()

  Fs.writeFileSync(generatedFinalGuideFile, finalGuide)


  const expectedFinalGuideFile =
    Path.join(TOP_FOLDER, 'guide', `${cfn}-final-guide.aontu`).trim()

  if (!Fs.existsSync(expectedFinalGuideFile)) {
    Fs.writeFileSync(expectedFinalGuideFile, finalGuide)
  }

  const expectedFinalGuide = Fs.readFileSync(expectedFinalGuideFile, 'utf8').trim()

  printMismatch(expectedFinalGuide, finalGuide, testmetrics, fails, cfn, showtodo)
}


function printMismatch(
  expected: string,
  found: string,
  testmetrics: any,
  fails: any[],
  cfn: string,
  showtodo: any
) {
  // console.log('<' + expectedBaseGuide + '>')

  if (expected !== found) {
    const difflines = Diff.diffLines(expected, found)

    // Comments with ## are considered TODOs
    let todocount = 0
    const cleanExpected =
      expected.replace(/[^\n#]*##[^\n]*\n/g, () => (todocount++, ''))
    testmetrics.todo += todocount
    if (cleanExpected !== found) {
      fails.push('MISMATCH:' + cfn + '\n' + prettyDiff(difflines))
    }
    else {
      console.log("OPEN TODOS: " + cfn + ' ' + todocount)
      if (!showtodo) {
        console.log('\n' + prettyDiff(difflines) + '\n')
      }
    }
  }

}




function validateModel(c: Case, fails: any[], bres: any, fs: FST, vol: any, testmetrics: any) {
  const todoarg = process.env.TEST_TODO
  const showtodo = ('' + todoarg).match(/hide/i)

  const cfn = fullname(c)

  const volJSON = vol.toJSON()

  Fs.mkdirSync(__dirname + '/../model/' + `${cfn}`, { recursive: true })

  each(bres.apimodel.main.kit.entity, (entity: any) => {
    const efn = `${cfn}-${entity.name}`

    const entitySrc = readModelSource(volJSON, '/model/entity', efn)

    const generatedSrcFile = __dirname + '/../model/' + `${cfn}/${efn}.gen.aontu`
    Fs.writeFileSync(generatedSrcFile, entitySrc)

    const expectedSrcFile = __dirname + '/../model/' + `${cfn}/${efn}.aontu`

    if (!Fs.existsSync(expectedSrcFile)) {
      Fs.writeFileSync(expectedSrcFile, entitySrc)
    }

    const expectedEntitySrc =
      Fs.readFileSync(expectedSrcFile, 'utf8')
        .trim()

    // console.log('<' + expectedEntitySrc + '>')

    if (expectedEntitySrc !== entitySrc) {
      const difflines = Diff.diffLines(expectedEntitySrc, entitySrc)

      // Comments with ## are considered TODOs
      let todocount = 0
      const cleanExpected =
        expectedEntitySrc.replace(/[^\n#]*##[^\n]*\n/g, () => (todocount++, ''))
      testmetrics.todo += todocount
      if (cleanExpected !== entitySrc) {
        fails.push('MISMATCH:' + efn + '\n' + prettyDiff(difflines))
      }
      else {
        console.log("OPEN TODOS: " + cfn + ' ' + todocount)
        if (!showtodo) {
          console.log('\n' + prettyDiff(difflines) + '\n')
        }
      }
    }
  })
}



function prettyDiff(difflines: any[]) {
  const out: string[] = []

  if ('hide' === process.env.TEST_PRETTYDIFF) {
    return
  }


  let prev: any = undefined
  let last = 'same'
  difflines.forEach((part: any) => {
    if (part.added) {
      if ('same' === last && prev) {
        const prevlines = prev.value.split('\n')
        out.push('\n' + prevlines.slice(prevlines.length - 4, prevlines.length).join('\n'))
        prev = undefined
      }
      out.push('\x1b[38;5;220m<<<<<<< GENERATED\n')
      out.push(part.value)
      out.push('>>>>>>> GENERATED\n\x1b[0m')
      last = 'added'
    }
    else if (part.removed) {
      if (part.value.trim().startsWith('###')) {
        // ignore as comment
        last = 'same'
        prev = part
      }
      else if (part.value.trim().startsWith('##')) {
        out.push(`\x1b[93m####### TODO: ${part.value}\x1b[0m`)
        last = 'same'
        prev = part
      }
      else {
        if ('same' === last && prev) {
          const prevlines = prev.value.split('\n')
          out.push('\n' + prevlines.slice(prevlines.length - 4, prevlines.length).join('\n'))
          prev = undefined
        }
        out.push('\x1b[92m<<<<<<< EXISTING\n')
        out.push(part.value)
        out.push('>>>>>>> EXISTING\n\x1b[0m')
        last = 'removed'
      }
    }
    else {
      if ('same' !== last) {
        out.push(part.value.split('\n').slice(0, 4).join('\n') + '\n--- --- ---\n')
      }
      prev = part
      last = 'same'
    }
  })

  const content = out.join('')
  return content

}
