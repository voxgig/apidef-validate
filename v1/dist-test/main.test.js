"use strict";
/* Copyright (c) 2025 Voxgig Ltd, MIT License */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = __importDefault(require("node:path"));
const node_test_1 = require("node:test");
const code_1 = require("@hapi/code");
const apidef_1 = require("@voxgig/apidef");
const jostraca_1 = require("jostraca");
const __1 = require("../..");
const __2 = require("..");
const TOP_FOLDER = node_path_1.default.join(__dirname, '..');
let cases = [
    { name: 'solar', version: '1.0.0', spec: 'openapi-3.0.0', format: 'yaml' },
    { name: 'taxonomy', version: '1.0.0', spec: 'openapi-3.1.0', format: 'yaml' },
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
];
const caseSelector = (process.env.npm_config_case ?? '').split(',');
if (0 < caseSelector.length) {
    cases = cases.filter(c => 0 < caseSelector.filter(cs => c.name.includes(cs)).length);
}
(0, node_test_1.describe)('main', () => {
    (0, node_test_1.test)('happy', async () => {
        (0, code_1.expect)((0, __2.main)()).equal('main');
    });
    (0, node_test_1.test)('guide-case', async () => {
        const { fs, vol } = prepfs(cases);
        const fails = [];
        const testmetrics = {
            todo: 0
        };
        for (let c of cases) {
            try {
                await prepCaseGuide(c, fs);
                const build = await makeBuild(c, fs);
                const bres = await runBuild(c, build, {
                    parse: true,
                    guide: true,
                    transformers: false,
                    builders: false,
                    generate: false,
                });
                if (!bres?.ok) {
                    fails.push((0, apidef_1.formatJSONIC)(bres || 'NO RESULT', { maxlines: 111, exclude: ['fs'] }));
                }
                else {
                    validateGuide(c, fails, bres, fs, vol, testmetrics);
                }
            }
            catch (err) {
                fails.push((0, apidef_1.formatJSONIC)(err, { maxlines: 555 }));
            }
        }
        console.log('TOTAL TODOS: ' + testmetrics.todo);
        if (0 < fails.length) {
            (0, code_1.fail)(fails.join('\n---\n'));
        }
    });
    (0, node_test_1.test)('model-case', async () => {
        const { fs, vol } = prepfs(cases);
        const fails = [];
        const testmetrics = {
            todo: 0
        };
        for (let c of cases) {
            try {
                await prepCaseGuide(c, fs);
                const build = await makeBuild(c, fs);
                const bres = await runBuild(c, build, {
                    parse: true,
                    guide: true,
                    transformers: true,
                    builders: true,
                    generate: true,
                });
                if (!bres?.ok) {
                    fails.push((0, apidef_1.formatJSONIC)(bres || 'NO RESULT', { maxlines: 111, exclude: ['fs'] }));
                }
                else {
                    validateGuide(c, fails, bres, fs, vol, testmetrics);
                    validateModel(c, fails, bres, fs, vol, testmetrics);
                }
            }
            catch (err) {
                fails.push((0, apidef_1.formatJSONIC)(err, { maxlines: 555 }));
            }
        }
        console.log('TOTAL TODOS: ' + testmetrics.todo);
        if (0 < fails.length) {
            (0, code_1.fail)(fails.join('\n---\n'));
        }
    });
});
function fullname(c) {
    return `${c.name}-${c.version}-${c.spec}`;
}
function prepfs(cases) {
    const vol = {
        'model': {
            'guide': {}
            /*
        
              cases.reduce((a: any, c: Case) => {
                  a[fullname(c) + '-guide.jsonic'] = `
        @"@voxgig/apidef/model/guide.jsonic"
        
        @"${fullname(c)}-base-guide.jsonic"
        
        guide:{}
        `
                  return a
                  }, {})
                          */
        }
    };
    const ufs = (0, __1.makefs)(vol);
    return ufs;
}
async function prepCaseGuide(c, fs) {
    const guideFileName = fullname(c) + '-guide.jsonic';
    const realGuideFilePath = node_path_1.default.join(TOP_FOLDER, 'guide', guideFileName);
    const virtualGuideFilePath = node_path_1.default.join('/model', 'guide', guideFileName);
    let guideFileSrc = '';
    if (fs.existsSync(realGuideFilePath)) {
        guideFileSrc = fs.readFileSync(realGuideFilePath).toString('utf8');
    }
    else {
        guideFileSrc = `
@"@voxgig/apidef/model/guide.jsonic"

@"${fullname(c)}-base-guide.jsonic"

guide:{}
`;
        fs.writeFileSync(realGuideFilePath, guideFileSrc);
    }
    // Ensure guilde file is in virtual fs
    fs.writeFileSync(virtualGuideFilePath, guideFileSrc);
    console.log('PREP', realGuideFilePath, virtualGuideFilePath);
}
async function makeBuild(c, fs) {
    let folder = '/model';
    // let folder = TOP_FOLDER
    let outprefix = fullname(c) + '-';
    const build = await apidef_1.ApiDef.makeBuild({
        fs,
        folder,
        debug: 'debug',
        outprefix,
        why: {
            show: true
        }
    });
    return build;
}
async function runBuild(c, build, step) {
    const bres = await build({
        name: c.name,
        def: fullname(c) + '.' + c.format
    }, {
        spec: {
            base: __dirname + '/..',
            buildargs: {
                apidef: {
                    ctrl: {
                        step
                    }
                }
            }
        }
    }, {});
    return bres;
}
function validateGuide(c, fails, bres, fs, vol, testmetrics) {
    const todoarg = process.env.npm_config_todo;
    const showtodo = ('' + todoarg).match(/hide/i);
    const cfn = fullname(c);
    const volJSON = vol.toJSON();
    const baseGuide = volJSON[`/model/guide/${cfn}-base-guide.jsonic`].trim();
    const expectedBaseGuideFile = node_path_1.default.join(TOP_FOLDER, 'guide', `${cfn}-base-guide.jsonic`);
    if (!fs.existsSync(expectedBaseGuideFile)) {
        fs.writeFileSync(expectedBaseGuideFile, baseGuide);
    }
    const expectedBaseGuide = fs.readFileSync(expectedBaseGuideFile, 'utf8').trim();
    // console.log('<' + expectedBaseGuide + '>')
    if (expectedBaseGuide !== baseGuide) {
        const difflines = __1.Diff.diffLines(expectedBaseGuide, baseGuide);
        // Comments with ## are considered TODOs
        let todocount = 0;
        const cleanExpected = expectedBaseGuide.replace(/[^\n#]*##[^\n]*\n/g, () => (todocount++, ''));
        testmetrics.todo += todocount;
        if (cleanExpected !== baseGuide) {
            fails.push('MISMATCH:' + cfn + '\n' + prettyDiff(difflines));
        }
        else {
            console.log("OPEN TODOS: " + cfn + ' ' + todocount);
            if (!showtodo) {
                console.log('\n' + prettyDiff(difflines) + '\n');
            }
        }
    }
    const finalGuide = (0, apidef_1.formatJSONIC)(bres.guide).trim();
    const expectedFinalGuideFile = node_path_1.default.join(TOP_FOLDER, 'guide', `${cfn}-final-guide.jsonic`).trim();
    if (!fs.existsSync(expectedFinalGuideFile)) {
        fs.writeFileSync(expectedFinalGuideFile, finalGuide);
    }
    const expectedFinalGuide = fs.readFileSync(expectedFinalGuideFile, 'utf8').trim();
    printMismatch(expectedFinalGuide, finalGuide, testmetrics, fails, cfn, showtodo);
}
function printMismatch(expected, found, testmetrics, fails, cfn, showtodo) {
    // console.log('<' + expectedBaseGuide + '>')
    if (expected !== found) {
        const difflines = __1.Diff.diffLines(expected, found);
        // Comments with ## are considered TODOs
        let todocount = 0;
        const cleanExpected = expected.replace(/[^\n#]*##[^\n]*\n/g, () => (todocount++, ''));
        testmetrics.todo += todocount;
        if (cleanExpected !== found) {
            fails.push('MISMATCH:' + cfn + '\n' + prettyDiff(difflines));
        }
        else {
            console.log("OPEN TODOS: " + cfn + ' ' + todocount);
            if (!showtodo) {
                console.log('\n' + prettyDiff(difflines) + '\n');
            }
        }
    }
}
function validateModel(c, fails, bres, fs, vol, testmetrics) {
    const todoarg = process.env.npm_config_todo;
    const showtodo = ('' + todoarg).match(/hide/i);
    const cfn = fullname(c);
    const volJSON = vol.toJSON();
    fs.mkdirSync(__dirname + '/../model/' + `${cfn}`, { recursive: true });
    (0, jostraca_1.each)(bres.apimodel.main.sdk.entity, (entity) => {
        const efn = `${cfn}-${entity.name}`;
        const entitySrc = volJSON[`/model/entity/${efn}.jsonic`].trim();
        const expectedSrcFile = __dirname + '/../model/' + `${cfn}/${efn}.jsonic`;
        if (!fs.existsSync(expectedSrcFile)) {
            fs.writeFileSync(expectedSrcFile, entitySrc);
        }
        const expectedEntitySrc = fs.readFileSync(expectedSrcFile, 'utf8')
            .trim();
        // console.log('<' + expectedEntitySrc + '>')
        if (expectedEntitySrc !== entitySrc) {
            const difflines = __1.Diff.diffLines(expectedEntitySrc, entitySrc);
            // Comments with ## are considered TODOs
            let todocount = 0;
            const cleanExpected = expectedEntitySrc.replace(/[^\n#]*##[^\n]*\n/g, () => (todocount++, ''));
            testmetrics.todo += todocount;
            if (cleanExpected !== entitySrc) {
                fails.push('MISMATCH:' + efn + '\n' + prettyDiff(difflines));
            }
            else {
                console.log("OPEN TODOS: " + cfn + ' ' + todocount);
                if (!showtodo) {
                    console.log('\n' + prettyDiff(difflines) + '\n');
                }
            }
        }
    });
}
function prettyDiff(difflines) {
    const out = [];
    if ('hide' === process.env.npm_config_prettydiff) {
        return;
    }
    let prev = undefined;
    let last = 'same';
    difflines.forEach((part) => {
        if (part.added) {
            if ('same' === last && prev) {
                const prevlines = prev.value.split('\n');
                out.push('\n' + prevlines.slice(prevlines.length - 4, prevlines.length).join('\n'));
                prev = undefined;
            }
            out.push('\x1b[38;5;220m<<<<<<< GENERATED\n');
            out.push(part.value);
            out.push('>>>>>>> GENERATED\n\x1b[0m');
            last = 'added';
        }
        else if (part.removed) {
            if (part.value.trim().startsWith('###')) {
                // ignore as comment
                last = 'same';
                prev = part;
            }
            else if (part.value.trim().startsWith('##')) {
                out.push(`\x1b[93m####### TODO: ${part.value}\x1b[0m`);
                last = 'same';
                prev = part;
            }
            else {
                if ('same' === last && prev) {
                    const prevlines = prev.value.split('\n');
                    out.push('\n' + prevlines.slice(prevlines.length - 4, prevlines.length).join('\n'));
                    prev = undefined;
                }
                out.push('\x1b[92m<<<<<<< EXISTING\n');
                out.push(part.value);
                out.push('>>>>>>> EXISTING\n\x1b[0m');
                last = 'removed';
            }
        }
        else {
            if ('same' !== last) {
                out.push(part.value.split('\n').slice(0, 4).join('\n') + '\n--- --- ---\n');
            }
            prev = part;
            last = 'same';
        }
    });
    const content = out.join('');
    return content;
}
//# sourceMappingURL=main.test.js.map