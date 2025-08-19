/* Copyright (c) 2025 Voxgig Ltd, MIT License */

import { test, describe } from 'node:test'
import { expect } from '@hapi/code'

import { ApiDef } from '@voxgig/apidef'

import {
  makefs,
  Diff,
} from '../..'


import {
  main
} from '..'




describe('main', () => {

  test('happy', async () => {
    expect(main()).equal('main')
  })


  test('core', async () => {

    const cases = [
      { name: 'solar', version: '1.0.0', format: 'openapi-3.0.0' }
    ]

    const { fs, vol } = prepfs(cases)

    for (let kase of cases) {
      console.log('CASE', kase)
      const build = await makeBuild(kase, fs)
      const bres = await runBuild(kase, build)

      validateGuide(kase, fs, vol)
    }

  })




})



function prepfs(cases: any[]) {
  const vol = {
    'model': {
      'guide':
        cases.reduce((a: any, n: any) => (a[n.name + '-guide.jsonic'] = 'guide:{}', a), {})
    }
  }

  // console.dir(vol, { depth: null })

  const ufs = makefs(vol)
  return ufs
}



async function makeBuild(kase: any, fs: any) {
  let folder = '/model'
  let outprefix = kase.name + '-'

  const build = await ApiDef.makeBuild({
    fs,
    folder,
    debug: 'debug',
    outprefix,
  })

  return build
}


async function runBuild(kase: any, build: any) {
  const bres = await build(
    {
      name: kase.name,
      def: `${kase.name}-${kase.version}-${kase.format}.yaml`
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



function validateGuide(kase: any, fs: any, vol: any) {

  const volJSON = vol.toJSON()
  const baseGuide = volJSON[`/model/guide/${kase.name}-base-guide.jsonic`].trim()
  // console.log('<' + baseGuide + '>')

  const expectedBaseGuide = fs.readFileSync(__dirname + '/../guide/' +
    `${kase.name}-${kase.version}-${kase.format}-base-guide.jsonic`, 'utf8').trim()

  // console.log('<' + expectedBaseGuide + '>')

  if (expectedBaseGuide !== baseGuide) {
    const difflines = Diff.diffLines(baseGuide, expectedBaseGuide)
    console.log(difflines)
    expect(baseGuide).equal(expectedBaseGuide)
  }
}
