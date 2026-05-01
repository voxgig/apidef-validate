// Patch find() itself to tag caller line and count visits per call.
const fs = require('fs');
const perCaller = global.__perCaller = {};

const apidefUtil = require('@voxgig/apidef/dist/utility.js');
const origFind = apidefUtil.find;
apidefUtil.find = function (obj, qkey) {
  const caller = (new Error().stack.split('\n')[2] || '').trim();
  const key = caller.slice(0, 140);
  let visits = 0;
  let matches = 0;
  (function count(o){
    if (!o || typeof o !== 'object') return;
    visits++;
    if (Array.isArray(o)) { for (const c of o) count(c); }
    else { for (const k of Object.keys(o)) { if (k === qkey) matches++; count(o[k]); } }
  })(obj);
  if (!perCaller[key]) perCaller[key] = { calls: 0, visits: 0, matches: 0 };
  perCaller[key].calls++;
  perCaller[key].visits += visits;
  perCaller[key].matches += matches;
  return origFind.call(this, obj, qkey);
};

process.on('exit', () => {
  console.log('\n==== find() BY CALLER ====');
  for (const [k, v] of Object.entries(perCaller)) {
    console.log(`calls=${v.calls}  visits=${v.visits}  matches=${v.matches}  ${k}`);
  }
});
