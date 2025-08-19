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
    (0, node_test_1.test)('core', async () => {
        const cases = [
            { name: 'solar', version: '1.0.0', format: 'openapi-3.0.0' }
        ];
        const { fs, vol } = prepfs(cases);
        for (let kase of cases) {
            console.log('CASE', kase);
            const build = await makeBuild(kase, fs);
            const bres = await runBuild(kase, build);
            validateGuide(kase, fs, vol);
        }
    });
});
function prepfs(cases) {
    const vol = {
        'model': {
            'guide': cases.reduce((a, n) => (a[n.name + '-guide.jsonic'] = 'guide:{}', a), {})
        }
    };
    // console.dir(vol, { depth: null })
    const ufs = (0, __1.makefs)(vol);
    return ufs;
}
async function makeBuild(kase, fs) {
    let folder = '/model';
    let outprefix = kase.name + '-';
    const build = await apidef_1.ApiDef.makeBuild({
        fs,
        folder,
        debug: 'debug',
        outprefix,
    });
    return build;
}
async function runBuild(kase, build) {
    const bres = await build({
        name: kase.name,
        def: `${kase.name}-${kase.version}-${kase.format}.yaml`
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
function validateGuide(kase, fs, vol) {
    const volJSON = vol.toJSON();
    const baseGuide = volJSON[`/model/guide/${kase.name}-base-guide.jsonic`].trim();
    // console.log('<' + baseGuide + '>')
    const expectedBaseGuide = fs.readFileSync(__dirname + '/../guide/' +
        `${kase.name}-${kase.version}-${kase.format}-base-guide.jsonic`, 'utf8').trim();
    // console.log('<' + expectedBaseGuide + '>')
    if (expectedBaseGuide !== baseGuide) {
        const difflines = __1.Diff.diffLines(baseGuide, expectedBaseGuide);
        console.log(difflines);
        (0, code_1.expect)(baseGuide).equal(expectedBaseGuide);
    }
}
//# sourceMappingURL=main.test.js.map