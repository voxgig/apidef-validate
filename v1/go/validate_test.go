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

// Mirrors the TS case list in test/main.test.ts, MINUS its GraphQL cases:
// the Go apidef module has no GraphQL ingestion (no strategy dispatch, no SDL
// parser), so a graphql case here could only fail. Add them together with the
// Go port, not before it — and drop this note when they are in sync again.
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
		if apidef.VERSION == "" {
			t.Fatal("apidef.VERSION is empty")
		}
		t.Logf("apidef.VERSION=%s", apidef.VERSION)
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
				main, ok := result.ApiModel["main"].(map[string]any)
				if !ok {
					t.Fatal("model main must be a map")
				}
				kit, ok := main[apidef.KIT].(map[string]any)
				if !ok {
					t.Fatal("model kit must be a map")
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

				t.Logf("%s: model OK, %d entities, steps=%v",
					fullName(c), len(entities), result.Steps)
			})
		}
	})
}
