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

  // ORDER IS THE SANDBOX. unionfs gives precedence to the LAST fs registered,
  // so the in-memory fs must be registered last, not first.
  //
  // Registered the other way round the real fs won every write: jostraca's
  // FileHandler starts with `fs().mkdirSync(dir, {recursive: true})`, that
  // landed on the host, and every file written into the directory followed it
  // there. The generated output then never appeared in `vol`, so the golden
  // comparisons read `undefined` and every case failed before a single golden
  // was compared.
  //
  // It survived because the damage is privilege-dependent, not because it
  // worked. The case paths are rooted at `/model`, which an ordinary user
  // cannot create: the real-fs write failed with EACCES, unionfs silently
  // fell through to the memory fs, and the suite passed. Run as root — in a
  // container, in CI — the real write succeeds instead, and the run writes
  // thousands of files to the host filesystem while reporting failure.
  //
  // Reads are unaffected: a path missing from the memory fs still falls
  // through to the real one, which is how the def files are loaded.
  ufs.use(fs).use((mem.fs as any))

  ufs.__mem__ = true
  ufs.__vol__ = mem.vol

  return { fs: ufs, vol: mem.vol }
}


export {
  main,
  makefs,
  Diff
}
