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
# golden that disagrees fails its harness without stopping the dump.
PORT_DIFF_DIR ?= $(CURDIR)/port-diff-out

port-diff:
	rm -rf $(PORT_DIFF_DIR)
	-DUMP_MODEL=$(PORT_DIFF_DIR) npm run test-model-case > /dev/null 2>&1
	-cd $(GODIR) && DUMP_MODEL=$(PORT_DIFF_DIR) $(GOTEST) -run "/model-case" ./... > /dev/null 2>&1
	node scripts/port-diff.js $(PORT_DIFF_DIR)

# Pull the latest published github.com/voxgig/apidef/go and refresh go.sum.
update-apidef:
	cd $(GODIR) && $(GO) get -u github.com/voxgig/apidef/go@latest && $(GO) mod tidy

tidy:
	cd $(GODIR) && $(GO) mod tidy

clean:
	cd $(GODIR) && $(GO) clean -testcache
