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

        break;

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
            a[fullname(c) + '-guide.jsonic'] = `
  @"@voxgig/apidef/model/guide.jsonic"
  
  @"${fullname(c)}-base-guide.jsonic"
  
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
  const guideFileName = fullname(c) + '-guide.jsonic'
  const realGuideFilePath = Path.join(TOP_FOLDER, 'guide', guideFileName)
  const virtualGuideFilePath = Path.join('/model', 'guide', guideFileName)

  let guideFileSrc = ''
  const realExists = fs.existsSync(realGuideFilePath)

  if (realExists) {
    guideFileSrc = fs.readFileSync(realGuideFilePath).toString('utf8')
  }
  else {
    guideFileSrc = `
@"@voxgig/apidef/model/guide.jsonic"

@"${fullname(c)}-base-guide.jsonic"

guide:{}
`
    fs.writeFileSync(realGuideFilePath, guideFileSrc)
  }

  // Ensure guilde file is in virtual fs
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
  const baseGuide = volJSON[`/model/guide/${cfn}-base-guide.jsonic`].trim()


  const generatedBaseGuideFile = Path.join(TOP_FOLDER, 'guide', `${cfn}-base-guide.gen.jsonic`)
  fs.writeFileSync(generatedBaseGuideFile, baseGuide)


  const expectedBaseGuideFile = Path.join(TOP_FOLDER, 'guide', `${cfn}-base-guide.jsonic`)

  if (!fs.existsSync(expectedBaseGuideFile)) {
    fs.writeFileSync(expectedBaseGuideFile, baseGuide)
  }

  const expectedBaseGuide = fs.readFileSync(expectedBaseGuideFile, 'utf8').trim()


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

  /*
  const generatedFinalGuideFile =
    Path.join(TOP_FOLDER, 'guide', `${cfn}-final-guide.gen.jsonic`).trim()

  fs.writeFileSync(generatedFinalGuideFile, finalGuide)
  */


  const expectedFinalGuideFile =
    Path.join(TOP_FOLDER, 'guide', `${cfn}-final-guide.jsonic`).trim()

  if (!fs.existsSync(expectedFinalGuideFile)) {
    fs.writeFileSync(expectedFinalGuideFile, finalGuide)
  }

  const expectedFinalGuide = fs.readFileSync(expectedFinalGuideFile, 'utf8').trim()

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

  fs.mkdirSync(__dirname + '/../model/' + `${cfn}`, { recursive: true })

  each(bres.apimodel.main.kit.entity, (entity: any) => {
    const efn = `${cfn}-${entity.name}`

    const entitySrc = volJSON[`/model/entity/${efn}.jsonic`].trim()

    const generatedSrcFile = __dirname + '/../model/' + `${cfn}/${efn}.gen.jsonic`
    fs.writeFileSync(generatedSrcFile, entitySrc)

    const expectedSrcFile = __dirname + '/../model/' + `${cfn}/${efn}.jsonic`

    if (!fs.existsSync(expectedSrcFile)) {
      fs.writeFileSync(expectedSrcFile, entitySrc)
    }

    const expectedEntitySrc =
      fs.readFileSync(expectedSrcFile, 'utf8')
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
