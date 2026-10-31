const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const C=require('../assets/js/historical-maps.js');
const m=JSON.parse(fs.readFileSync('data/historical/manifest.json')),d=JSON.parse(fs.readFileSync('data/historical/maps.json'));
for(const[path,spec]of Object.entries(m.files)){const b=fs.readFileSync(path);assert.equal(b.length,spec.bytes);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),spec.sha256);}
const checked=C.validate(d,m);assert.equal(checked.rows.length,4416);assert.equal(checked.index.size,4416);
const row={days:100,FFW_events:40,FFW_days:20},base={days:200,FFW_events:50,FFW_days:30};
assert.equal(C.value(row,'FFW','event_days'),20);assert.equal(C.value(row,'FFW','events'),40);
assert.equal(C.compare(row,base,'FFW','event_days','difference'),5);
assert.equal(C.compare(row,base,'FFW','events','difference'),15);
assert.equal(C.compare(row,base,'FFW','event_days','background'),15);
assert.equal(C.value({...row,days:0},'FFW','events'),null);
assert.equal(C.compare({...row,days:0},base,'FFW','events','difference'),null);
const bad=structuredClone(d);bad.rows[0][6]=-1;assert.throws(()=>C.validate(bad,m),/sample/);
const bad2=structuredClone(d);bad2.rows[0][0]='invented';assert.throws(()=>C.validate(bad2,m),/coordinates/);
assert.throws(()=>C.validate({...d,active_prediction:true},m),/inactive/);
const g=JSON.parse(fs.readFileSync('data/historical/geometry.json'));assert.equal(g.regions.length,7);assert(!g.regions.some(r=>r.name==='National CONUS'));
for(const r of g.regions){let cells=0;for(const[x0,y0,x1,y1]of r.runs){assert(x1>x0&&y1>y0);cells+=Math.round((x1-x0)/.25);}assert.equal(cells,r.cells);}
console.log('PASS: full 4,416-cell family, source hashes, denominators, null handling, state partitions, geometry and inactive guards');
