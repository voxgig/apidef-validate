# apidef-validate

The validation corpus for [`@voxgig/apidef`](https://github.com/voxgig/apidef):
real API definitions, the model apidef is expected to generate from each of
them, and a harness that runs a pinned apidef release over every definition
and diffs its output against those golden files. When apidef changes, this is
where the change shows up as a diff a human can read.

## Layout

| Path | What it holds |
|---|---|
| `def/` | the API definitions: OpenAPI 2 and 3 documents in JSON and YAML, and GraphQL schemas as SDL and as introspection JSON |
| `v1/guide/` | the golden guides, one base guide and one final guide per definition, plus the `*-guide.aontu` source each case starts from |
| `v1/model/<case>/` | the golden entity models, one file per entity |
| `v1/test/main.test.ts` | the case list and the TypeScript harness |
| `v1/go/validate_test.go` | the Go harness, with the same case list minus the GraphQL cases and `elementdemo` |
| `src/main.ts` | the sandbox both TypeScript suites share: a union filesystem that keeps generated output in memory, and the line differ |

A case is named after its definition file, so `petstore-1.0.7-swagger-2.0`
is `def/petstore-1.0.7-swagger-2.0.json`, its guides are
`v1/guide/petstore-1.0.7-swagger-2.0-*.aontu`, and its entity models sit
under `v1/model/petstore-1.0.7-swagger-2.0/`.

## Run the TypeScript check

Build the root package first, then the harness:

```bash
npm install && npm run build
cd v1
npm install && npm run build
npm test
```

The pinned apidef release is the `@voxgig/apidef` dependency in
`v1/package.json`. The suite runs every case twice: `guide-case` stops the
apidef pipeline after guide generation and compares the base and final
guides, and `model-case` runs the whole pipeline and compares the entity
models. A mismatch fails the test with a line diff.

Select cases by name:

```bash
TEST_CASE=petstore,solar npm test
npm run test-guide-case
npm run test-model-case
```

If the installed apidef predates GraphQL ingestion, the GraphQL cases are
skipped and the run says so.

## Run the Go check

The Go harness runs the Go apidef module over the same definitions:

```bash
cd v1
make test
```

It checks that each case builds and produces a guide and a model, and it
logs the entity counts. It does not diff against the goldens, so the parity
this repository checks is that both implementations accept the corpus, not
that they emit the same bytes. `TEST_CASE` selects cases here too, and
`make update-apidef` moves the pin to the latest published module.

## Goldens

Every TypeScript run writes a `.gen.aontu` twin beside each golden it
compares, so the generated output is always on disk next to what was
expected; the Go check writes nothing, since it does not compare. A golden that does not
exist yet is created from the run's output, which is how a new case pins
itself on its first run. A golden line carrying a `##` comment marks a known
gap: it is dropped before the comparison and counted as an open TODO.

When apidef changes on purpose, move the pin in `v1/package.json`, run the
suite, read the diff, and replace the golden with its `.gen.aontu` twin. A
stale golden does not announce itself, so record why a refresh happened in
the commit message.

## Documentation

This README is the doorway. The tutorial, how-to guides, reference, and
explanation for apidef itself are in the
[apidef documentation](https://github.com/voxgig/apidef/tree/main/docs),
and the prose here follows [the style guide](STYLE-GUIDE.md).
