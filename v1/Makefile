# Test the pinned Go port of @voxgig/apidef against the
# local test cases here. Mirrors the npm scripts in package.json.

.PHONY: test test-some test-guide-case test-model-case port-diff \
        update-apidef tidy clean

GO     ?= go
GOTEST ?= $(GO) test -v -count=1
GODIR  := go

# npm test → run all Go validate tests.
test:
	cd $(GODIR) && $(GOTEST) ./...

# npm test-some → filter by Go test name pattern. Go's -run is split on '/'
# and matched per subtest level, so prefix with '/' to match a subtest segment
# (e.g. TEST_PATTERN=/guide-case/petstore).
test-some:
	cd $(GODIR) && $(GOTEST) -run "$(TEST_PATTERN)" ./...

# npm test-guide-case
test-guide-case:
	cd $(GODIR) && $(GOTEST) -run "/guide-case" ./...

# npm test-model-case
test-model-case:
	cd $(GODIR) && $(GOTEST) -run "/model-case" ./...

# Both ports' API models, case by case: each harness writes them to
# PORT_DIFF_DIR, and scripts/port-diff.js counts the differences by class. A
# golden that disagrees fails its harness without stopping the dump; the target
# then fails too, naming the harness log. The Go harness runs each case in a
# temporary directory, so the folder is made absolute.
PORT_DIFF_DIR ?= $(CURDIR)/port-diff-out
override PORT_DIFF_DIR := $(abspath $(PORT_DIFF_DIR))
PORT_DIFF_FLAGS ?=

# The Go case list is the TS one minus its GraphQL cases.
port-diff:
	rm -rf $(PORT_DIFF_DIR)
	mkdir -p $(PORT_DIFF_DIR)
	@ts=0; go=0; diff=0; \
	echo "port-diff: 1/3 TS harness, output in $(PORT_DIFF_DIR)/ts-harness.log"; \
	DUMP_MODEL=$(PORT_DIFF_DIR) npm run test-model-case \
	  > $(PORT_DIFF_DIR)/ts-harness.log 2>&1 || ts=$$?; \
	echo "port-diff: 2/3 Go harness, output in $(PORT_DIFF_DIR)/go-harness.log"; \
	(cd $(GODIR) && DUMP_MODEL=$(PORT_DIFF_DIR) $(GOTEST) -run "/model-case" ./...) \
	  > $(PORT_DIFF_DIR)/go-harness.log 2>&1 || go=$$?; \
	echo "port-diff: 3/3 comparing"; \
	node scripts/port-diff.js $(PORT_DIFF_DIR) --ts-only=graphql $(PORT_DIFF_FLAGS) || diff=$$?; \
	[ $$ts = 0 ] || echo "port-diff: the TS harness exited $$ts; see $(PORT_DIFF_DIR)/ts-harness.log" >&2; \
	[ $$go = 0 ] || echo "port-diff: the Go harness exited $$go; see $(PORT_DIFF_DIR)/go-harness.log" >&2; \
	[ $$ts = 0 ] && [ $$go = 0 ] && [ $$diff = 0 ]

# Pull the latest published github.com/voxgig/apidef/go and refresh go.sum.
update-apidef:
	cd $(GODIR) && $(GO) get -u github.com/voxgig/apidef/go@latest && $(GO) mod tidy

tidy:
	cd $(GODIR) && $(GO) mod tidy

clean:
	cd $(GODIR) && $(GO) clean -testcache
