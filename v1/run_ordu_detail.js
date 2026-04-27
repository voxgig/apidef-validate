// Wrap individual named Ordu apply functions inside heuristic01 by monkey-patching utility and struct,
// plus wrap the top-level Ordu.execSync timing per module.
const times = {};
function wrap(obj, fn, label) {
  const orig = obj[fn];
  if (typeof orig !== 'function') return;
  obj[fn] = function(...args) {
    const t = process.hrtime.bigint();
    try { return orig.apply(this, args); }
    finally {
      const d = Number(process.hrtime.bigint()-t)/1e6;
      times[label] = times[label] || { ms:0, calls:0 };
      times[label].ms += d; times[label].calls++;
    }
  };
}

// We can't reach heuristic01's local functions; instead wrap the utility functions they call.
const utility = require('@voxgig/apidef/dist/utility.js');
wrap(utility, 'capture', 'util.capture');
wrap(utility, 'find', 'util.find');
wrap(utility, 'canonize', 'util.canonize');
wrap(utility, 'cleanComponentName', 'util.cleanComponentName');
wrap(utility, 'ensureMinEntityName', 'util.ensureMinEntityName');
wrap(utility, 'pathMatch', 'util.pathMatch');
wrap(utility, 'formatJSONIC', 'util.formatJSONIC');
wrap(utility, 'findPathsWithPrefix', 'util.findPathsWithPrefix');

const struct = require('@voxgig/struct');
wrap(struct, 'transform', 'struct.transform');
wrap(struct, 'select', 'struct.select');
wrap(struct, 'walk', 'struct.walk');
wrap(struct, 'inject', 'struct.inject');
wrap(struct, 'clone', 'struct.clone');
wrap(struct, 'merge', 'struct.merge');

// Ordu wrap to see per-task time
const Ordu = require('ordu');
const origAdd = Ordu.Ordu?.prototype?.add;
if (origAdd) {
  Ordu.Ordu.prototype.add = function(tasks) {
    // Wrap each apply function at insertion time
    function wrapApplyList(list) {
      if (!Array.isArray(list)) return list;
      return list.map(t => {
        if (typeof t === 'function') return wrapFn(t, 'ordu:'+(t.name||'anon'));
        if (t && t.apply) {
          const out = { ...t };
          if (typeof t.apply === 'function') out.apply = wrapFn(t.apply, 'ordu:'+(t.apply.name||'anon'));
          else if (Array.isArray(t.apply)) out.apply = t.apply.map(f => typeof f === 'function' ? wrapFn(f, 'ordu:'+(f.name||'anon')) : f);
          if (typeof t.select === 'function') out.select = wrapFn(t.select, 'ordu-sel:'+(t.select.name||'anon'));
          return out;
        }
        return t;
      });
    }
    function wrapFn(fn, label) {
      return function(...a) {
        const t = process.hrtime.bigint();
        try { return fn.apply(this, a); }
        finally {
          const d = Number(process.hrtime.bigint()-t)/1e6;
          times[label] = times[label] || { ms:0, calls:0 };
          times[label].ms += d; times[label].calls++;
        }
      };
    }
    return origAdd.call(this, wrapApplyList(tasks));
  };
}

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
const args = process.argv.slice(2);
const ra = args.length>=4 ? args : ['codatplatform','3.0.0','openapi-3.1.0','yaml'];
run(...ra).catch(e=>{ console.error(e); process.exit(1); });
