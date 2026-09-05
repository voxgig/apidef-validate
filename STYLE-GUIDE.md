# Documentation style guide

How the Voxgig Apidef Validate documentation is written. This guide is
normative for the root [`README.md`](./README.md) — one page, the one a
reader lands on from GitHub and npm. It exists so that a page written next
year sounds like a page written this year, and so that a reviewer can point
at a rule instead of arguing taste.

It is a port of [jostraca/jostraca](https://github.com/jostraca/jostraca)'s
guide, by way of [voxgig/struct](https://github.com/voxgig/struct)'s,
which share an author and a house voice with this project. The structure
and most of the rules are those projects'. Where this one differs — the
spaced em dash, the working-document set, the shape of the four kinds —
the difference is recorded with the measurement behind it, because a
divergence nobody wrote down reads later as drift.

Three sources feed the guide, in a fixed priority order. The same order is
encoded in [`.vale.ini`](./.vale.ini), and every rule switched off there
names the reason and the count it produced:

    house voice  ->  Google  ->  Vale defaults

1. **This file.** Where it rules, it rules. The house voice is Richard
   Rodger's blog register, and the places it wins are listed with their
   reasons rather than left as silent exceptions: the spaced em dash,
   first-person plural in tutorials, British spellings, and quotation
   punctuation outside the quotes.
2. The [Google developer documentation style
   guide](https://developers.google.com/style) for everything this file
   does not cover: second person, present tense, active voice,
   sentence-style capitalisation in headings, serial commas, one idea per
   sentence.
3. [Vale](https://vale.sh) defaults, which mostly means spelling.

Two gates check it, and both run in CI:

| Gate | Runs | Checks |
|---|---|---|
| `vale --minAlertLevel=error $(python3 tools/check_prose.py --files)` | `.github/workflows/docs.yml` | Google's rules plus the banned list, at the levels set in `.vale.ini` |
| `python3 tools/check_prose.py` | `npm run scan-prose`, and the same workflow | the banned list, the em-dash spacing and ration, the first-person rules, no emoji, no citations of a working document, that every relative link resolves, and that the page set is complete |

There is no Makefile at the root, so `npm run scan-prose` runs the second
gate only; run the Vale line by hand when Vale is installed, and the
workflow runs both on every pull request that touches a page.

The banned list is read from one file by both, so they cannot drift. The
page set comes from one function, `tools/check_prose.py --files`, for the
same reason: a gate reading a smaller set than the other is a gate that
reports green on a page nobody checked.

A Google rule sitting at `warning` rather than `error` was tried at error
level first and found wrong for these pages; `.vale.ini` records what it
produced and why it was demoted.

## The structure: four kinds, and where they live

Documentation comes in four kinds, and the kind decides what a page may
do: a **tutorial** teaches step by step and shows output for every step; a
**how-to** solves one named task and assumes competence; a **reference**
states facts exhaustively and dryly and pins each claim to a test; an
**explanation** argues, compares, and admits trade-offs. This repository
has none of the four. It holds a corpus and a harness, and the four kinds
for apidef itself — the tool the corpus validates — are the
[apidef documentation](https://github.com/voxgig/apidef/tree/main/docs),
laid out as `tutorial/`, `how-to/`, `reference/`, and `explanation/`.

`README.md` is a doorway. It routes, gives the quick start, and states the
facts that no other page states because they are facts about this
repository alone: the layout, how to run each harness, and how a golden is
refreshed. A fact about apidef — what a guide is, what a pipeline step
does — is stated in the apidef documentation and linked from here, never
copied. A copy goes stale the day apidef changes, and apidef changing is
the one event this repository exists for.

`v1/guide/README.md` is not a page. It is a two-line label on a directory
of golden files, written for whoever opens that directory, and the gates
do not read it.

**Documentation never names the framework.** The four kinds come from
`Diátaxis`, and that is a fact about how these pages were planned, not
one a reader needs in order to read them. Say **tutorial**, **how-to**,
**reference** and **explanation**, which are ordinary words that describe
themselves, and let the structure do the explaining. This guide and the
contributor guides are where the name belongs, because there it answers a
question somebody is actually asking.

### The TypeScript harness owns the goldens

This repository checks two implementations of apidef, and they do not
check the same thing. The TypeScript harness (`v1/test/main.test.ts`)
diffs every case against the goldens; the Go harness
(`v1/go/validate_test.go`) runs the same cases through the Go module and
checks that each one builds. The README says which check does what, in
those words, and never claims a byte parity the Go harness does not
measure. When the Go harness starts diffing, the README changes in the
same commit.

## Documentation does not cite a working document

**A documentation page never sends a reader to a plan, a review, a
set of notes, or an agent instruction file.** Those are working
documents: written for the people changing this repository, argued rather
than stated, and stale the moment the code moves past them. A reader who
follows a link out of the documentation and lands in one has been handed
the project's notes in place of an answer.

The banned set, by name:

| Document | What it is |
|---|---|
| `v1/GOLDEN-NOTES.md` | the record of why goldens were refreshed, and what each unexplained mismatch turned out to be |
| `v1/diff-ts-go.md` | a captured run log from a TypeScript-versus-Go comparison |
| `AGENTS.md`, `CLAUDE.md` | instructions to contributors and agents; not present here, and guarded so they stay uncitable when they arrive |
| any `*_PLAN.md` or `*_REVIEW.md`, and `BUILD_LOG.md` | the shapes this project has not needed yet, guarded in advance |

The ban covers the name as much as the link. "The reasoning is in
`GOLDEN-NOTES.md`" fails for the same reason the URL does: the reader
still cannot act on the sentence without leaving the documentation.

State the fact instead. "A stale golden does not announce itself, so
record why a refresh happened in the commit message" is the lesson the
notes carry, and it is what a reader needs; the README states it, and a
link to the file that also says so adds nothing to it. Where the fact
belongs in the documentation and is missing, write it into the page that
owns it rather than pointing outside.

The rule runs one way. Working documents cite each other and cite the
documentation freely, because a set of notes that does not show its
working is not worth keeping. Only the direction out of documentation is
closed.

### What stays linkable, and why

| Linkable | Because |
|---|---|
| source, tests, and the corpus: `src/`, `v1/test/`, `v1/go/`, `def/`, `v1/guide/`, `v1/model/` | code is the thing a claim is pinned to, and the goldens are the specification this repository exists to hold |
| the [apidef documentation](https://github.com/voxgig/apidef/tree/main/docs) | the normative statement of what apidef does lives there, and the README links to it rather than copying it |
| this guide | normative rather than exploratory, and it names the working documents in order to ban them |

The rule behind the split: **a specification is citable, an argument is
not.**

`tools/check_prose.py` enforces this over the reader-facing pages. Vale
does not, because Vale cannot tell a working document from a page.

## The voice

The house voice is Richard Rodger's blog register, adapted per document
kind. The portable part of that voice is its *rhythm*, not its stock
phrases. Ten habits, with the register they apply in:

1. **Open with a concrete fact or a plainly stated problem, then a short
   dry beat.** Tutorials and how-tos. Reference pages open by stating
   what the thing is.
2. **Introduce code with a short colon-terminated sentence** — "Build the
   root package first, then the harness:", "Select cases by name:". Never
   "The following code snippet demonstrates". Everywhere.
3. **After a code block, point at the one interesting thing.** Do not
   recap the code. Everywhere.
4. **Parentheses carry definitions, caveats, and at most one dry aside per
   page.** Tutorials and how-tos. In reference pages, parentheses carry
   facts only — a type, a default, a test name.
5. **A trade-off gets bolted on with a dash, and the dash earns its
   place.** One per paragraph at most, never two in a sentence. The gate
   enforces the one-aside-per-line half of that; the paragraph half is
   a review matter.
6. **Alternate one long explanatory sentence with one short verdict
   sentence.** The short sentence is the payoff. Everywhere.
7. **Talk to the reader as "you", and route them** ("If you only want the
   Go check, skip to…"). "We" appears only in a tutorial, walking through
   code together. "I" appears nowhere.
8. **Show that the code is real.** Nothing executes the README's
   snippets. Every command on the page is an npm script in
   `v1/package.json` or a target in `v1/Makefile`, and every claim about
   what a harness does names the test that carries it (`guide-case`,
   `model-case`). A claim that names nothing is a claim nobody can check.
9. **Jokes are self-directed or about the industry's mundanity, and the
   register goes fully serious the moment correctness or a user's data is
   on the table.** Never joke about the reader, other tools, or the
   consequences of an overwrite.
10. **Close by handing the reader something**: a link, a next step, one
    sentence. No summary paragraphs that restate the page.

Exclamation marks: at most one per page, in tutorials only, on a genuine
payoff.

## Banned phrases and patterns

These read as generated filler. Do not use them, in any document,
including commit messages that quote the docs.

**The list itself lives in
[`.vale/styles/config/vocabularies/ApidefValidate/reject.txt`](./.vale/styles/config/vocabularies/ApidefValidate/reject.txt)**,
one regular expression per line. That file is the single source of truth:
Vale reads it in CI, and `tools/check_prose.py` reads the same file rather
than keeping a second copy, so the two gates cannot disagree about what is
banned. Add a phrase there and both pick it up. What follows is a reader's
summary of it, not a second list; every phrase is shown as code so that
quoting a banned phrase in this guide does not fail the gate.

The list is upstream's, unchanged, and it draws on two sources: that
project's original house list, and [claudisms.ai](https://claudisms.ai/),
a catalogue of the patterns that mark machine-written prose. **It was
measured against these pages before it was adopted.** Nothing fired: the
README was two lines when the list arrived, and the page it became was
written under the gate. Nothing was dropped from the list.

**Filler and false emphasis**: `worth noting` · `important to note` ·
`it cannot be overstated` · `at its core` · `when it comes to` ·
`let's break it down` · `here's where it gets interesting` ·
`the point is` · `because it matters`.

**Inflated vocabulary**: `delve` · `dive into` · `robust` · `seamless` ·
`comprehensive` · `holistic` · `intricate` · `leverage` · `foster` ·
`shed light on` · `pave the way` · `pivotal` · `transformative` ·
`game-changing` · `cutting-edge` · `groundbreaking` · `testament to` ·
`paradigm shift` · `realm` · `landscape of` · `underscores the` ·
`lean into` · `throughline` · `double-click on` · `mature setup`.

**Consultant register**: `north star` · `key takeaways` ·
`best practices` (name the practice instead) · `at the end of the day` ·
`pressure-test` · `right-size` · `strategic imperative` ·
`three things to know` · `dispatches from` · `best operators` ·
`lessons learned`.

**Metaphor inflation**: `load-bearing` · `heavy lifting` ·
`is doing the work` · `different physics` · `hits hardest` ·
`quietly` (say `silently`, which is the term of art for a failure that
reports nothing).

**The contrast frame and its cousins**: `not just` · `not only X but Y` ·
`it's not about` · `the whole game` · `the entire point` ·
`the only thing that matters`. Say what the thing is.

**False singularity**: `the right way/answer/tool/question` ·
`the best thing you can do` · `if I had to pick` · `what struck me` ·
`stuck with me` · `struck a chord` · `hit a nerve` ·
`we've seen this movie before`.

**Reflective pose**: `sit with` · `worth exploring/considering/asking` ·
`keeps coming back to` · `that's the tell` · `where I landed`.

**Invented observation about people**: `most people` ·
`everyone I've worked with` · `a lot of folks` · `nobody I know`. If it
did not happen, do not claim to have noticed it.

**Signposting**: `let's explore` · `now let's turn to` · `moving on to` ·
`in today's rapidly evolving` · `reflecting a broader trend` ·
`great question`.

**`honest`, and every form of it**, is banned differently from the rest.
The word is fine English; it is on the list because it had become a tic
across the repositories that share this list, where it flattered a
sentence rather than said anything the sentence did not already say.
It had not reached these pages when the list arrived.

**The gate is absolute, and the lack of an inline exemption is the
point.** There is no `allow` comment and no suppression the second gate
would honour, because an escape hatch that exists is an escape hatch that
gets used. A use the author wants kept is approved by changing
`reject.txt`: one line, in one file, visible in review, which is where an
approval belongs.

### What is not banned, and why

Several entries on claudisms.ai are deliberately absent, because they name
things this project documents. A gate that fires on the subject matter is
a gate people learn to switch off. The same standard governs
`ApidefValidate.WordChoice`, which carries three of Google's substitutions
and leaves the rest at warning.

| Not banned | Because |
|---|---|
| `real` | `real API definitions` is what the corpus is made of, as against a definition written to exercise one feature; and the harness keeps a real filesystem apart from an in-memory one. |
| `model` | The entity model is what apidef generates and what a golden under `v1/model/` pins. |
| `hold`, `carry`, `hands` | A directory holds the goldens, a golden line carries a `##` comment, the harness hands back a diff. |
| `lives` | `the normative statement of what apidef does lives there` is this guide, two sections up. |

The rule behind the list: ban the phrase that adds nothing, never the word
that names a thing.

**Matching spans a line wrap.** These pages hard-wrap, and most of the
list is multi-word, so the gate joins each paragraph before matching:
`worth\nnoting` fails exactly as `worth noting` does. Upstream records
that the day its gate started reading paragraphs it found two phrases that
had been passing since the gate was written, each saved only by where its
line happened to break.

**Patterns** (not mechanically checkable, enforced at review):

- Announcing structure before delivering it ("There are three things to
  understand").
- Restating the question before answering it.
- A closing one-liner that restates the thesis.
- Stacked short declaratives (four or more in a row).
- Superlative self-ranking ("the most important thing", "the part that
  matters most").
- A list of `**Bold term**: explanation` pairs, which is the single most
  recognisable machine-written list. Write sentences, or a table.

## Punctuation rulings

**The em dash is spaced here**: `a dash — like this`. This is the one
place where the guide contradicts both Google and jostraca, and it is the
Voxgig convention rather than drift — the one page carried no em dash at
all when the gate was written, spaced or unspaced, so the convention comes
from the sibling repositories, where the spaced count runs to dozens per
repository and the unspaced count is zero. `Google.EmDash` is therefore
off, and `tools/check_prose.py` `em-dashes-are-spaced` enforces the
convention in the other direction: an unspaced dash fails.

Dashes stay **rationed to one aside per line**: either a single dash
before a trailing clause, or one matched pair around a parenthetical,
never both and never two asides. Three on a line is the stacking the
ration exists to stop. Prefer a comma or parentheses when the aside is
mild.

The rest:

- In a link list, separate the link from its gloss with a full stop, not a
  dash:

  ```markdown
  - [apidef documentation](https://github.com/voxgig/apidef/tree/main/docs). The tutorial, how-to guides, reference, and explanation for apidef itself.
  ```

- **Every relative link must resolve, and stay inside the repository.**
  `tools/check_prose.py` checks the path, not the anchor, since a heading
  slug depends on the renderer; it reads both `[text](target)` and
  `[text][label]` with its definition. A target that resolves on a Linux
  runner but climbs out of the checkout resolves nowhere on GitHub or in a
  published package, so it fails too. The README had no relative link at
  all the day the check was written; it has one now, to this guide, and
  the apidef documentation is linked by URL because it is another
  repository.
- No emoji in documentation.
- Sentence-style capitalisation in headings (Google style), except where
  the heading names a proper noun or a code identifier: `apidef-validate`,
  `Run the Go check`.
- British spellings (`-ise`, `-isation`) for new prose. Google style is US
  English and so is the dictionary; this is one of the places the house
  voice wins, and
  [`accept.txt`](./.vale/styles/config/vocabularies/ApidefValidate/accept.txt)
  carries the British forms — **listed one by one**, never matched by
  suffix, because `\w+ise` accepts any word ending in those three letters
  and punches a hole straight through the spelling gate. A US spelling
  already on a page is not a defect, and a filename keeps whatever
  spelling it was created with.
- Quotation punctuation goes **outside** the quotes, against US
  convention, because putting a period inside a quoted `code span` is
  actively wrong when the quote is a literal.

## Terminology

- The project is **Voxgig Apidef Validate**, or **the corpus** and **the
  harness** in prose, for the two things it holds; the package names are
  `@voxgig/apidef-validate` at the root and `@voxgig/apidef-validate-v1`
  under `v1/`.
- **apidef** — lower case in prose, as the package is spelt. Say
  `@voxgig/apidef` when the npm package is meant and **the Go apidef
  module** for `github.com/voxgig/apidef/go`. Not "ApiDef", which is the
  class.
- **definition** — a file under `def/`: an OpenAPI or Swagger document, or
  a GraphQL schema. Say **the OpenAPI definition** or **the GraphQL
  schema**. Not "spec" in prose: in a case name, `spec` is the format
  slug (`openapi-3.1.0`, `swagger-2.0`, `graphql`).
- **case** — one definition and everything pinned for it, named
  `<name>-<version>-<spec>`. The case list is the array in
  `v1/test/main.test.ts`, mirrored in `v1/go/validate_test.go`.
- **golden** — the pinned expected output, a `.aontu` file; its
  **`.gen.aontu` twin** is what the last run produced. Say **golden**, not
  "snapshot" or "fixture", and **refresh** for replacing a golden on
  purpose.
- **guide** and **model** — apidef's own words. The base guide is the
  classification apidef derives from the definition, the final guide is
  that plus the case's own `*-guide.aontu` source, and the model is the
  set of entity models generated from the final guide. The normative
  definitions are in the apidef reference; say the words, link the
  reference.
- **mismatch** — a golden that differs from the run, and a test failure.
  **open TODO** — a golden line with a `##` comment, dropped before the
  comparison and counted. A TODO is not a failure; do not call it one.
- **parity** — here, that the TypeScript and the Go apidef both accept
  every case. The Go harness does not diff against the goldens, so never
  write "the two emit the same bytes" unless that check exists.
- **the pin** — the apidef version the harness runs: the dependency in
  `v1/package.json`, and `github.com/voxgig/apidef/go` in `v1/go/go.mod`.
  Say **move the pin**, not "upgrade".

## Templates, kind by kind

This repository has one page, and it is a doorway: the layout, the quick
start for each harness, the golden rule, and a link out. The four
templates are here for the day a page of one of those kinds arrives; until
then they describe the apidef documentation, which is where the reader is
sent.

**Tutorial**: goal sentence → snippet → output → the one observation →
forward link. Every step's output shown.

**How-to guide**: title is the task in imperative or "-ing" form; one
sentence of situation; the recipe; one paragraph of what to watch for;
links to the reference for the constructs and to the tutorial for the
basics it assumes.

**Reference page**: definition, then behaviour, then edge cases, then a
pinned example. Every claim that has a test can name it.

**Explanation page**: the question, the answer, the argument, the
trade-off admitted. May quote history when the history is the argument.

## Updating this guide

Change it the way behaviour changes: in the same commit as the first page
that follows the new rule, with the reasoning in the commit message.

To ban a phrase, add the regular expression to
[`reject.txt`](./.vale/styles/config/vocabularies/ApidefValidate/reject.txt)
and summarise it in the preceding list. Both gates pick it up from that
one file; there is no second list to update, and `tools/check_prose.py`
names this file, so a drift is a build failure with a pointer.

To change a Google rule's level, edit [`.vale.ini`](./.vale.ini) and write
down what the rule produced on a clean run. "It was noisy" is not a
reason; "it maps `touch` to `tap`, and it objects to `snake_case`, which
this project names on purpose — 143 hits" is. A rule demoted without that
note reads later as an oversight, and gets re-promoted by someone
repeating the work.

To widen what the gates read, change the configuration block at the top
of `tools/check_prose.py`. Both gates take their file set from it, so
widening it once widens both — and a page added to the repository without
being added there is a page neither gate has ever read.
