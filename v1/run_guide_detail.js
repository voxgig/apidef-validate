// Wrap individual heuristic01 exported-style functions by hooking into them.
const heur = require('@voxgig/apidef/dist/guide/heuristic01.js');

// The heuristic01 module uses local function declarations, not exports. We can't
// easily wrap them. Instead, time the guide step overall, then wrap guide/ordu tasks via Ordu.
// Alternative: wrap key utility functions.
const utility = require('@voxgig/apidef/dist/utility.js');
const times = {};
function wrap(mod, fn) {
  const orig = mod[fn];
  if (typeof orig !== 'function') return;
  mod[fn] = function(...args) {
    const t = process.hrtime.bigint();
    let r; try { r = orig.apply(this, args); return r; }
    finally {
      const d = Number(process.hrtime.bigint()-t)/1e6;
      times[fn] = times[fn] || { ms: 0, calls: 0 };
      times[fn].ms += d;
      times[fn].calls++;
    }
  };
}
wrap(utility, 'find');
wrap(utility, 'canonize');
wrap(utility, 'depluralize');
wrap(utility, 'cleanComponentName');
wrap(utility, 'capture');
wrap(utility, 'pathMatch');
wrap(utility, 'formatJSONIC');
wrap(utility, 'sanitizeSlug');
wrap(utility, 'slugToPascalCase');
wrap(utility, 'ensureMinEntityName');
wrap(utility, 'normalizeFieldName');
wrap(utility, 'inferFieldType');
wrap(utility, 'findPathsWithPrefix');

const struct = require('@voxgig/struct');
wrap(struct, 'transform');
wrap(struct, 'walk');
wrap(struct, 'select');
wrap(struct, 'clone');
wrap(struct, 'inject');
wrap(struct, 'merge');

const util = require('@voxgig/util');
wrap(util, 'decircular');

const Path = require('node:path');
const { ApiDef } = require('@voxgig/apidef');
const { makefs } = require('/Users/richard/Projects/voxgig/apidef-validate');
const TOP_FOLDER = Path.join('/Users/richard/Projects/voxgig/apidef-validate/v1');

async function run(caseName, version, spec, format) {
  const fullname = `${caseName}-${version}-${spec}`;
  const vol = { model: { guide: {} } };
  const { fs } = makefs(vol);
  const guideFileName = fullname + '-guide.jsonic';
  const realGuideFilePath = Path.join(TOP_FOLDER, 'guide', guideFileName);
  const virtualGuideFilePath = Path.join('/model', 'guide', guideFileName);
  let guideFileSrc = fs.existsSync(realGuideFilePath) ? fs.readFileSync(realGuideFilePath).toString('utf8')
    : `@"@voxgig/apidef/model/guide.jsonic"\n@"${fullname}-base-guide.jsonic"\nguide:{}`;
  if (!fs.existsSync(realGuideFilePath)) fs.writeFileSync(realGuideFilePath, guideFileSrc);
  fs.writeFileSync(virtualGuideFilePath, guideFileSrc);
  const buildSpec = { folder: '/model', debug: 'debug', outprefix: fullname + '-', why: { show: true }, fs };
  const build = await ApiDef.makeBuild(buildSpec);
  const model = { name: caseName, def: fullname + '.' + format };
  const stepSpec = { spec: { base: Path.normalize(TOP_FOLDER), buildargs: { apidef: { ctrl: { step: { parse: true, guide: true, transformers: true, builders: true, generate: true } } } } } };
  const t = Date.now();
  const bres = await build(model, stepSpec, {});
  console.log(`\n=== ${caseName} total ${Date.now()-t}ms ok=${bres?.ok} ===`);
  const rows = Object.entries(times).map(([k,v])=>({k,...v})).sort((a,b)=>b.ms-a.ms);
  for (const r of rows) console.log(r.ms.toFixed(1).padStart(9)+' ms '+String(r.calls).padStart(7)+' calls  '+r.k);
}
run(process.argv[2] || 'codatplatform','3.0.0','openapi-3.1.0','yaml').catch(e=>{ console.error(e); process.exit(1); });
