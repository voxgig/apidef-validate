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
registration still joins the runner detail entity. voxgig/apidef#133 closes
both in 8.23.0, recorded under 2026-10-02 below.

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

## 2026-10-02 — apidef 8.23.0 and go/v0.19.0

The pins move from 8.22.1 to 8.23.0 and from go/v0.18.1 to go/v0.19.0. The
release carries seven merges, voxgig/apidef#130 to #136. 775 of the 840
OpenAPI entity goldens change, one entity is added, and the base and final
guides of cloudsmith, github and gitlab change. No GraphQL golden changes.

Each change was traced to its merge by generating the 15 OpenAPI cases at
every merge between the two releases. 8.22.1 reproduces the old goldens and
8.23.0 the new ones, file for file, and every difference between two
neighbouring merges falls into one of the classes below.

1. **The credential a client sends** (#130) changes nothing here, since the
   corpus records no `api-info`.
2. **A REST point is selected by its path parameters and required
   arguments** (#131). `q.exist` drops the optional arguments of 987
   points, and 141 points lose `q` altogether, since nothing is left to
   select them. Points sort by selector, so 479 points re-sort within their
   operation, and the fields of cloudsmith's `package`, github's `action`
   and `repo`, and shortcut's `story` follow, since an entity's fields are
   read from its points in order. 633 of 1,707 operations change, in 463
   entity goldens.
3. **A path parameter keeps one name across an entity's operations**
   (#132). 175 points in cloudsmith, github and gitlab rename a parameter,
   which changes 85 operations on 47 entities, and 152 `rename: param`
   lines leave the three base guides. A parameter keeps its own name where
   the deeper routes had called it an id: cloudsmith's `member` had been
   `member_id`, gitlab's conan `package_name` had been `conan_id`, and
   github's `environment_name` had been `environment_id`. github's
   `enterprise-team` becomes `enterprise_team` rather than `team_id`. apidef
   reads no type from a Swagger 2 parameter, which declares it beside its
   name rather than in a schema, and infers `$STRING` from an `_id` name
   alone, so the 79 such path parameters that lose an `_id` name go from
   `$STRING` to `$ANY`, 6 in cloudsmith and 73 in gitlab. The new names
   re-sort 31 points, and github's `repo` fields follow again.
4. **A route joins the entity of the records it answers with** (#133),
   which closes the two voxgig/apidef#110 findings recorded on 8.21.0.
   github's `/user/repository_invitations` list, `PATCH` and `DELETE` move
   from `repo` to `repository_invitation`, whose item key `invitation_id`
   becomes `id`, and `repo` loses the invitation fields. gitlab's
   `POST /api/v4/runners` stays on
   `api_entities_ci_runner_registration_detail`, and `GET /api/v4/keys`
   leaves `api_entities_ssh_key_with_user` for a new
   `api_entities_user_with_admin`, so gitlab rises from 274 to 275
   entities.
5. **A request body that is not JSON alone** (#134): 19 points on 13
   entities gain `rb`. They are contentful's `upload`; github's `markdown`
   and `release_asset`; gitlab's `api_entities_appearance`,
   `api_entities_bulk_import`, `api_entities_metric_image`,
   `api_entities_project_import_status`,
   `api_entities_relation_import_tracker`, `group_import` and
   `terraform_registry`; petstore's `pet`; shortcut's `uploaded_file`; and
   statuspage's `component`.
6. **The media types a success response declares** (#135): 2,393 of the
   3,240 points gain `rs`, on 709 of the 841 entities. No pokeapi point
   has one, as its operations answer `default` only. Read against the
   definitions, the points carrying `rs` are exactly those whose operation
   declares a `2XX` body, and the points carrying `rb` exactly those whose
   request body is not JSON alone.
7. **Request paths** (#136) change nothing here.

The TypeScript suite passes 5/5 on the refreshed goldens. The Go harness on
go/v0.19.0 passes with every skip count unchanged, and the same 613 goldens
differ under the known gaps as on 8.22.1 and go/v0.18.1. The Go port writes
the new gitlab entity exactly, and every guide matches.

## 2026-10-05 — apidef 8.24.0 and go/v0.20.0

The pins move from 8.23.0 to 8.24.0 and from go/v0.19.0 to go/v0.20.0. The
release carries eighteen merges, voxgig/apidef#138 to #166. 348 of the 841
OpenAPI entity goldens change: 246 in gitlab, 65 in cloudsmith, 13 in
dingconnect, 12 in statuspage, 4 each in github and petstore, 3 in taxonomy
and 1 in codatplatform. No entity is added or removed, no guide changes, and
no GraphQL golden changes.

Each change was traced to its merge by generating the corpus at every merge
between the two releases, with both ports, from an apidef checkout at that
merge. 8.23.0 reproduces the old goldens and 8.24.0 the new ones, file for
file, and every difference between two neighbouring merges falls into one of
the classes below. Six merges move goldens. 149 goldens change at #145
alone, 141 at #145 and #151, 38 at #151 alone, and the rest at one merge
each.

1. **A property written as an allOf of one scalar takes that scalar's type**
   (#138). taxonomy's `parentId` on `domain`, `kingdom` and `phylum` goes
   from `$ANY` to `$STRING`. 3 goldens.
2. **A Swagger 2 parameter is typed from its own facts** (#145). apidef had
   looked for them under a `schema`, which Swagger 2 gives only a body
   parameter. 2,679 arguments take the type their parameter declares, 580 in
   cloudsmith, 2,071 in gitlab, 19 in dingconnect and 9 in petstore: 1,574
   from `$ANY` to `$STRING`, 733 from `$STRING` to `$INTEGER`, 195 from
   `$ANY` to `$BOOLEAN`, and 177 otherwise. 253 gain `ex`, the default or
   example the parameter declares. 1,090 of the 3,240 points change, in 519
   of the 1,707 operations and 290 goldens.
3. **Every allOf member of a request schema is read for fields** (#149).
   codatplatform's `setting` gains `clientId`, `overridesDefaults` and
   `settings` from the members of its request body. 1 golden.
4. **A Swagger 2 body parameter is the request body** (#151), no longer a
   query argument. The 579 that had been arguments leave their points, 405
   in gitlab, 162 in cloudsmith, 7 in petstore and 5 in dingconnect. 417 of
   those points' selectors drop them, and 38 are left with nothing to select
   by. 111 entities gain 495 fields, the bodies' properties and two array
   carriers, and fields already there gain 417 descriptions, 128
   per-operation overrides and 20 formats, and change 9 types, 8 required
   flags, a description and a format. An array body is sent from one field:
   dingconnect's cancellations and estimations, whose carriers are those two
   fields, and petstore's two user list actions, which declare none, since an
   action's request fields are its own. 18 operations re-sort their points.
   579 points change, in 275 operations and 179 goldens.
5. **A wrapped request body's fields are read through its key** (#159).
   Twelve statuspage entities lose the field named after the wrapper, six of
   them gain the 20 record fields the wrapped bodies declare, and seven
   fields they already had gain a description or a per-operation override.
   12 goldens.
6. **A response's properties are read without changing the definition**
   (#163). The guide had copied a schema two references share into two
   objects, so the union scan counted a union reached through both twice.
   The `protection` of github's `branch` and `short_branch`, the
   `required_pull_request_reviews` of `branch_protection`, and the `payload`
   of `event` each count one union fewer, the count the Go port gives. 4
   goldens.

The other twelve merges move no golden. No server URL here is written in
Postman's `{{name}}` form, and the info block is unchanged in both ports
(#141). No envelope here turns on a composed scalar (#144). Each of the
5,485 path segment variables was already named by its path argument, and
each of the 5,503 path arguments already required (#147). The list, item
envelope and tag rules of #155, #158 and #156 meet no case here. The six Go
merges, #160, #161, #162, #164, #165 and #166, change the Go port alone.

Read against the definitions at 8.24.0, each of the 9,057 arguments with a
declared parameter carries the type and the example that parameter
declares, as apidef reads them: a parameter declaring no type is typed by
its name, and an empty example is dropped by the clean step. No argument
comes from a body parameter, and every path argument that fills a
placeholder is required. Each field #149, #151 and #159 adds is a property
of a request body the definition declares for one of the entity's
operations: #149's through an allOf member, #151's in a body parameter's
schema, and #159's under the key that wraps the record. The exceptions are
dingconnect's two array carriers, which #151 names itself.

The Go port moves with #138, #145, #149, #151 and #159, entity file for
entity file, and already gave #163's counts. On go/v0.20.0 it reproduces
every golden. Measured at each merge against the goldens the TypeScript
port gives at that merge, the goldens differing under the Go harness's
skips fall from 613 to none, and none starts to differ on the way:

- #149 writes a field's union metadata, so github's
  `integration_installation` and shortcut's `story_slim` match, and their
  counts fall from 240 to 239 and from 14 to 13. Those are the two counts
  reported stale.
- #151 fills the empty fields blocks of cloudsmith's `user_auth_token` and
  six gitlab entities from their bodies, and the block no longer sits out of
  place: 611 to 604.
- #160 names a path's ancestors as the TypeScript port does, in 582 entity
  files: 604 to 63.
- #163 brings github's four union counts to the Go port's: 63 to 59.
- #166 writes an empty fields block after `op`, and keeps the `active` key
  of a request transform, which it had dropped from github's `hook`: 59
  to 2.
- #164 reads named examples in the order they are declared, so github's
  `activity` and `repo` take their fields from the example declared first:
  2 to 0.

#162, #165 and #161 bring the flow steps and the info block into line,
which no golden covers. `make port-diff` follows each gap closing: unions at
#149 and #163, relations at #160, flow steps at #162, info at #165 and #161,
and the last 16 fields, github's, at #164. From #164 on, it finds no
difference over the 15 definitions.

All twelve skip entries now find no differing golden, though each glob still
matches goldens, so each is removed, with the two reasons only they used. The
harness fails an entry whose count is stale, and an entry recounted to zero
would only turn a strict line diff into a count:

- `model/cloudsmith-*/*` (56): 1 at #151 and 55 at #160.
- `model/codatplatform-*/*` (12): 11 at #160 and 1 at #166.
- `model/contentfulcma-*/*` (34): 21 at #160 and 13 at #166.
- `model/foo-*/*-bar.aontu`, `*-qaz.aontu` and `*-yike.aontu` (1 each), and
  `model/petstore-*/*-store.aontu` (1): the empty fields block, at #166.
- `model/github-*/*` (240): 1 at #149, 222 at #160, 4 at #163, 11 at #166
  and 2 at #164.
- `model/gitlab-*/*` (230): 6 at #151, 199 at #160 and 25 at #166.
- `model/learnworlds-*/*` (9) and `model/statuspage-*/*` (14): all at #160.
- `model/shortcut-*/*` (14): 1 at #149, 10 at #160 and 3 at #166.

The TypeScript suite passes 23/23 on the refreshed goldens, main's five
tests among them. The Go harness on go/v0.20.0 passes its 36 tests and
compares all 871 distinct goldens strictly. `make port-diff` finds no
difference over the 15 definitions.

## Keeping goldens honest

The lesson from both: a stale golden does not announce itself. It sits there
asserting old behaviour, and the longer it sits the more it looks like the
specification. Refresh them deliberately when behaviour changes, and write
down why — that is what this file is for.
