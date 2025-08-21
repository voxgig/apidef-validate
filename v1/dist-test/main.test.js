"use strict";
/* Copyright (c) 2025 Voxgig Ltd, MIT License */
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const code_1 = require("@hapi/code");
const apidef_1 = require("@voxgig/apidef");
const __1 = require("../..");
const __2 = require("..");
(0, node_test_1.describe)('main', () => {
    (0, node_test_1.test)('happy', async () => {
        (0, code_1.expect)((0, __2.main)()).equal('main');
    });
    (0, node_test_1.test)('core-case', async () => {
        const caseSelector = process.env.npm_config_case;
        let cases = [
            { name: 'solar', version: '1.0.0', format: 'yaml', spec: 'openapi-3.0.0' },
            { name: 'taxonomy', version: '1.0.0', format: 'yaml', spec: 'openapi-3.1.0' },
            { name: 'learnworlds', version: '2', format: 'yaml', spec: 'openapi-3.1.0' },
            { name: 'statuspage', version: '1.0.0', format: 'json', spec: 'openapi-3.0.0' },
        ];
        if ('string' === typeof caseSelector) {
            cases = cases.filter(c => c.name.includes(caseSelector));
        }
        const { fs, vol } = prepfs(cases);
        const fails = [];
        for (let c of cases) {
            try {
                const build = await makeBuild(c, fs);
                const bres = await runBuild(c, build);
                if (!bres.ok) {
                    fails.push(JSON.stringify(bres, null, 2));
                }
                validateGuide(c, fails, fs, vol);
            }
            catch (err) {
                console.error(err);
                fails.push(JSON.stringify({ ...err }, null, 2));
            }
        }
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
            'guide': cases.reduce((a, c) => (a[fullname(c) + '-guide.jsonic'] = 'guide:{}', a), {})
        }
    };
    // console.dir(vol, { depth: null })
    const ufs = (0, __1.makefs)(vol);
    return ufs;
}
async function makeBuild(c, fs) {
    let folder = '/model';
    let outprefix = fullname(c) + '-';
    const build = await apidef_1.ApiDef.makeBuild({
        fs,
        folder,
        debug: 'debug',
        outprefix,
    });
    return build;
}
async function runBuild(c, build) {
    const bres = await build({
        name: c.name,
        def: fullname(c) + '.' + c.format
    }, {
        spec: {
            base: __dirname + '/..',
            buildargs: {
                apidef: {
                    ctrl: {
                        step: {
                            parse: true,
                            guide: true,
                            transformers: false,
                            builders: false,
                            generate: false,
                        }
                    }
                }
            }
        }
    }, {});
    return bres;
}
function validateGuide(c, fails, fs, vol) {
    const cfn = fullname(c);
    const volJSON = vol.toJSON();
    const baseGuide = volJSON[`/model/guide/${cfn}-base-guide.jsonic`].trim();
    // if ('statuspage' === c.name) {
    //   console.log('BASE:' + cfn + '<' + baseGuide + '>')
    // }
    const expectedBaseGuide = fs.readFileSync(__dirname + '/../guide/' +
        `${cfn}-base-guide.jsonic`, 'utf8').trim();
    // console.log('<' + expectedBaseGuide + '>')
    if (expectedBaseGuide !== baseGuide) {
        const difflines = __1.Diff.diffLines(expectedBaseGuide, baseGuide);
        // console.log(difflines)
        fails.push('MISMATCH:' + cfn + '\n' + prettyDiff(difflines));
    }
}
function prettyDiff(difflines) {
    const out = [];
    difflines.forEach((part) => {
        if (part.added) {
            out.push('\x1b[38;5;220m<<<<<<< GENERATED\n');
            out.push(part.value);
            out.push('>>>>>>> GENERATED\n\x1b[0m');
        }
        else if (part.removed) {
            out.push('\x1b[92m<<<<<<< EXISTING\n');
            out.push(part.value);
            out.push('>>>>>>> EXISTING\n\x1b[0m');
        }
        else {
            out.push(part.value);
        }
    });
    const content = out.join('');
    return content;
}
//# sourceMappingURL=main.test.js.map