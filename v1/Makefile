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
# Seconds between the status lines of a running harness: at most 30, the
# longest silence ../AGENTS.md allows a long-running task.
PORT_DIFF_BEAT ?= 15
port_diff_beats := 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30
port_diff_beat_ok = $(and $(filter 1,$(words $(PORT_DIFF_BEAT))),$(filter $(port_diff_beats),$(PORT_DIFF_BEAT)))

# What port-diff writes in PORT_DIFF_DIR, and so all it removes there; dotfiles
# are neither checked nor removed. Before any line runs, it refuses a folder
# that is or holds v1/, or that holds other files.
port_diff_own := %.ts.json %.go.json ts-harness.log go-harness.log
port_diff_foreign = $(filter-out $(port_diff_own),$(notdir $(wildcard $(PORT_DIFF_DIR)/*)))
port_diff_refusal = $(strip \
  $(if $(filter-out 1,$(words $(PORT_DIFF_DIR))),is not a single path, \
  $(if $(filter $(patsubst %/,%,$(PORT_DIFF_DIR))/%,$(CURDIR)/),is $(CURDIR) or a folder above it, \
  $(if $(port_diff_foreign),holds files port-diff did not write: $(wordlist 1,3,$(port_diff_foreign))))))

# Each harness dumps one case per definition in ../def, the Go one all but the
# GraphQL cases.
port_diff_ts_only := graphql
port_diff_defs = $(basename $(filter-out %.full.json potentials.txt,$(notdir $(wildcard ../def/*))))
port_diff_ts_cases = $(words $(port_diff_defs))
port_diff_go_cases = $(words $(filter-out %-$(port_diff_ts_only),$(port_diff_defs)))

# A background job ignores Ctrl-C, so the status loop also ends with the shell.
# Status lines go to stderr, so under make -s stdout carries the report alone.
port-diff:
	$(if $(port_diff_refusal),$(error port-diff: PORT_DIFF_DIR=$(PORT_DIFF_DIR) $(port_diff_refusal); name a new or empty folder))
	$(if $(port_diff_beat_ok),,$(error port-diff: PORT_DIFF_BEAT=$(PORT_DIFF_BEAT) is not a whole number of seconds from 1 to $(lastword $(port_diff_beats))))
	rm -f $(addprefix $(PORT_DIFF_DIR)/,$(subst %,*,$(port_diff_own)))
	mkdir -p $(PORT_DIFF_DIR)
	@ts=0; go=0; diff=0; \
	say() { echo "port-diff: $$*" >&2; }; \
	beat() { t=0; \
	  while sleep 1 > /dev/null 2>&1 && kill -0 $$$$ 2> /dev/null; do \
	    t=$$((t + 1)); [ $$((t % $(PORT_DIFF_BEAT))) = 0 ] || continue; \
	    n=$$(ls $(PORT_DIFF_DIR) | grep -c '\.'$$2'\.json$$'); \
	    pct=; [ $$3 -gt 0 ] && pct=" ($$((100 * n / $$3))%)"; \
	    say "$$1 harness running $${t}s, $$n of $$3 cases dumped$$pct"; \
	  done; }; \
	say "1/3 TS harness, output in $(PORT_DIFF_DIR)/ts-harness.log"; \
	beat "1/3 TS" ts $(port_diff_ts_cases) & beating=$$!; \
	DUMP_MODEL=$(PORT_DIFF_DIR) npm run test-model-case \
	  > $(PORT_DIFF_DIR)/ts-harness.log 2>&1 || ts=$$?; \
	kill $$beating 2> /dev/null; \
	say "2/3 Go harness, output in $(PORT_DIFF_DIR)/go-harness.log"; \
	beat "2/3 Go" go $(port_diff_go_cases) & beating=$$!; \
	(cd $(GODIR) && DUMP_MODEL=$(PORT_DIFF_DIR) $(GOTEST) -run "/model-case" ./...) \
	  > $(PORT_DIFF_DIR)/go-harness.log 2>&1 || go=$$?; \
	kill $$beating 2> /dev/null; \
	say "3/3 comparing"; \
	node scripts/port-diff.js $(PORT_DIFF_DIR) --ts-only=$(port_diff_ts_only) $(PORT_DIFF_FLAGS) || diff=$$?; \
	[ $$ts = 0 ] || say "the TS harness exited $$ts; see $(PORT_DIFF_DIR)/ts-harness.log"; \
	[ $$go = 0 ] || say "the Go harness exited $$go; see $(PORT_DIFF_DIR)/go-harness.log"; \
	[ $$ts = 0 ] && [ $$go = 0 ] && [ $$diff = 0 ]

# Pull the latest published github.com/voxgig/apidef/go and refresh go.sum.
update-apidef:
	cd $(GODIR) && $(GO) get -u github.com/voxgig/apidef/go@latest && $(GO) mod tidy

tidy:
	cd $(GODIR) && $(GO) mod tidy

clean:
	cd $(GODIR) && $(GO) clean -testcache
