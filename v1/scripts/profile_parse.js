const Path = require('node:path');
const { Jsonic } = require('jsonic');
const { Yaml } = require('@jsonic/yaml');
const { decircular } = require('@voxgig/util');
const fs = require('fs');

const yamlParser = Jsonic.make().use(Yaml);

const caseName = process.argv[2] || 'learnworlds';
const configs = {
  taxonomy: ['taxonomy-1.0.0-openapi-3.1.0.yaml'],
  learnworlds: ['learnworlds-2-openapi-3.1.0.yaml'],
  cloudsmith: ['cloudsmith-v1-swagger-2.0.json'],
  github: ['github-1.1.4-openapi-3.0.3.yaml'],
  gitlab: ['gitlab-v4-swagger-2.0.yaml'],
  shortcut: ['shortcut-v3-openapi-3.0.0.json'],
  statuspage: ['statuspage-1.0.0-openapi-3.0.0.json'],
  codatplatform: ['codatplatform-3.0.0-openapi-3.1.0.yaml'],
  contentfulcma: ['contentfulcma-1.0.0-openapi-3.0.0.yaml'],
};
const deffile = configs[caseName]?.[0];
if (!deffile) { console.log('Unknown'); process.exit(1); }

const defpath = Path.join(__dirname, '..', 'def', deffile);
const source = fs.readFileSync(defpath, 'utf8');
console.log('File size:', (source.length / 1024).toFixed(0), 'KB');

console.time('1-yaml-parse');
const parsed = yamlParser(source);
console.timeEnd('1-yaml-parse');

const pathCount = Object.keys(parsed.paths || {}).length;
const cmpCount = Object.keys(parsed.components?.schemas || {}).length;
console.log('Paths:', pathCount, 'Schemas:', cmpCount);

console.time('2-addXRefs');
const seen = new WeakSet();
let refCount = 0;
function addXRefs(obj) {
  if (!obj || typeof obj !== 'object' || seen.has(obj)) return;
  seen.add(obj);
  if (Array.isArray(obj)) {
    obj.forEach(item => addXRefs(item));
  } else {
    if (obj.$ref && typeof obj.$ref === 'string') {
      obj['x-ref'] = obj.$ref;
      refCount++;
    }
    for (const [key, value] of Object.entries(obj)) {
      if (value && typeof value === 'object') addXRefs(value);
    }
  }
}
addXRefs(parsed);
console.timeEnd('2-addXRefs');
console.log('Refs found:', refCount);

console.time('3-resolveRefs');
function resolvePointer(root, ref) {
  if (!ref.startsWith('#/')) return undefined;
  const parts = ref.substring(2).split('/').map(p => p.replace(/~1/g, '/').replace(/~0/g, '~'));
  let current = root;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = current[part];
  }
  return current;
}
function resolveRefs(obj, root, visited) {
  if (!obj || typeof obj !== 'object') return;
  if (!visited) visited = new WeakSet();
  if (visited.has(obj)) return;
  visited.add(obj);
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const item = obj[i];
      if (item && typeof item === 'object' && typeof item.$ref === 'string') {
        const resolved = resolvePointer(root, item.$ref);
        if (resolved !== undefined) {
          const xref = item['x-ref'];
          obj[i] = { ...resolved };
          if (xref) obj[i]['x-ref'] = xref;
          resolveRefs(obj[i], root, visited);
        }
      } else {
        resolveRefs(item, root, visited);
      }
    }
  } else {
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val && typeof val === 'object' && typeof val.$ref === 'string') {
        const resolved = resolvePointer(root, val.$ref);
        if (resolved !== undefined) {
          const xref = val['x-ref'];
          obj[key] = { ...resolved };
          if (xref) obj[key]['x-ref'] = xref;
          resolveRefs(obj[key], root, visited);
        }
      } else {
        resolveRefs(val, root, visited);
      }
    }
  }
}
resolveRefs(parsed, parsed);
console.timeEnd('3-resolveRefs');

console.time('4-decircular-1');
const def = decircular(parsed);
console.timeEnd('4-decircular-1');

console.time('5-decircular-2');
const safedef = decircular(def);
console.timeEnd('5-decircular-2');

console.time('6-JSON.stringify');
const fullsrc = JSON.stringify(safedef, null, 2);
console.timeEnd('6-JSON.stringify');
console.log('JSON size:', (fullsrc.length / 1024 / 1024).toFixed(1), 'MB');

const memUsage = process.memoryUsage();
console.log('Heap used:', (memUsage.heapUsed / 1024 / 1024).toFixed(0), 'MB');
console.log('RSS:', (memUsage.rss / 1024 / 1024).toFixed(0), 'MB');
