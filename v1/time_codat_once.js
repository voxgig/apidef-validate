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
  const build = await ApiDef.makeBuild(buildSpec);
  const model = { name: caseName, def: fullname + '.' + format };
  const stepSpec = { spec: { base: Path.normalize(TOP_FOLDER), buildargs: { apidef: { ctrl: { step: { parse: true, guide: true, transformers: true, builders: true, generate: true } } } } } };
  const t = Date.now();
  const bres = await build(model, stepSpec, {});
  console.log('TOTAL ms:', Date.now()-t, 'ok=', bres?.ok);
}
run(process.argv[2] || 'codatplatform','3.0.0','openapi-3.1.0','yaml').catch(e=>{ console.error(e); process.exit(1); });
