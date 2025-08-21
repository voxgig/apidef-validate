/* Copyright (c) 2025 Voxgig Ltd, MIT License */

import * as Fs from 'node:fs'
import { test, describe } from 'node:test'

import { expect, fail } from '@hapi/code'

import { ApiDef } from '@voxgig/apidef'

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


describe('main', () => {

  test('happy', async () => {
    expect(main()).equal('main')
  })


  test('core-case', async () => {
    const caseSelector = process.env.npm_config_case

    let cases: Case[] = [
      { name: 'solar', version: '1.0.0', format: 'yaml', spec: 'openapi-3.0.0' },
      { name: 'taxonomy', version: '1.0.0', format: 'yaml', spec: 'openapi-3.1.0' },
      { name: 'learnworlds', version: '2', format: 'yaml', spec: 'openapi-3.1.0' },
      { name: 'statuspage', version: '1.0.0', format: 'json', spec: 'openapi-3.0.0' },

    ]

    if ('string' === typeof caseSelector) {
      cases = cases.filter(c => c.name.includes(caseSelector))
    }

    const { fs, vol } = prepfs(cases)

    const fails: any[] = []

    for (let c of cases) {
      try {
        const build = await makeBuild(c, fs)
        const bres = await runBuild(c, build)
        if (!bres.ok) {
          fails.push(JSON.stringify(bres, null, 2))
        }
        validateGuide(c, fails, fs, vol)
      }
      catch (err: any) {
        console.error(err)
        fails.push(JSON.stringify({ ...err }, null, 2))
      }

    }

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
        cases.reduce((a: any, c: Case) =>
          (a[fullname(c) + '-guide.jsonic'] = 'guide:{}', a), {})
    }
  }

  // console.dir(vol, { depth: null })

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


async function runBuild(c: Case, build: any) {
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
              step: {
                parse: true,
                guide: true,
                transformers: false,
                builders: false,
                generate: false,
              }
            }
          }
        }
      }
    },
    {}
  )

  return bres
}



function validateGuide(c: Case, fails: any[], fs: FST, vol: any) {
  const cfn = fullname(c)

  const volJSON = vol.toJSON()
  const baseGuide = volJSON[`/model/guide/${cfn}-base-guide.jsonic`].trim()

  // if ('statuspage' === c.name) {
  //   console.log('BASE:' + cfn + '<' + baseGuide + '>')
  // }

  const expectedBaseGuide = fs.readFileSync(__dirname + '/../guide/' +
    `${cfn}-base-guide.jsonic`, 'utf8').trim()

  // console.log('<' + expectedBaseGuide + '>')

  if (expectedBaseGuide !== baseGuide) {
    const difflines = Diff.diffLines(expectedBaseGuide, baseGuide)
    // console.log(difflines)
    fails.push('MISMATCH:' + cfn + '\n' + prettyDiff(difflines))
  }
}


function prettyDiff(difflines: any[]) {
  const out: string[] = []

  difflines.forEach((part: any) => {
    if (part.added) {
      out.push('\x1b[38;5;220m<<<<<<< GENERATED\n')
      out.push(part.value)
      out.push('>>>>>>> GENERATED\n\x1b[0m')
    }
    else if (part.removed) {
      out.push('\x1b[92m<<<<<<< EXISTING\n')
      out.push(part.value)
      out.push('>>>>>>> EXISTING\n\x1b[0m')
    }
    else {
      out.push(part.value)
    }
  })

  const content = out.join('')
  return content

}
