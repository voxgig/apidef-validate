# apidef-validate

The validation corpus for [`@voxgig/apidef`](https://github.com/voxgig/apidef):
real API definitions, the model apidef is expected to generate from each of
them, and a harness that runs a pinned apidef revision over every definition
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

Install Node.js 24 or later and Git. Build the root package first, then the harness:

```bash
npm ci && npm run build
cd v1
npm ci && npm run build
npm test
```

The apidef revision is pinned in `v1/apidef-source.json`. Installation checks
out that commit under `v1/node_modules/.apidef-source`, installs its locked
dependencies, builds the TypeScript package, and links it into the harness.
The build and test commands also prepare this dependency, so they work when
installation scripts are disabled. GitHub and `npm` access is needed for the
first build; later runs reuse the prepared checkout. No sibling checkout is
needed.

The suite runs every case twice: `guide-case` stops the
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

The Go harness runs the Go apidef module over the same definitions, minus
the GraphQL cases and `elementdemo`. Install Go 1.25 or later, then run:

```bash
cd v1
make test
```

The module version in `v1/go/go.mod` pins the same apidef commit as the
TypeScript harness. Go downloads it without a local workspace. The harness
diffs the base guide and the entity models the Go module writes, and the
final guide it returns, against the goldens, and a mismatch fails the test
with a line diff. It also checks that fields are maps keyed by `n` and that
their human titles match their names. The Go module writes no `# why`
annotations, so the trailing comments of the golden are dropped before the
base guide comparison.

The Go port does not yet reproduce every golden. The list at the top of
`v1/go/validate_test.go` holds one entry per known gap: a path glob, the
reason, and the number of distinct goldens under that glob the port is
expected to miss. A matching golden is still compared and logged, and a
mismatch does not fail the run; the count does. A complete run holds every
entry to its number in both directions, so a golden the port has started to
reproduce fails the run while its siblings still differ, and so does a
golden that starts failing under a glob already listed. The number counts
distinct paths rather than comparisons, because both phases compare the
guides. A run narrowed by `TEST_CASE`, or to one of the two phases, compares
part of the corpus only, so there a rise in a count is what fails.

`TEST_CASE` selects cases here too, `TEST_OUT` names a directory that keeps
the generated files, and `make update-apidef` moves the pin to the latest
published module.

## Goldens

Every TypeScript run writes a `.gen.aontu` twin beside each golden it
compares, so the generated output is always on disk next to what was
expected. The Go check writes nothing into the repository: its output goes
to a temporary directory unless `TEST_OUT` keeps it. A golden that does not
exist yet is created by the TypeScript run from its output, which is how a
new case pins itself on its first run; the Go check reports it as missing.
A golden line carrying a `##` comment marks a known gap: it is dropped
before the comparison and counted as an open TODO.

When apidef changes on purpose, move the commit pin in `v1/apidef-source.json`
and run `go get github.com/voxgig/apidef/go@<commit>` from `v1/go` with the same
commit. Run the suite, read the diff, and replace the golden with its
`.gen.aontu` twin. A
stale golden does not announce itself, so record why a refresh happened in
the commit message.

## Documentation

This README is the doorway. The tutorial, how-to guides, reference, and
explanation for apidef itself are in the
[apidef documentation](https://github.com/voxgig/apidef/tree/main/docs),
and the prose here follows [the style guide](STYLE-GUIDE.md).

To reset the snapshots to the current apidef output:

```bash
cd v1
npm run test-update
npm test
```

The reset updates expected and generated guides and entity models. It also
removes stale entity snapshots for the selected cases. Set `TEST_CASE` to
limit the reset, for example `TEST_CASE=solar npm run test-update`.
