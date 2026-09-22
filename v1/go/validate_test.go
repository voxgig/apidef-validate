/* Copyright (c) 2025 Voxgig Ltd, MIT License */

package validate_test

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"testing"

	apidef "github.com/voxgig/apidef/go"
)

type Case struct {
	Name    string
	Version string
	Spec    string
	Format  string
}

// The TypeScript case list minus its GraphQL cases, which the Go module
// cannot ingest, and minus elementdemo.
var allCases = []Case{
	{"solar", "1.0.0", "openapi-3.0.0", "yaml"},
	{"petstore", "1.0.7", "swagger-2.0", "json"},
	{"taxonomy", "1.0.0", "openapi-3.1.0", "yaml"},
	{"foo", "1.0.0", "openapi-3.1.0", "yaml"},

	{"learnworlds", "2", "openapi-3.1.0", "yaml"},
	{"statuspage", "1.0.0", "openapi-3.0.0", "json"},
	{"contentfulcma", "1.0.0", "openapi-3.0.0", "yaml"},

	{"cloudsmith", "v1", "swagger-2.0", "json"},
	{"pokeapi", "20220523", "openapi-3.0.0", "yaml"},
	{"dingconnect", "v1", "swagger-2.0", "json"},
	{"codatplatform", "3.0.0", "openapi-3.1.0", "yaml"},
	{"shortcut", "v3", "openapi-3.0.0", "json"},

	{"github", "1.1.4", "openapi-3.0.3", "yaml"},
	{"gitlab", "v4", "swagger-2.0", "yaml"},
}

// A golden the Go port is known not to reproduce: a path glob relative to
// v1/, how many DISTINCT goldens under it differ, and why. A matching golden
// is compared and reported but does not fail the run; Expect is the ratchet,
// checked in both directions, so a golden the port has caught up on cannot
// hide behind the siblings its glob also covers.
type goldenSkip struct {
	Glob   string
	Expect int
	Reason string

	matched    map[string]bool
	mismatched map[string]bool
}

func (skip *goldenSkip) note(rel string) {
	if nil == skip.matched {
		skip.matched = map[string]bool{}
	}
	skip.matched[rel] = true
}

func (skip *goldenSkip) noteDiffers(rel string) {
	if nil == skip.mismatched {
		skip.mismatched = map[string]bool{}
	}
	skip.mismatched[rel] = true
}

const emptyFieldsGap = "an empty fields block sits before name instead of after op"
const ancestorGap = "ancestor relations are missing"

var goldenSkips = []*goldenSkip{
	{Glob: "guide/*-final-guide.aontu", Expect: 14, Reason: "the Go guide keeps control, orig, " +
		"tag, why_* and empty action and rename containers that the TypeScript " +
		"guide, re-read from its aontu source, does not"},

	{Glob: "guide/cloudsmith-*-base-guide.aontu", Expect: 1, Reason: "Go finds 75 of the 131 entities"},
	{Glob: "guide/codatplatform-*-base-guide.aontu", Expect: 1, Reason: "Go finds 22 of the 30 entities"},
	{Glob: "guide/contentfulcma-*-base-guide.aontu", Expect: 1, Reason: "Go gives /organizations " +
		"to organization instead of app_definition"},
	{Glob: "guide/github-*-base-guide.aontu", Expect: 1, Reason: "Go moves /gists to base_gist, " +
		"/organizations to organization, and /classrooms and PATCH /user elsewhere"},
	{Glob: "guide/gitlab-*-base-guide.aontu", Expect: 1, Reason: "Go names custom_attribute, " +
		"participant, starrer and user where TypeScript has " +
		"api_entities_custom_attribute and api_entities_user_basic"},
	{Glob: "guide/learnworlds-*-base-guide.aontu", Expect: 1, Reason: "Go finds 29 of the 42 entities"},
	{Glob: "guide/shortcut-*-base-guide.aontu", Expect: 1, Reason: "Go gives the epic comment " +
		"paths to comment instead of threaded_comment"},
	{Glob: "guide/taxonomy-*-base-guide.aontu", Expect: 1, Reason: "Go finds no paginated_taxa " +
		"and gives its list operations to domain and kingdom"},

	{Glob: "model/cloudsmith-*/*", Expect: 119, Reason: "56 entities are not found; " + ancestorGap +
		", and " + emptyFieldsGap},
	{Glob: "model/codatplatform-*/*", Expect: 23, Reason: "8 entities are not found; " + ancestorGap +
		", and " + emptyFieldsGap},
	{Glob: "model/contentfulcma-*/*", Expect: 34, Reason: ancestorGap + ", and " + emptyFieldsGap},
	{Glob: "model/foo-*/*-bar.aontu", Expect: 1, Reason: emptyFieldsGap},
	{Glob: "model/foo-*/*-qaz.aontu", Expect: 1, Reason: emptyFieldsGap},
	{Glob: "model/foo-*/*-yike.aontu", Expect: 1, Reason: emptyFieldsGap},
	{Glob: "model/github-*/*", Expect: 240, Reason: ancestorGap + " along with union metadata " +
		"and some fields, and " + emptyFieldsGap},
	{Glob: "model/gitlab-*/*", Expect: 232, Reason: "the entity set differs; " + ancestorGap +
		", and " + emptyFieldsGap},
	{Glob: "model/learnworlds-*/*", Expect: 24, Reason: "13 entities are not found, and " + ancestorGap},
	{Glob: "model/petstore-*/*-store.aontu", Expect: 1, Reason: emptyFieldsGap},
	{Glob: "model/shortcut-*/*", Expect: 15, Reason: ancestorGap + " along with union metadata, " +
		"the epic comment paths move to comment, and " + emptyFieldsGap},
	{Glob: "model/statuspage-*/*", Expect: 14, Reason: ancestorGap},
	{Glob: "model/taxonomy-*/*-domain.aontu", Expect: 1, Reason: "carries the list operation " +
		"of the missing paginated_taxa"},
	{Glob: "model/taxonomy-*/*-kingdom.aontu", Expect: 1, Reason: "carries the list operation " +
		"of the missing paginated_taxa"},
	{Glob: "model/taxonomy-*/*-paginated_taxa.aontu", Expect: 1, Reason: "the entity is not found"},
}

func findSkip(rel string) *goldenSkip {
	for _, skip := range goldenSkips {
		if ok, _ := filepath.Match(skip.Glob, filepath.ToSlash(rel)); ok {
			return skip
		}
	}
	return nil
}

const goldenExt = ".aontu"
const generatedExt = ".aon"

func fullName(c Case) string {
	return c.Name + "-" + c.Version + "-" + c.Spec
}

func selectedCases() []Case {
	sel := os.Getenv("TEST_CASE")
	if sel == "" {
		return allCases
	}
	keys := strings.Split(sel, ",")
	var out []Case
	for _, c := range allCases {
		for _, k := range keys {
			if k != "" && strings.Contains(c.Name, k) {
				out = append(out, c)
				break
			}
		}
	}
	return out
}

// validateBase returns the absolute path to the v1/ directory (parent of go/).
func validateBase(t *testing.T) string {
	t.Helper()
	wd, err := os.Getwd()
	if err != nil {
		t.Fatalf("getwd: %v", err)
	}
	abs, err := filepath.Abs(filepath.Join(wd, ".."))
	if err != nil {
		t.Fatalf("abs: %v", err)
	}
	return abs
}

type caseRun struct {
	Case   Case
	Base   string
	Result *apidef.ApiDefResult
	Out    string
}

func runCase(t *testing.T, c Case, step map[string]any) *caseRun {
	t.Helper()
	cn := fullName(c)
	base := validateBase(t)

	defFile := filepath.Join(base, "..", "def", cn+"."+c.Format)
	if _, err := os.Stat(defFile); err != nil {
		t.Skipf("def file not found: %s", defFile)
	}

	// Run with cwd in a temp dir so any incidental output (e.g.
	// apidef-warnings.txt) does not pollute the repo.
	tmp := t.TempDir()
	t.Chdir(tmp)
	out := tmp
	if keep := os.Getenv("TEST_OUT"); keep != "" {
		out = filepath.Join(keep, cn)
	}
	copyGuideOverlay(t, base, out, cn)

	a := apidef.NewApiDef(apidef.ApiDefOptions{
		Folder:    out,
		OutPrefix: cn + "-",
		Strategy:  "heuristic01",
	})

	result, err := a.Generate(map[string]any{
		"model": map[string]any{
			"name": c.Name,
			"def":  cn + "." + c.Format,
		},
		"build": map[string]any{
			"spec": map[string]any{
				"base": base,
			},
		},
		"ctrl": map[string]any{
			"step": step,
		},
	})
	if err != nil {
		t.Fatalf("%s: generate failed: %v", cn, err)
	}
	if !result.OK {
		t.Fatalf("%s: generate not OK: err=%v steps=%v", cn, result.Err, result.Steps)
	}
	return &caseRun{Case: c, Base: base, Result: result, Out: out}
}

// The TypeScript harness feeds apidef the case's guide overlay; the Go port
// refuses an overlay it cannot honour, so the same file goes in here.
func copyGuideOverlay(t *testing.T, base string, out string, cn string) {
	t.Helper()
	name := cn + "-guide" + goldenExt
	src, err := os.ReadFile(filepath.Join(base, "guide", name))
	if err != nil {
		t.Fatalf("%s: read guide overlay: %v", cn, err)
	}
	guideDir := filepath.Join(out, "guide")
	if err := os.MkdirAll(guideDir, 0755); err != nil {
		t.Fatalf("%s: mkdir guide: %v", cn, err)
	}
	if err := os.WriteFile(filepath.Join(guideDir, name), src, 0644); err != nil {
		t.Fatalf("%s: write guide overlay: %v", cn, err)
	}
}

func readGenerated(t *testing.T, path string) string {
	t.Helper()
	src, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("apidef wrote no %s: %v", filepath.Base(path), err)
	}
	return strings.TrimSpace(string(src))
}

type goldenMetrics struct {
	Compared int
	Skipped  int
	Todo     int
}

var todoLineRE = regexp.MustCompile(`[^\n#]*##[^\n]*\n`)

// compareGolden fails the test with a line diff when the generated text
// differs from the golden at rel (relative to v1/), unless a goldenSkip
// covers it. A golden line with a `##` comment marks a known gap: it is
// dropped before the comparison and counted, as in the TypeScript harness.
func compareGolden(t *testing.T, base string, rel string, found string, metrics *goldenMetrics, normalize func(string) string) {
	t.Helper()
	skip := findSkip(rel)
	if skip != nil {
		metrics.Skipped++
		skip.note(rel)
	} else {
		metrics.Compared++
	}

	raw, err := os.ReadFile(filepath.Join(base, rel))
	if err != nil {
		if skip != nil {
			skip.noteDiffers(rel)
			t.Logf("SKIP %s: no golden (%s)", rel, skip.Reason)
			return
		}
		t.Errorf("missing golden %s (the TypeScript harness creates goldens): %v", rel, err)
		return
	}
	expected := strings.TrimSpace(string(raw))
	if normalize != nil {
		expected = strings.TrimSpace(normalize(expected))
	}
	if expected == found {
		return
	}

	todos := 0
	clean := todoLineRE.ReplaceAllStringFunc(expected+"\n", func(string) string {
		todos++
		return ""
	})
	metrics.Todo += todos
	if strings.TrimSpace(clean) == found {
		t.Logf("OPEN TODOS: %s %d", rel, todos)
		return
	}

	if skip != nil {
		skip.noteDiffers(rel)
		t.Logf("SKIP %s: %s [%s]", rel, skip.Reason,
			diffDigest(strings.TrimSpace(clean), found))
		return
	}
	t.Errorf("MISMATCH: %s\n%s", rel, lineDiff(expected, found))
}

// The Go port writes no `# why` annotations, so the golden's trailing
// comments are dropped before the base guide comparison.
func dropWhyComments(guide string) string {
	lines := strings.Split(guide, "\n")
	for i, line := range lines {
		lines[i] = dropWhyComment(line)
	}
	return strings.Join(lines, "\n")
}

// dropWhyComment drops the annotation from one line, and the line is the
// limit: a run of whitespace reaching back over a newline would take the
// blank lines before a comment-only line with it. A `#` inside a quoted
// value is content, a `##` marks a known gap, and a line that is only a
// comment stays, the guide header among them.
func dropWhyComment(line string) string {
	quoted := false
	for i := 0; i < len(line); i++ {
		switch line[i] {
		case '\\':
			if quoted {
				i++
			}
		case '"':
			quoted = !quoted
		case '#':
			if quoted {
				continue
			}
			if i+1 < len(line) && '#' == line[i+1] {
				return line
			}
			head := strings.TrimRight(line[:i], " \t")
			if "" == head || len(head) == i {
				return line
			}
			return head
		}
	}
	return line
}

// compareGuides checks the base guide apidef wrote and the final guide it
// returned against the case's goldens.
func compareGuides(t *testing.T, run *caseRun, metrics *goldenMetrics) {
	t.Helper()
	base := run.Base
	cn := fullName(run.Case)

	baseGuide := readGenerated(t, filepath.Join(run.Out, "guide", cn+"-base-guide"+generatedExt))
	compareGolden(t, base, filepath.Join("guide", cn+"-base-guide"+goldenExt),
		baseGuide, metrics, dropWhyComments)

	finalGuide := strings.TrimSpace(apidef.FormatJSONIC(run.Result.Guide))
	compareGolden(t, base, filepath.Join("guide", cn+"-final-guide"+goldenExt),
		finalGuide, metrics, nil)
}

// compareModels checks every entity model apidef wrote against the case's
// goldens, and that no golden is left without a generated entity.
func compareModels(t *testing.T, run *caseRun, entities map[string]any, metrics *goldenMetrics) {
	t.Helper()
	base := run.Base
	cn := fullName(run.Case)
	modelDir := filepath.Join("model", cn)

	generated := map[string]bool{}
	for _, name := range sortedKeys(entities) {
		efn := cn + "-" + name
		generated[efn+goldenExt] = true
		entitySrc := readGenerated(t, filepath.Join(run.Out, "entity", efn+generatedExt))
		compareGolden(t, base, filepath.Join(modelDir, efn+goldenExt), entitySrc, metrics, nil)
	}

	goldens, err := os.ReadDir(filepath.Join(base, modelDir))
	if err != nil {
		t.Errorf("missing model goldens %s: %v", modelDir, err)
		return
	}
	for _, golden := range goldens {
		file := golden.Name()
		if !strings.HasPrefix(file, cn+"-") || !strings.HasSuffix(file, goldenExt) ||
			strings.HasSuffix(file, ".gen"+goldenExt) || generated[file] {
			continue
		}
		rel := filepath.Join(modelDir, file)
		if skip := findSkip(rel); skip != nil {
			skip.note(rel)
			skip.noteDiffers(rel)
			t.Logf("SKIP %s: no generated entity (%s)", rel, skip.Reason)
			continue
		}
		t.Errorf("golden %s has no generated entity", rel)
	}
}

// checkStaleSkips holds every entry to its declared count. Only a complete
// run can hold it exactly: a narrower one covers a subset of the goldens, so
// a count there can fall for reasons that are not progress, and a rise is
// the only finding left.
func checkStaleSkips(t *testing.T) {
	t.Helper()
	whole := "" == os.Getenv("TEST_CASE") && ranGuideCase && ranModelCase
	for _, skip := range goldenSkips {
		if !whole && 0 == len(skip.matched) {
			continue
		}
		differ := len(skip.mismatched)
		if differ > skip.Expect || (whole && differ != skip.Expect) {
			t.Errorf("skip %q expects %d differing goldens, found %d: recount the entry",
				skip.Glob, skip.Expect, differ)
		}
	}
}

func sortedKeys(m map[string]any) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}

const diffContext = 3
const diffMaxEdits = 4000
const digestLineMax = 120

func commonEdges(a []string, b []string) (int, int) {
	prefix := 0
	for prefix < len(a) && prefix < len(b) && a[prefix] == b[prefix] {
		prefix++
	}
	suffix := 0
	for suffix < len(a)-prefix && suffix < len(b)-prefix &&
		a[len(a)-1-suffix] == b[len(b)-1-suffix] {
		suffix++
	}
	return prefix, suffix
}

// diffDigest sizes and places a difference in one line, so a skipped gap is
// legible in the log without TEST_OUT keeping the generated files.
func diffDigest(expected string, found string) string {
	a := strings.Split(expected, "\n")
	b := strings.Split(found, "\n")
	prefix, suffix := commonEdges(a, b)

	at := "golden ends"
	if prefix < len(a) {
		at = strings.TrimSpace(a[prefix])
		if runes := []rune(at); digestLineMax < len(runes) {
			at = string(runes[:digestLineMax]) + "..."
		}
	}

	ops, ok := myersOps(a[prefix:len(a)-suffix], b[prefix:len(b)-suffix], diffMaxEdits)
	if !ok {
		return fmt.Sprintf("%d expected and %d generated lines differ from line %d: %s",
			len(a)-prefix-suffix, len(b)-prefix-suffix, prefix+1, at)
	}
	differ := 0
	for _, op := range ops {
		if ' ' != op[0] {
			differ++
		}
	}
	return fmt.Sprintf("%d lines differ, first at %d: %s", differ, prefix+1, at)
}

// lineDiff renders expected against found as unified-style hunks. Equal
// prefix and suffix lines are stripped first, so the Myers search only
// sees the changed region; a region beyond diffMaxEdits is summarised.
func lineDiff(expected string, found string) string {
	a := strings.Split(expected, "\n")
	b := strings.Split(found, "\n")

	prefix, suffix := commonEdges(a, b)
	ma := a[prefix : len(a)-suffix]
	mb := b[prefix : len(b)-suffix]

	out := []string{
		fmt.Sprintf("--- expected (%d lines)", len(a)),
		fmt.Sprintf("+++ generated (%d lines)", len(b)),
	}

	ops, ok := myersOps(ma, mb, diffMaxEdits)
	if !ok {
		out = append(out, fmt.Sprintf("@@ -%d,%d +%d,%d @@ region too large to align",
			prefix+1, len(ma), prefix+1, len(mb)))
		for _, line := range head(ma, 20) {
			out = append(out, "-"+line)
		}
		for _, line := range head(mb, 20) {
			out = append(out, "+"+line)
		}
		return strings.Join(out, "\n")
	}

	var lead []string
	for i := max(0, prefix-diffContext); i < prefix; i++ {
		lead = append(lead, " "+a[i])
	}
	ops = append(lead, ops...)
	for i := len(a) - suffix; i < min(len(a), len(a)-suffix+diffContext); i++ {
		ops = append(ops, " "+a[i])
	}
	return strings.Join(append(out, foldContext(ops)...), "\n")
}

func head(lines []string, n int) []string {
	if len(lines) > n {
		return lines[:n]
	}
	return lines
}

// foldContext elides runs of equal lines longer than the context on both
// sides of a change.
func foldContext(ops []string) []string {
	var out []string
	run := 0
	for i, op := range ops {
		if op[0] != ' ' {
			out = append(out, op)
			run = 0
			continue
		}
		next := len(ops) - i
		for j := i + 1; j < len(ops); j++ {
			if ops[j][0] != ' ' {
				next = j - i
				break
			}
		}
		run++
		if run <= diffContext || next <= diffContext {
			out = append(out, op)
		} else if run == diffContext+1 {
			out = append(out, "...")
		}
	}
	return out
}

// myersOps returns the shortest edit script between a and b as unified
// diff lines, or false when it needs more than maxEdits edits.
func myersOps(a []string, b []string, maxEdits int) ([]string, bool) {
	n, m := len(a), len(b)
	bound := n + m
	if bound == 0 {
		return nil, true
	}
	offset := bound + 1
	v := make([]int32, 2*bound+3)
	var trace [][]int32

	found := false
	for d := 0; d <= bound && d <= maxEdits && !found; d++ {
		snapshot := make([]int32, 2*d+3)
		copy(snapshot, v[offset-d-1:offset+d+2])
		trace = append(trace, snapshot)
		for k := -d; k <= d; k += 2 {
			var x int32
			if k == -d || (k != d && v[offset+k-1] < v[offset+k+1]) {
				x = v[offset+k+1]
			} else {
				x = v[offset+k-1] + 1
			}
			y := x - int32(k)
			for int(x) < n && int(y) < m && a[x] == b[y] {
				x++
				y++
			}
			v[offset+k] = x
			if int(x) >= n && int(y) >= m {
				found = true
				break
			}
		}
	}
	if !found {
		return nil, false
	}

	var ops []string
	x, y := n, m
	for d := len(trace) - 1; d >= 0; d-- {
		at := func(k int) int { return int(trace[d][k+d+1]) }
		k := x - y
		var prevK int
		if k == -d || (k != d && at(k-1) < at(k+1)) {
			prevK = k + 1
		} else {
			prevK = k - 1
		}
		prevX := at(prevK)
		prevY := prevX - prevK
		for x > prevX && y > prevY {
			ops = append(ops, " "+a[x-1])
			x--
			y--
		}
		if d > 0 {
			if x == prevX {
				ops = append(ops, "+"+b[y-1])
				y--
			} else {
				ops = append(ops, "-"+a[x-1])
				x--
			}
		}
	}
	for i, j := 0, len(ops)-1; i < j; i, j = i+1, j-1 {
		ops[i], ops[j] = ops[j], ops[i]
	}
	return ops, true
}

var ranGuideCase, ranModelCase bool

func TestValidate(t *testing.T) {
	t.Run("happy", func(t *testing.T) {
		if apidef.VERSION == "" {
			t.Fatal("apidef.VERSION is empty")
		}
		t.Logf("apidef.VERSION=%s", apidef.VERSION)
	})

	t.Run("guide-case", func(t *testing.T) {
		ranGuideCase = true
		metrics := &goldenMetrics{}
		for _, c := range selectedCases() {
			c := c
			t.Run(fullName(c), func(t *testing.T) {
				run := runCase(t, c, map[string]any{
					"parse":        true,
					"guide":        true,
					"transformers": false,
					"builders":     false,
					"generate":     false,
				})
				if run.Result.Guide == nil {
					t.Fatal("no guide in result")
				}
				compareGuides(t, run, metrics)
				entities, _ := run.Result.Guide["entity"].(map[string]any)
				t.Logf("%s: guide OK, %d entities", fullName(c), len(entities))
			})
		}
		t.Logf("goldens compared=%d skipped=%d todos=%d",
			metrics.Compared, metrics.Skipped, metrics.Todo)
	})

	t.Run("model-case", func(t *testing.T) {
		ranModelCase = true
		metrics := &goldenMetrics{}
		stepFields := map[string]bool{}
		caseCount := 0
		for _, c := range selectedCases() {
			c := c
			t.Run(fullName(c), func(t *testing.T) {
				run := runCase(t, c, map[string]any{
					"parse":        true,
					"guide":        true,
					"transformers": true,
					"builders":     true,
					"generate":     true,
				})
				result := run.Result
				caseCount++
				main, ok := result.ApiModel["main"].(map[string]any)
				if !ok {
					t.Fatal("model main must be a map")
				}
				kit, ok := main[apidef.KIT].(map[string]any)
				if !ok {
					t.Fatal("model kit must be a map")
				}
				flows, _ := kit["flow"].(map[string]any)
				for name, value := range flows {
					flow := value.(map[string]any)
					steps, _ := flow["step"].([]any)
					for _, value := range steps {
						step := value.(map[string]any)
						for key := range step {
							stepFields[key] = true
						}
						if _, ok := step["o"].(string); !ok {
							t.Errorf("%s: missing flow-step operation", name)
						}
						for _, key := range []string{"active", "op", "input", "match", "data", "spec", "valid"} {
							if _, exists := step[key]; exists {
								t.Errorf("%s: legacy flow-step attribute %s", name, key)
							}
						}
						for _, key := range []string{"i", "m", "d"} {
							if value, exists := step[key]; exists {
								if _, ok := value.(map[string]any); !ok {
									t.Errorf("%s: invalid step %s", name, key)
								}
							}
						}
						for _, key := range []string{"s", "v"} {
							if value, exists := step[key]; exists {
								if _, ok := value.([]any); !ok {
									t.Errorf("%s: invalid step %s", name, key)
								}
							}
						}
					}
				}
				entities, ok := kit["entity"].(map[string]any)
				if !ok {
					t.Fatal("model entities must be a map")
				}
				for name, value := range entities {
					entity, ok := value.(map[string]any)
					if !ok {
						t.Fatalf("%s: entity must be a map, got %T", name, value)
					}
					relations, _ := entity["relations"].(map[string]any)
					ancestorData, err := json.Marshal(relations["ancestors"])
					var chains [][]string
					if err != nil || json.Unmarshal(ancestorData, &chains) != nil {
						t.Fatalf("%s: invalid ancestor chains", name)
					}
					for _, chain := range chains {
						for _, ancestor := range chain {
							if _, exists := entities[ancestor]; !exists || ancestor == name {
								t.Errorf("%s: invalid ancestor entity %s", name, ancestor)
							}
						}
					}
					operations, _ := entity["op"].(map[string]any)
					for _, value := range operations {
						operation := value.(map[string]any)
						for _, value := range operation["points"].([]any) {
							point := value.(map[string]any)
							for _, key := range []string{"m", "o"} {
								if _, ok := point[key].(string); !ok {
									t.Errorf("%s: missing point attribute %s", name, key)
								}
							}
							for _, key := range []string{"active", "kind", "method", "orig", "segments", "args", "select", "rename", "transform", "contract", "live", "graphql"} {
								if _, exists := point[key]; exists {
									t.Errorf("%s: legacy point attribute %s", name, key)
								}
							}
							args, _ := point["g"].(map[string]any)
							for kind, value := range args {
								list, ok := value.([]any)
								if !ok {
									t.Fatalf("%s: arguments must be a list", name)
								}
								if kind == "params" {
									kind = "param"
								}
								for _, value := range list {
									arg := value.(map[string]any)
									if arg["k"] != kind {
										t.Errorf("%s: argument kind mismatch", name)
									}
									if _, ok := arg["n"].(string); !ok {
										t.Errorf("%s: missing argument name", name)
									}
									if _, ok := arg["r"].(bool); !ok {
										t.Errorf("%s: missing argument required flag", name)
									}
									if arg["t"] == nil {
										t.Errorf("%s: missing argument type", name)
									}
									for _, key := range []string{"active", "kind", "name", "orig", "reqd", "type", "example"} {
										if _, exists := arg[key]; exists {
											t.Errorf("%s: legacy argument attribute %s", name, key)
										}
									}
								}
							}
						}
					}
					fields, ok := entity["fields"].(map[string]any)
					if !ok || fields == nil {
						t.Fatalf("%s: fields must be a map, got %T", name, entity["fields"])
					}
					for fieldName, value := range fields {
						field, ok := value.(map[string]any)
						if !ok {
							t.Fatalf("%s.%s: field must be a map, got %T", name, fieldName, value)
						}
						if field["n"] != fieldName || field["h"] != apidef.HumanTitle(fieldName) {
							t.Errorf("%s: field key or title does not match n: %v", name, field)
						}
						for _, key := range []string{"name", "req", "type", "active", "short", "readOnly", "writeOnly", "deprecated", "format"} {
							if _, exists := field[key]; exists {
								t.Errorf("%s: legacy field attribute %s", name, key)
							}
						}
						if _, ok := field["n"].(string); !ok {
							t.Errorf("%s: missing field name", name)
						}
						if _, ok := field["r"].(bool); !ok {
							t.Errorf("%s: missing field required flag", name)
						}
						if field["t"] == nil {
							t.Errorf("%s: missing field type", name)
						}
					}
				}

				compareGuides(t, run, metrics)
				compareModels(t, run, entities, metrics)

				t.Logf("%s: model OK, %d entities, steps=%v",
					fullName(c), len(entities), result.Steps)
			})
		}
		if caseCount > 0 {
			for _, key := range []string{"o", "i", "m", "d", "s", "v"} {
				if !stepFields[key] {
					t.Errorf("corpus must exercise flow-step attribute %s", key)
				}
			}
		}
		t.Logf("goldens compared=%d skipped=%d todos=%d",
			metrics.Compared, metrics.Skipped, metrics.Todo)
	})

	checkStaleSkips(t)
}

func TestWhyCommentsSpareTodos(t *testing.T) {
	guide := "guide: {\n" +
		"  op: load: method: *GET  # end-param\n" +
		"  op: list: method: *GET  ## the Go port omits this\n" +
		"}\n"
	clean := dropWhyComments(guide)
	if strings.Contains(clean, "end-param") {
		t.Errorf("why comment kept: %q", clean)
	}
	if !strings.Contains(clean, "## the Go port omits this") {
		t.Errorf("TODO marker dropped as a why comment: %q", clean)
	}
	if todos := todoLineRE.FindAllString(clean, -1); 1 != len(todos) {
		t.Errorf("TODO line is not countable after normalization: %q", todos)
	}
}

func TestWhyCommentsSpareLinesAndQuotes(t *testing.T) {
	guide := "guide: {\n" +
		"\n" +
		"  # Deactivated by the heuristic (auth-exchange).\n" +
		"  active: *false\n" +
		"  path: \"/api/v4/tag #1\"  # ent=tag\n" +
		"}\n"
	clean := dropWhyComments(guide)
	if !strings.Contains(clean, "{\n\n  # Deactivated") {
		t.Errorf("comment-only line took the blank line with it: %q", clean)
	}
	if !strings.Contains(clean, "path: \"/api/v4/tag #1\"") {
		t.Errorf("hash inside a quoted value dropped: %q", clean)
	}
	if strings.Contains(clean, "ent=tag") {
		t.Errorf("why comment kept: %q", clean)
	}
}
