/* Copyright (c) 2025 Voxgig Ltd, MIT License */

import * as fs from 'fs'
import { memfs } from 'memfs'
import { Union } from 'unionfs'

import * as Diff from 'diff'



function main() {
  return "main"
}


function makefs(vol: any): any {
  const ufs: any = new Union()
  const mem = memfs(vol)

  ufs.use((mem.fs as any)).use(fs)

  ufs.__mem__ = true
  ufs.__vol__ = mem.vol

  return { fs: ufs, vol: mem.vol }
}


export {
  main,
  makefs,
  Diff
}
