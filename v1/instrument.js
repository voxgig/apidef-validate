// Instrument the installed libraries to count tree visits per walker.
// Run this BEFORE the test import, then require the test harness.

const fs = require('fs');
const path = require('path');

const counts = global.__walkerCounts = {};
function inc(k) { counts[k] = (counts[k] || 0) + 1 }

// Wrap decircular
const util = require('@voxgig/util/dist/util.js');
const origDecircular = util.decircular;
util.decircular = function (obj) {
  let visits = 0;
  const seen = new WeakMap();
  const p = [];
  function walk(v) {
    if (!(v && typeof v === 'object')) return v;
    visits++;
    if (seen.has(v)) return '[Circ]';
    seen.set(v, p.slice());
    const nv = Array.isArray(v) ? [] : {};
    for (const [k, val] of Object.entries(v)) { p.push(k); nv[k] = walk(val); p.pop(); }
    seen.delete(v);
    return nv;
  }
  const r = walk(obj);
  counts['decircular'] = (counts['decircular'] || 0) + visits;
  counts['decircular-calls'] = (counts['decircular-calls'] || 0) + 1;
  return r;
};

// Wrap struct walk - count invocations and total descents
const struct = require('@voxgig/struct/dist/StructUtility.js');
const origWalk = struct.walk;
struct.walk = function (...args) {
  const stack = new Error().stack.split('\n').slice(2, 5).join(' | ');
  // Count this invocation (which descends recursively)
  counts['walk-toplevel-calls'] = (counts['walk-toplevel-calls'] || 0) + 1;
  // Count descents via a before wrapper - BUT walk's signature passes before/after as args
  // Simpler: instrument by counting items() calls within a wrapped walk. We'll
  // instead override the module's walk to count each invocation of walk itself
  // (which fires per node).
  return origWalk.apply(this, args);
};
// Count every recursive walk() invocation (= every visit):
// Since struct.walk is used internally with its own internal call to walk,
// we need to patch the recursion too. The recursive calls go through the
// local binding inside the module, not struct.walk. So we can't easily count
// per-node visits from outside. Instead, count via the before callback: wrap
// the first argument's 'before' to increment.
const realWalk = origWalk;
struct.walk = function (val, before, after, maxdepth, key, parent, path, pool) {
  const callerKey = new Error().stack.split('\n').slice(2, 3).join('').trim().slice(0, 120);
  let nodeVisits = 0;
  const wrappedBefore = function (k, v, p, path) {
    if (v && typeof v === 'object') nodeVisits++;
    return before ? before(k, v, p, path) : v;
  };
  const r = realWalk.call(this, val, wrappedBefore, after, maxdepth, key, parent, path, pool);
  counts['walk/' + callerKey] = (counts['walk/' + callerKey] || 0) + nodeVisits;
  return r;
};

// Wrap transform
const origTransform = struct.transform;
if (origTransform) {
  struct.transform = function (...args) {
    counts['transform-calls'] = (counts['transform-calls'] || 0) + 1;
    return origTransform.apply(this, args);
  };
}

// Report on exit
process.on('exit', () => {
  console.log('\n==== WALKER VISIT COUNTS ====');
  const rows = Object.entries(counts).sort((a,b) => b[1]-a[1]);
  for (const [k, v] of rows) console.log(v.toString().padStart(8) + '  ' + k);
});
