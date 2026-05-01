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
  let guideFileSrc = '';
  if (fs.existsSync(realGuideFilePath)) {
    guideFileSrc = fs.readFileSync(realGuideFilePath).toString('utf8');
  } else {
    guideFileSrc = `@"@voxgig/apidef/model/guide.jsonic"\n@"${fullname}-base-guide.jsonic"\nguide:{}`;
    fs.writeFileSync(realGuideFilePath, guideFileSrc);
  }
  fs.writeFileSync(virtualGuideFilePath, guideFileSrc);
  const buildSpec = { folder: '/model', debug: 'debug', outprefix: fullname + '-', why: { show: true }, fs };
  console.time('makeBuild');
  const build = await ApiDef.makeBuild(buildSpec);
  console.timeEnd('makeBuild');
  const model = { name: caseName, def: fullname + '.' + format };
  const steps = [
    { parse: true, guide: false, transformers: false, builders: false, generate: false },
    { parse: true, guide: true,  transformers: false, builders: false, generate: false },
    { parse: true, guide: true,  transformers: true,  builders: false, generate: false },
    { parse: true, guide: true,  transformers: true,  builders: true,  generate: false },
    { parse: true, guide: true,  transformers: true,  builders: true,  generate: true  },
  ];
  const labels = ['parse only','+guide','+transformers','+builders','+generate'];
  for (let i=0;i<steps.length;i++) {
    const stepSpec = { spec: { base: Path.normalize(TOP_FOLDER), buildargs: { apidef: { ctrl: { step: steps[i] } } } } };
    const t = Date.now();
    const bres = await build(model, stepSpec, {});
    console.log(`${labels[i].padEnd(16)} : ${Date.now()-t} ms  ok=${bres?.ok}`);
  }
}
run('codatplatform','3.0.0','openapi-3.1.0','yaml').catch(e=>{ console.error(e); process.exit(1); });
