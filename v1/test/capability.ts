/* Copyright (c) 2025 Voxgig Ltd, MIT License */

import * as Fs from 'node:fs'


// GraphQL ingestion landed after some published @voxgig/apidef versions, so
// the installed copy may not understand those cases at all. Detect the
// capability from the shipped model rather than by version arithmetic: a
// pre-GraphQL apidef simply has no graphql block in its point schema.
//
// SHARED BECAUSE THE DUPLICATE DRIFTED. main.test.ts and bench.ts both need
// this probe, and when apidef renamed `model/apidef.aontu` to `.aon` only
// one copy was updated. The other went on resolving the old name, threw
// MODULE_NOT_FOUND straight into its own catch, and reported "not capable"
// — so every GraphQL case vanished from the benchmark with nothing logged.
// A probe whose failure mode is silent must not exist twice.
function graphqlCapable(): boolean {
  for (const ext of ['aon', 'aontu']) {
    try {
      const modelPath = require.resolve(`@voxgig/apidef/model/apidef.${ext}`)
      return Fs.readFileSync(modelPath, 'utf8').includes("'graphql'")
    }
    catch (err: any) {
      // Wrong extension for this apidef, or unreadable. Try the other; if
      // neither resolves, apidef predates GraphQL and false is correct.
    }
  }

  return false
}


export {
  graphqlCapable
}
