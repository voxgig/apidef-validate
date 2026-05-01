const Path = require('node:path');
const { ApiDef } = require('@voxgig/apidef');
const { makefs } = require('/Users/richard/Projects/voxgig/apidef-validate');
const TOP_FOLDER = Path.join('/Users/richard/Projects/voxgig/apidef-validate/v1');

async function run(caseName, version, spec, format) {
  const fullname = `${caseName}-${version}-${spec}`;
  const vol = { model: { guide: {} } };
  const { fs, vol: v } = makefs(vol);

  // prepCaseGuide
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

  // makeBuild
  const buildSpec = {
    folder: '/model',
    debug: 'debug',
    outprefix: fullname + '-',
    why: { show: true },
    fs
  };

  console.time('makeBuild');
  const build = await ApiDef.makeBuild(buildSpec);
  console.timeEnd('makeBuild');

  const model = { name: caseName, def: fullname + '.' + format };
  const stepSpec = {
    spec: {
      base: Path.normalize(TOP_FOLDER),
      buildargs: {
        apidef: {
          ctrl: {
            step: { parse: true, guide: true, transformers: true, builders: true, generate: true }
          }
        }
      }
    }
  };

  console.time('build-total');
  const bres = await build(model, stepSpec, {});
  console.timeEnd('build-total');
  console.log('ok:', bres?.ok);
}

const c = process.argv[2] || 'learnworlds';
const configs = {
  taxonomy: ['taxonomy','1.0.0','openapi-3.1.0','yaml'],
  learnworlds: ['learnworlds','2','openapi-3.1.0','yaml'],
  cloudsmith: ['cloudsmith','v1','swagger-2.0','json'],
  github: ['github','1.1.4','openapi-3.0.3','yaml'],
  gitlab: ['gitlab','v4','swagger-2.0','yaml'],
  shortcut: ['shortcut','v3','openapi-3.0.0','json'],
  statuspage: ['statuspage','1.0.0','openapi-3.0.0','json'],
};
const cfg = configs[c];
if (!cfg) { console.log('Unknown case:', c); process.exit(1); }
run(...cfg).catch(console.error);
