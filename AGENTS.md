# apidef-validate — agent guide

## This repository is worked on from more than one machine

Work here happens on more than one machine, and in ephemeral containers whose
installed software differs from each other and from any developer workstation.
A toolchain, a path, or a version present in one is routinely absent in the
next: Node.js, Go, Python, Vale, and the network reach that fetching the pinned
apidef revision needs are each available in some environments and missing in
others.

So do not record an inventory of what is installed as though it were a property
of this repository, and do not conclude that something cannot be built, run, or
verified without checking the environment in front of you first, with
`command -v go` or `command -v vale`. A sentence anywhere in this repository
saying a tool was unavailable is a fact about the environment that sentence was
written in, never about the current one, and the same holds for a version some
run happened to resolve. Any absolute path shown here is an example, not a
location to expect.

State what a reader must check, not what a past run found. The style guide says
the Vale half of the prose gate runs when Vale is installed, rather than
claiming it is; that is the shape every environment claim in this repository
takes.

## Temporary local tool development

Prefer local symlinks to sibling tool checkouts when developing or testing
unreleased Voxgig tools together. Link to the actual package root (for example,
`apidef/ts` or `sdkgen/ts`), build that checkout, and verify that the consumer
resolves the linked code. Use existing validator local-path options where
available.

Do not create or copy `.zip`, `.tgz`, or `npm pack` snapshots into SDK projects
or ad hoc `vendor/` folders just to use local changes. Keep temporary links in
ignored dependency directories; keep machine-specific paths and temporary
`file:` dependencies out of committed manifests and lockfiles. Shared builds
and CI should use published versions or explicitly check out and build the
required source revisions.

Archives are appropriate when testing package contents or installation from a
packed release. Put those artifacts in a temporary test directory and clean
up artifacts created by the test afterward; do not scatter them across repos.


## Source code comments

Follow [COMMENT-POLICY.md](COMMENT-POLICY.md): comments are sparse and terse,
only for intricate or surprising code. Names carry intent; documents carry
requirements. Run `make comments comments-test` after editing source.

Durable implementation rationale is in [COMMENT-NOTES.md](COMMENT-NOTES.md).
