# Notes on the goldens

## 2026-08-11 — the "pre-existing 10"

Before the wire-field-name refresh, this suite failed 10 mismatches against
its own pinned `@voxgig/apidef` 6.3.6. They were unexplained, so they were
investigated rather than absorbed silently.

**Both groups turned out to be golden staleness, and in both the current
behaviour is better than what the goldens asserted.** No apidef defect was
found.

### 1. cloudsmith — 8 mismatches: `gon2` … `gon9`, `p2n2`

The goldens declared **140 entities**; apidef generates **131**. The nine
missing ones are numbered duplicates — `gon2`, `gon3`, … `gon9`, plus
`p2n2`. The base `gon` entity survives.

These are the entity-dedup heuristics doing their job. Nothing wants an SDK
exposing `gon7()`. The goldens predate that improvement and were never
refreshed.

### 2. github — 2 mismatches: the `key` entity's response transform

The goldens asserted:

```
res: `body.key`
```

apidef generates `res: body`, and apidef is right. The endpoints behind the
`key` entity return `actions-public-key` and friends:

| schema | properties |
|---|---|
| `actions-public-key` | key_id, key, id, url, title, created_at |
| `codespaces-public-key` | key_id, key, id, url, title, created_at |
| `dependabot-public-key` | key_id, key |

Unwrapping to `body.key` throws away **five of the six fields** — including
`key_id`, which is `required` and which a caller needs in order to encrypt a
secret against that key. The old golden preserved a genuinely harmful
over-eager unwrap that was fixed in apidef at some point before 6.3.6.

This is also why the envelope rule is written the way it is
(`utility.ts envelopeProp`): a body of scalar siblings is a structure in its
own right, never an envelope. `{key_id, key}` has no structured member, so
there is nothing to unwrap to.

## 2026-09-11 — the 469

The suite was failing **469 mismatches** across 13 of the 16 specs, in both
its groups. That is not the "pre-existing 10" grown a little: the goldens had
not been refreshed while apidef gained several documented features, and every
one of them changes model output. Measured against a stashed apidef, the
count was identical before and after the change being validated that day, so
none of it was attributable to the work in flight.

All 470 goldens (guide and model) were refreshed together. The drift sorts
into a handful of classes, each an apidef feature the goldens predate:

| lines | key | what added it |
|---|---|---|
| 2005 | `format` | spec facts carried through on a field |
| 533 | `readOnly` | the same feature |
| 285 / 188 | `lit` / `var` | path `segments` (ADR-003) |
| 269 / 268 | `name` / `orig` | wire field names, and param renames |
| 187 / 140 / 140 | `type` / `reqd` / `kind` | arg shape |
| 57 | `rename` `param` | camelCase to snake_case param renames |
| 56 / 71 | `transform` / `$action` | response transforms, folded actions |

Two smaller changes in the same refresh came from apidef's composite-identity
work: an entity's id descriptor is now emitted only when the entity actually
has one (petstore's `store` correctly loses an `id` it has no route for), and
a handful of compound keys were corrected — `gist` is keyed by `gist_id`
rather than `gist_id/sha`, since the second addresses a REVISION.

Refreshing this many at once is only defensible because the classes are
enumerable and each is a feature rather than a regression. The suite now
passes 3/3 and does so repeatably, which is the state a golden suite has to
be in to be worth anything: a suite that always fails teaches its readers to
ignore it, and that is how 10 stale goldens became 469.

## Keeping goldens honest

The lesson from both: a stale golden does not announce itself. It sits there
asserting old behaviour, and the longer it sits the more it looks like the
specification. Refresh them deliberately when behaviour changes, and write
down why — that is what this file is for.
