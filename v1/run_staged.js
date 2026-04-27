// Monkey-patch each pipeline stage with Date.now() timing, run codatplatform once.
const apidefMod = require('@voxgig/apidef');
const parseMod = require('@voxgig/apidef/dist/parse.js');
const guideMod = require('@voxgig/apidef/dist/guide/guide.js');
const topTf = require('@voxgig/apidef/dist/transform/top.js');
const entTf = require('@voxgig/apidef/dist/transform/entity.js');
const opTf  = require('@voxgig/apidef/dist/transform/operation.js');
const argTf = require('@voxgig/apidef/dist/transform/args.js');
const selTf = require('@voxgig/apidef/dist/transform/select.js');
const fldTf = require('@voxgig/apidef/dist/transform/field.js');
const flwTf = require('@voxgig/apidef/dist/transform/flow.js');
const fstTf = require('@voxgig/apidef/dist/transform/flowstep.js');
const clnTf = require('@voxgig/apidef/dist/transform/clean.js');
const entBl = require('@voxgig/apidef/dist/builder/entity.js');
const flwBl = require('@voxgig/apidef/dist/builder/flow.js');

const stageTimes = {};
function wrap(mod, fnName, label) {
  const orig = mod[fnName];
  if (!orig) return;
  mod[fnName] = async function(...args) {
    const t = Date.now();
    try { return await orig.apply(this, args); }
    finally { stageTimes[label] = (stageTimes[label]||0) + (Date.now()-t); }
  };
}
wrap(parseMod, 'parse', '01-parse');
wrap(guideMod, 'buildGuide', '02-guide');
wrap(topTf, 'topTransform', '03-top');
wrap(entTf, 'entityTransform', '04-entity');
wrap(opTf, 'operationTransform', '05-operation');
wrap(argTf, 'argsTransform', '06-args');
wrap(selTf, 'selectTransform', '07-select');
wrap(fldTf, 'fieldTransform', '08-field');
wrap(flwTf, 'flowTransform', '09-flow');
wrap(fstTf, 'flowstepTransform', '10-flowstep');
wrap(clnTf, 'cleanTransform', '11-clean');
wrap(entBl, 'makeEntityBuilder', '12-entityBuilder');
wrap(flwBl, 'makeFlowBuilder', '13-flowBuilder');

const Path = require('node:path');
const { ApiDef } = apidefMod;
const { makefs } = require('/Users/richard/Projects/voxgig/apidef-validate');
const TOP_FOLDER = Path.join('/Users/richard/Projects/voxgig/apidef-validate/v1');

async function run(caseName, version, spec, format) {
  const fullname = `${caseName}-${version}-${spec}`;
  const vol = { model: { guide: {} } };
  const { fs } = makefs(vol);
  const guideFileName = fullname + '-guide.jsonic';
  const realGuideFilePath = Path.join(TOP_FOLDER, 'guide', guideFileName);
  const virtualGuideFilePath = Path.join('/model', 'guide', guideFileName);
  let guideFileSrc = '';
  if (fs.existsSync(realGuideFilePath)) guideFileSrc = fs.readFileSync(realGuideFilePath).toString('utf8');
  else {
    guideFileSrc = `@"@voxgig/apidef/model/guide.jsonic"\n@"${fullname}-base-guide.jsonic"\nguide:{}`;
    fs.writeFileSync(realGuideFilePath, guideFileSrc);
  }
  fs.writeFileSync(virtualGuideFilePath, guideFileSrc);
  const buildSpec = { folder: '/model', debug: 'debug', outprefix: fullname + '-', why: { show: true }, fs };
  const build = await ApiDef.makeBuild(buildSpec);
  const model = { name: caseName, def: fullname + '.' + format };
  const stepSpec = { spec: { base: Path.normalize(TOP_FOLDER), buildargs: { apidef: { ctrl: { step: { parse: true, guide: true, transformers: true, builders: true, generate: true } } } } } };
  const t = Date.now();
  const bres = await build(model, stepSpec, {});
  const total = Date.now()-t;
  let accounted = 0;
  console.log(`\n=== ${caseName} total ${total}ms ok=${bres?.ok} ===`);
  for (const k of Object.keys(stageTimes).sort()) {
    console.log(`${k.padEnd(22)} ${String(stageTimes[k]).padStart(6)} ms`);
    accounted += stageTimes[k];
  }
  console.log(`${'other/generate'.padEnd(22)} ${String(total-accounted).padStart(6)} ms`);
}
const args = process.argv.slice(2);
const runargs = args.length >= 4 ? args : ['codatplatform','3.0.0','openapi-3.1.0','yaml'];
run(...runargs).catch(e=>{ console.error(e); process.exit(1); });
