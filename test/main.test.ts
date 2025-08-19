/* Copyright (c) 2025 Voxgig Ltd, MIT License */

import { test, describe } from 'node:test'
import { expect } from '@hapi/code'


import {
  main
} from '..'




describe('main', () => {

  test('happy', async () => {
    expect(main()).equal('main')
  })

})
