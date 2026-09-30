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

## 2026-09-29 — apidef 8.18.0 and go/v0.14.0

The pins move from 8.17.0 to 8.18.0 and from go/v0.13.0 to go/v0.14.0. On
8.18.0, 425 goldens differed, in four classes. Pinning 8.17.2 separated the
first class from the rest.

1. **The goldens predate 8.17.1 and 8.17.2.** On 8.17.2 alone, 15 goldens in
   github and gitlab differ, 168 hunks, most of them added `rename: param`
   lines for GitHub's `{enterprise}` routes, such as `enterprise` to
   `enterprise_id`. That is the maintainer's release drift, not this change.
2. **`or` holds a parameter's own name** (voxgig/apidef#100): 1,907 hunks,
   each an `or:` value. petstore's `pet_id` becomes `petId`, and the GraphQL
   arguments in linear, github-graphql and shopifystorefront keep their
   spelling. apidef had written the snakified, depluralized form, which
   `docs/reference/model.md` never promised, and a generated SDK sent it on
   the wire.
3. **A record's one nested object is read whole** (the same PR): 150
   `transform: res: body.<nested>` lines leave the github, gitlab, shortcut,
   statuspage and cloudsmith guides, and the entities built from those
   operations lose the nested object's fields. A GitHub milestone load had
   returned its creator.
4. **A count beside a page's records** (the same PR) changes nothing here.

The TypeScript suite passes 5/5 on the refreshed goldens. In the Go harness
every guide matches, and the gitlab model skip drops from 231 differing
goldens to 230, because one more gitlab entity now matches its golden.

## 2026-09-29 — apidef 8.19.0 and go/v0.15.0

The pins move from 8.18.0 to 8.19.0 and from go/v0.14.0 to go/v0.15.0. On
8.19.0, 64 goldens differ, 244 hunks, in three classes, each from
voxgig/apidef#102. The three account for every hunk.

1. **A page's own metadata** is not a second candidate beside the page's
   records. 5 codatplatform lists read `body.results` and 29 learnworlds
   lists read `body.data`, where they had read the whole page, and the
   entities built from those operations lose the page's fields: Codat's
   company no longer carries `links`, `pageNumber`, `pageSize` and
   `totalResults`.
2. **A property named after the entity** unwraps a response only when the
   response is not the entity's own component, and wraps a request only when
   it is structured and the whole body. Five transforms leave the github
   guide: the commit load and the merge create read the commit rather than
   its inner git data, two marketplace account loads read the account rather
   than its `marketplace_purchase`, and the SSH key create sends its body
   rather than nesting it under `key`.
3. **A path placeholder no parameter declares** becomes a required string
   argument. The taxonomy kingdom load gains `id`, for the `{kingdom_id}`
   that its dangling parameter reference had left without one.

The TypeScript suite passes 5/5 on the refreshed goldens. The Go harness on
go/v0.15.0 matches every guide, and its model skips are unchanged.

## 2026-09-29 — apidef 8.20.0 and go/v0.16.0

The pins move from 8.19.0 to 8.20.0 and from go/v0.15.0 to go/v0.16.0. On
8.20.0, 96 goldens differ, 308 hunks, in github (40 files), gitlab (34),
learnworlds (14) and cloudsmith (8). All come from one change in
voxgig/apidef#104: a list now joins the entity that owns its item route
wherever the collection sits, with a version prefix or a trailing slash, where
before it joined only when the collection was a single segment. The four
transforms that change move with their routes.

1. **A list joins the owner of its item route.** github's app hook
   deliveries, app installations, gitignore templates, blocks, follows and
   repository invitations; gitlab's applications, keys, npm dist-tags,
   runners and snippets; learnworlds' community posts and spaces; and
   cloudsmith's user tokens each move onto the entity of their `/{id}` route.
   Entities named after a list wrapper or a path fall away: github from 268
   to 265, gitlab from 276 to 274, cloudsmith from 75 to 74.
2. **A list also joins the owner of a deeper route when its item route is
   missing.** github's marketplace listing plans, and the stubbed plans, join
   `marketplace_purchase`, the owner of `/marketplace_listing/plans/{plan_id}/accounts`,
   which lists purchases rather than plans. That is voxgig/apidef#106. The
   starred repositories join `activity` through `/user/starred/{owner}/{repo}`,
   whose two parameters name one repository, which is right.

The TypeScript suite passes 5/5 on the refreshed goldens. In the Go harness
on go/v0.16.0 every guide matches, and one more cloudsmith and one more
github entity now match their goldens, so those skips drop from 58 to 57 and
from 239 to 238.

## 2026-09-29 — apidef 8.21.0 and go/v0.17.0

The pins move from 8.20.0 to 8.21.0 and from go/v0.16.0 to go/v0.17.0. On
8.21.0, 56 goldens change, in github (22 files), contentful (22),
learnworlds (10) and cloudsmith (2). They come from voxgig/apidef#107 and
voxgig/apidef#109.

1. **A list joins a route beneath its item only on the record** (#109, which
   fixes voxgig/apidef#106). github's marketplace listing plans and stubbed
   plans return to `marketplace_listing_plan` from `marketplace_purchase`,
   whose accounts route lists purchases. github's and contentful's
   `/organizations` return to `organization` from `dependabot` and
   `app_definition`, the owners of routes beneath an organization. Where a
   tag names an item's delete and the record names its read, the list now
   joins the read: github's installations join `installation` rather than
   `app`, and learnworlds' spaces join `community_space` rather than
   `community`. github rises from 265 to 267 entities and contentful from 36
   to 37.
2. **A page reads its one list of records past what else it holds** (#107,
   which fixes voxgig/apidef#105). learnworlds' coupon usage list reads
   `body.payments`.
3. **An answer only a 202 gives is read** (#107). cloudsmith's file create
   gains the upload ticket its 202 returns, and github's activity gains the
   `message` its mark-as-read returns.

The TypeScript suite passes 5/5 on the refreshed goldens. In the Go harness
on go/v0.17.0 every guide matches. cloudsmith's `file` now matches its golden,
since its fields block is no longer empty, so that skip drops from 57 to 56.
contentful's `organization`, `app_definition` and `app_upload`, and github's
`billing_usage_report` and `dependabot_repository_access_detail`, now
differ under the known gaps: the entities beneath `/organizations` gain
`organization` as an ancestor, which the port does not emit, and the new
`organization` has an empty fields block. Those skips rise from 31 to 34
and from 238 to 240.

Two of the findings on the 8.20.0 refresh stay open as voxgig/apidef#110:
github's repository invitations still join `repo`, and gitlab's runner
registration still joins the runner detail entity.

## 2026-09-29 — apidef 8.22.0 and go/v0.18.0

The pins move from 8.21.0 to 8.22.0 and from go/v0.17.0 to go/v0.18.0, and
no golden changes. voxgig/apidef#114, which fixes voxgig/apidef#112, reads a
response composed with allOf by the entity's name through its parts. Neon's
writes answer that way, with the record beside its operations, and no
definition in this corpus does. The TypeScript suite passes 5/5 unchanged,
and the Go harness on go/v0.18.0 passes with every skip count as before.

## 2026-09-30 — apidef 8.22.1 and go/v0.18.1

The pins move from 8.22.0 to 8.22.1 and from go/v0.18.0 to go/v0.18.1, and
no golden changes. voxgig/apidef#117, which fixes voxgig/apidef#115, moves
both ports to @tabnas/yaml 0.5.15. Until then the Go harness parsed with
v0.5.12 and this lockfile resolved 0.5.13. Neither parser fix reaches this
corpus: no definition here holds a number followed by `#` (tabnas/yaml#95),
and every definition here parsed before 0.5.15, so none holds a number
followed by a bracket (tabnas/yaml#99). The TypeScript suite passes 5/5
unchanged, and the Go harness on go/v0.18.1 passes with every skip count as
before.

## Keeping goldens honest

The lesson from both: a stale golden does not announce itself. It sits there
asserting old behaviour, and the longer it sits the more it looks like the
specification. Refresh them deliberately when behaviour changes, and write
down why — that is what this file is for.
