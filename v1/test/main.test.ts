/* Copyright (c) 2025 Voxgig Ltd, MIT License */

import * as Fs from 'node:fs'
import { test, describe } from 'node:test'

import { expect, fail } from '@hapi/code'

import { ApiDef } from '@voxgig/apidef'

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


let cases: Case[] = [
  { name: 'solar', version: '1.0.0', spec: 'openapi-3.0.0', format: 'yaml' },
  { name: 'taxonomy', version: '1.0.0', spec: 'openapi-3.1.0', format: 'yaml' },
  { name: 'learnworlds', version: '2', spec: 'openapi-3.1.0', format: 'yaml' },
  { name: 'statuspage', version: '1.0.0', spec: 'openapi-3.0.0', format: 'json' },
  { name: 'contentfulcma', version: '1.0.0', spec: 'openapi-3.0.0', format: 'yaml' },

  { name: 'cloudsmith', version: 'v1', spec: 'swagger-2.0', format: 'json' },
  { name: 'pokeapi', version: '20220523', spec: 'openapi-3.0.0', format: 'yaml' },
  { name: 'dingconnect', version: 'v1', spec: 'swagger-2.0', format: 'json' },
  { name: 'codatplatform', version: '3.0.0', spec: 'openapi-3.1.0', format: 'yaml' },
  { name: 'shortcut', version: 'v3', spec: 'openapi-3.0.0', format: 'json' },
]

const caseSelector = process.env.npm_config_case

if ('string' === typeof caseSelector) {
  cases = cases.filter(c => c.name.includes(caseSelector))
}


describe('main', () => {

  test('happy', async () => {
    expect(main()).equal('main')
  })


  test('guide-case', async () => {
    const { fs, vol } = prepfs(cases)

    const fails: any[] = []
    const testmetrics = {
      todo: 0
    }

    for (let c of cases) {
      try {
        const build = await makeBuild(c, fs)
        const bres = await runBuild(c, build, {
          parse: true,
          guide: true,
          transformers: false,
          builders: false,
          generate: false,
        })
        if (!bres.ok) {
          fails.push(JSON.stringify(bres, null, 2))
        }
        validateGuide(c, fails, bres, fs, vol, testmetrics)
      }
      catch (err: any) {
        console.error(err)
        fails.push(JSON.stringify({ ...err }, null, 2))
      }

    }

    console.log('TOTAL TODOS: ' + testmetrics.todo)

    if (0 < fails.length) {
      fail(fails.join('\n---\n'))
    }

  })


  test('model-case', async () => {
    const { fs, vol } = prepfs(cases)

    const fails: any[] = []
    const testmetrics = {
      todo: 0
    }

    for (let c of cases) {
      try {
        const build = await makeBuild(c, fs)
        const bres = await runBuild(c, build, {
          parse: true,
          guide: true,
          transformers: true,
          builders: true,
          generate: true,
        })
        if (!bres.ok) {
          fails.push(JSON.stringify(bres, null, 2))
        }
        validateGuide(c, fails, bres, fs, vol, testmetrics)
        validateModel(c, fails, bres, fs, vol, testmetrics)
      }
      catch (err: any) {
        console.error(err)
        fails.push(JSON.stringify({ ...err }, null, 2))
      }

    }

    console.log('TOTAL TODOS: ' + testmetrics.todo)

    if (0 < fails.length) {
      fail(fails.join('\n---\n'))
    }

  })


})


function fullname(c: Case) {
  return `${c.name}-${c.version}-${c.spec}`
}


function prepfs(cases: Case[]) {
  const vol = {
    'model': {
      'guide':
        cases.reduce((a: any, c: Case) => {
          a[fullname(c) + '-guide.jsonic'] = `
@"@voxgig/apidef/model/guide.jsonic"

@"${fullname(c)}-base-guide.jsonic"

guide:{}
`
          return a
        }, {})
    }
  }

  const ufs = makefs(vol)
  return ufs
}



async function makeBuild(c: Case, fs: FST) {
  let folder = '/model'
  let outprefix = fullname(c) + '-'

  const build = await ApiDef.makeBuild({
    fs,
    folder,
    debug: 'debug',
    outprefix,
  })

  return build
}


async function runBuild(c: Case, build: any, step: any) {
  const bres = await build(
    {
      name: c.name,
      def: fullname(c) + '.' + c.format
    },
    {
      spec: {
        base: __dirname + '/..',
        buildargs: {
          apidef: {
            ctrl: {
              step
            }
          }
        }
      }
    },
    {}
  )

  return bres
}



function validateGuide(c: Case, fails: any[], bres: any, fs: FST, vol: any, testmetrics: any) {
  const todoarg = process.env.npm_config_todo
  const showtodo = ('' + todoarg).match(/hide/i)

  const cfn = fullname(c)

  const volJSON = vol.toJSON()
  const baseGuide = volJSON[`/model/guide/${cfn}-base-guide.jsonic`].trim()

  const expectedBaseGuide = fs.readFileSync(__dirname + '/../guide/' +
    `${cfn}-base-guide.jsonic`, 'utf8')
    .trim()

  // console.log('<' + expectedBaseGuide + '>')

  if (expectedBaseGuide !== baseGuide) {
    const difflines = Diff.diffLines(expectedBaseGuide, baseGuide)

    // Comments with ## are considered TODOs
    let todocount = 0
    const cleanExpected = expectedBaseGuide.replace(/[^\n#]*##[^\n]*\n/g, () => (todocount++, ''))
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
}


function validateModel(c: Case, fails: any[], bres: any, fs: FST, vol: any, testmetrics: any) {
  const todoarg = process.env.npm_config_todo
  const showtodo = ('' + todoarg).match(/hide/i)

  const cfn = fullname(c)

  const volJSON = vol.toJSON()

  fs.mkdirSync(__dirname + '/../model/' + `${cfn}`, { recursive: true })

  each(bres.apimodel.main.sdk.entity, (entity: any) => {
    const efn = `${cfn}-${entity.name}`
    const entitySrc = volJSON[`/model/entity/${efn}.jsonic`].trim()

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

  let last = 'same'
  difflines.forEach((part: any) => {
    if (part.added) {
      last = 'added'
      out.push('\x1b[38;5;220m<<<<<<< GENERATED\n')
      out.push(part.value)
      out.push('>>>>>>> GENERATED\n\x1b[0m')
    }
    else if (part.removed) {
      last = 'removed'
      out.push('\x1b[92m<<<<<<< EXISTING\n')
      out.push(part.value)
      out.push('>>>>>>> EXISTING\n\x1b[0m')
    }
    else {
      if ('same' !== last) {
        out.push(part.value.split('\n').slice(0, 4).join('\n') + '\n\n')
      }
      last = 'same'
    }
  })

  const content = out.join('')
  return content

}
