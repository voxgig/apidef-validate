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

## Keeping goldens honest

The lesson from both: a stale golden does not announce itself. It sits there
asserting old behaviour, and the longer it sits the more it looks like the
specification. Refresh them deliberately when behaviour changes, and write
down why — that is what this file is for.
