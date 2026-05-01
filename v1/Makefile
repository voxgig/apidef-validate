# Test the Go port of @voxgig/apidef (latest published module) against the
# local test cases here. Mirrors the npm scripts in package.json.

.PHONY: test test-some test-guide-case test-model-case \
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

# Pull the latest published github.com/voxgig/apidef/go and refresh go.sum.
update-apidef:
	cd $(GODIR) && $(GO) get -u github.com/voxgig/apidef/go@latest && $(GO) mod tidy

tidy:
	cd $(GODIR) && $(GO) mod tidy

clean:
	cd $(GODIR) && $(GO) clean -testcache
