const fs=require('fs'),vm=require('vm'),assert=require('assert');
const code=fs.readFileSync('assets/js/app.js','utf8').replace(/boot\(\);\s*$/,'');
const ctx={};vm.createContext(ctx);vm.runInContext(code,ctx);
const svg=ctx.driverTimelineSVG([{date:'2026-10-01',value:1},{date:'2026-10-02',value:null},{date:'2026-10-03',value:2}],'pna');
assert(svg.includes('Oct 1')&&svg.includes('Oct 3')&&svg.includes('2026'));
assert(!svg.includes('stroke-width="2.5"')); // Missing samples must not become zero or connected lines.
assert(svg.includes('mini-tick')&&svg.includes('mini-legend'));
const r=ctx.driverTimelineSVG([{season:'JAS',year:2025,value:.2},{season:'ASO',year:2025,value:.4}],'roni');assert(r.includes('JAS 2025')&&r.includes('overlapping seasons'));
const m=ctx.driverTimelineSVG([{date:'2026-10-01',amplitude:.5},{date:'2026-10-02',amplitude:1.2}],'mjo_rmm');assert(m.includes('active ≥1'));
console.log('Driver timeline labels, ticks, units and missing samples: PASS');
