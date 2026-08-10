"use strict";
/* Copyright (c) 2025 Voxgig Ltd, MIT License */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Fs = __importStar(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const apidef_1 = require("@voxgig/apidef");
const __1 = require("../..");
function isGraphql(c) {
    return 'graphql' === c.spec;
}
// See the note on the same check in test/main.test.ts.
function graphqlCapable() {
    try {
        return Fs.readFileSync(require.resolve('@voxgig/apidef/model/apidef.aontu'), 'utf8')
            .includes("'graphql'");
    }
    catch (err) {
        return false;
    }
}
const GRAPHQL_CAPABLE = graphqlCapable();
const TOP_FOLDER = node_path_1.default.join(__dirname, '..');
let cases = [
    { name: 'solar', version: '1.0.0', spec: 'openapi-3.0.0', format: 'yaml' },
    { name: 'petstore', version: '1.0.7', spec: 'swagger-2.0', format: 'json' },
    { name: 'taxonomy', version: '1.0.0', spec: 'openapi-3.1.0', format: 'yaml' },
    { name: 'foo', version: '1.0.0', spec: 'openapi-3.1.0', format: 'yaml' },
    { name: 'learnworlds', version: '2', spec: 'openapi-3.1.0', format: 'yaml' },
    { name: 'statuspage', version: '1.0.0', spec: 'openapi-3.0.0', format: 'json' },
    { name: 'contentfulcma', version: '1.0.0', spec: 'openapi-3.0.0', format: 'yaml' },
    { name: 'cloudsmith', version: 'v1', spec: 'swagger-2.0', format: 'json' },
    { name: 'pokeapi', version: '20220523', spec: 'openapi-3.0.0', format: 'yaml' },
    { name: 'dingconnect', version: 'v1', spec: 'swagger-2.0', format: 'json' },
    { name: 'codatplatform', version: '3.0.0', spec: 'openapi-3.1.0', format: 'yaml' },
    { name: 'shortcut', version: 'v3', spec: 'openapi-3.0.0', format: 'json' },
    { name: 'github', version: '1.1.4', spec: 'openapi-3.0.3', format: 'yaml' },
    { name: 'gitlab', version: 'v4', spec: 'swagger-2.0', format: 'yaml' },
    // GraphQL. Skipped automatically when the installed @voxgig/apidef predates
    // GraphQL ingestion; see GRAPHQL_CAPABLE below.
    {
        name: 'linear', version: '2026.08', spec: 'graphql', format: 'graphql',
        endpoint: 'https://api.linear.app/graphql',
    },
    // GitHub's GraphQL API, alongside its OpenAPI def above: the one API in
    // this corpus present in both formats, so the two models can be compared.
    // Its mutations are overwhelmingly commands rather than CRUD, which is
    // what exercises action folding at scale.
    {
        name: 'github', version: '2026.08', spec: 'graphql', format: 'graphql',
        endpoint: 'https://api.github.com/graphql',
    },
    // Shopify's Storefront API, supplied as INTROSPECTION JSON rather than
    // SDL — the only case exercising that parser branch. Its query root is
    // named QueryRoot, not Query, which a schema-literal reading would miss.
    {
        name: 'shopifystorefront', version: '2026.04', spec: 'graphql',
        format: 'json',
        endpoint: 'https://example.myshopify.com/api/2026-04/graphql.json',
    },
];
const caseSelector = (process.env.TEST_CASE ?? '').split(',').filter(Boolean);
if (0 < caseSelector.length) {
    cases = cases.filter(c => 0 < caseSelector.filter(cs => c.name.includes(cs)).length);
}
if (!GRAPHQL_CAPABLE) {
    cases = cases.filter(c => !isGraphql(c));
}
function fullname(c) {
    return `${c.name}-${c.version}-${c.spec}`;
}
function prepfs() {
    const vol = { 'model': { 'guide': {} } };
    return (0, __1.makefs)(vol);
}
async function prepCaseGuide(c, fs) {
    const guideFileName = fullname(c) + '-guide.aontu';
    const realGuideFilePath = node_path_1.default.join(TOP_FOLDER, 'guide', guideFileName);
    const virtualGuideFilePath = node_path_1.default.join('/model', 'guide', guideFileName);
    let guideFileSrc = '';
    if (fs.existsSync(realGuideFilePath)) {
        guideFileSrc = fs.readFileSync(realGuideFilePath).toString('utf8');
    }
    else {
        guideFileSrc = `
@"@voxgig/apidef/model/guide.aontu"

@"${fullname(c)}-base-guide.aontu"

guide:{}
`;
        fs.writeFileSync(realGuideFilePath, guideFileSrc);
    }
    fs.writeFileSync(virtualGuideFilePath, guideFileSrc);
}
async function makeBuild(c, fs) {
    const buildSpec = {
        folder: '/model',
        debug: 'debug',
        outprefix: fullname(c) + '-',
        why: { show: true },
        fs,
    };
    if (isGraphql(c)) {
        buildSpec.kind = 'GraphQL';
        buildSpec.endpoint = c.endpoint;
    }
    return apidef_1.ApiDef.makeBuild(buildSpec);
}
async function runBuild(c, build, step) {
    const model = { name: c.name, def: fullname(c) + '.' + c.format };
    const spec = {
        spec: {
            base: node_path_1.default.normalize(node_path_1.default.join(__dirname, '..')),
            buildargs: { apidef: { ctrl: { step } } },
        }
    };
    return build(model, spec, {});
}
async function timeOnce(c, step, requireOk) {
    const { fs } = prepfs();
    await prepCaseGuide(c, fs);
    const build = await makeBuild(c, fs);
    const t0 = Date.now();
    const bres = await runBuild(c, build, step);
    const t1 = Date.now();
    if (requireOk && !bres?.ok) {
        throw new Error(`build not ok for ${fullname(c)}: ${bres?.err?.message ?? ''}`);
    }
    if (!bres?.steps?.includes('parse')) {
        throw new Error(`parse step did not run for ${fullname(c)}`);
    }
    return t1 - t0;
}
async function main() {
    const PARSE_ONLY = {
        parse: true, guide: false, transformers: false, builders: false, generate: false,
    };
    const FULL = {
        parse: true, guide: true, transformers: true, builders: true, generate: true,
    };
    const REPS = Number(process.env.BENCH_REPS ?? '3');
    const rows = [];
    for (const c of cases) {
        const cfn = fullname(c);
        process.stderr.write(`benchmark: ${cfn}\n`);
        // Warm up once (JIT, fs cache) to reduce first-run skew.
        await timeOnce(c, FULL, true);
        const parseRuns = [];
        const totalRuns = [];
        for (let i = 0; i < REPS; i++) {
            parseRuns.push(await timeOnce(c, PARSE_ONLY, false));
            totalRuns.push(await timeOnce(c, FULL, true));
        }
        const parseMs = Math.min(...parseRuns);
        const totalMs = Math.min(...totalRuns);
        const modelMs = Math.max(0, totalMs - parseMs);
        rows.push({ case: cfn, parse: parseMs, model: modelMs, total: totalMs });
    }
    const w = (s, n) => String(s).padStart(n);
    const wL = (s, n) => String(s).padEnd(n);
    const caseW = Math.max(4, ...rows.map(r => r.case.length));
    const sep = `${'-'.repeat(caseW)}  ${'-'.repeat(10)}  ${'-'.repeat(10)}  ${'-'.repeat(10)}`;
    console.log();
    console.log(`${wL('case', caseW)}  ${w('parse(ms)', 10)}  ${w('model(ms)', 10)}  ${w('total(ms)', 10)}`);
    console.log(sep);
    let pSum = 0, mSum = 0, tSum = 0;
    for (const r of rows) {
        console.log(`${wL(r.case, caseW)}  ${w(r.parse, 10)}  ${w(r.model, 10)}  ${w(r.total, 10)}`);
        pSum += r.parse;
        mSum += r.model;
        tSum += r.total;
    }
    console.log(sep);
    console.log(`${wL('TOTAL', caseW)}  ${w(pSum, 10)}  ${w(mSum, 10)}  ${w(tSum, 10)}`);
}
main().catch(err => { console.error(err); process.exit(1); });
//# sourceMappingURL=bench.js.map