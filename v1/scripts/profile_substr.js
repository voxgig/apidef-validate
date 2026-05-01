const fs = require('fs');
const source = fs.readFileSync('/Users/richard/Projects/voxgig/apidef-validate/def/learnworlds-2-openapi-3.1.0.yaml','utf8');

let substringStats = {};
const origSubstring = String.prototype.substring;

String.prototype.substring = function(start, end) {
  const result = origSubstring.call(this, start, end);
  if (this.length > 10000 && result.length > 1000) {
    const e = {};
    Error.captureStackTrace(e, String.prototype.substring);
    const stack = e.stack.split('\n')[1] || 'unknown';
    const loc = stack.trim().replace(/^at /, '').substring(0, 100);
    if (substringStats[loc] == null) {
      substringStats[loc] = { count: 0, bytes: 0 };
    }
    substringStats[loc].count++;
    substringStats[loc].bytes += result.length;
  }
  return result;
};

const {Jsonic} = require('jsonic');
const {Yaml} = require('@jsonic/yaml');
const yamlParser = Jsonic.make().use(Yaml);

substringStats = {};
console.time('parse');
const result = yamlParser(source);
console.timeEnd('parse');

const sorted = Object.entries(substringStats)
  .sort((a, b) => b[1].bytes - a[1].bytes)
  .slice(0, 15);

console.log('\nTop substring callers:');
for (const [loc, s] of sorted) {
  console.log('  ' + (s.bytes/1024/1024).toFixed(0).padStart(5) + ' MB | ' +
    String(s.count).padStart(7) + ' calls | ' + loc);
}

String.prototype.substring = origSubstring;
