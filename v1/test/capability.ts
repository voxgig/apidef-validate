/* Copyright (c) 2025 Voxgig Ltd, MIT License */

import * as Fs from 'node:fs'


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
