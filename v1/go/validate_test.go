/* Copyright (c) 2025 Voxgig Ltd, MIT License */

package validate_test

import (
	"os"
	"path/filepath"
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

// Mirrors the TS case list in test/main.test.ts.
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

func runCase(t *testing.T, c Case, step map[string]any) *apidef.ApiDefResult {
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

	a := apidef.NewApiDef(apidef.ApiDefOptions{
		Folder:    tmp,
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
	return result
}

func TestValidate(t *testing.T) {
	t.Run("happy", func(t *testing.T) {
		if apidef.Version == "" {
			t.Fatal("apidef.Version is empty")
		}
		t.Logf("apidef.Version=%s", apidef.Version)
	})

	t.Run("guide-case", func(t *testing.T) {
		for _, c := range selectedCases() {
			c := c
			t.Run(fullName(c), func(t *testing.T) {
				result := runCase(t, c, map[string]any{
					"parse":        true,
					"guide":        true,
					"transformers": false,
					"builders":     false,
					"generate":     false,
				})
				if result.Guide == nil {
					t.Fatal("no guide in result")
				}
				entities, _ := result.Guide["entity"].(map[string]any)
				t.Logf("%s: guide OK, %d entities", fullName(c), len(entities))
			})
		}
	})

	t.Run("model-case", func(t *testing.T) {
		for _, c := range selectedCases() {
			c := c
			t.Run(fullName(c), func(t *testing.T) {
				result := runCase(t, c, map[string]any{
					"parse":        true,
					"guide":        true,
					"transformers": true,
					"builders":     true,
					"generate":     true,
				})
				main, _ := result.ApiModel["main"].(map[string]any)
				kit, _ := main[apidef.KIT].(map[string]any)
				entities, _ := kit["entity"].(map[string]any)
				t.Logf("%s: model OK, %d entities, steps=%v",
					fullName(c), len(entities), result.Steps)
			})
		}
	})
}
