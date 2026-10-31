const assert=require('node:assert/strict'),fs=require('node:fs');
const C=require('../assets/js/historical-maps.js');
const area=ring=>ring.reduce((s,a,i)=>{const b=ring[(i+1)%ring.length];return s+a[0]*b[1]-b[0]*a[1];},0)/2;
const pointInRings=(x,y,rings)=>{let inside=false;for(const ring of rings)for(let i=0,j=ring.length-1;i<ring.length;j=i++){
 const a=ring[i],b=ring[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
}return inside;};

const adjacent=C.regionRings([[0,0,.5,.25]]);
assert.equal(adjacent.length,1);assert.equal(adjacent[0].length,7);assert.equal(area(adjacent[0]),2*.0625);
const diagonal=C.regionRings([[0,0,.25,.25],[.25,.25,.5,.5]]);
assert.equal(diagonal.length,2);assert.equal(diagonal.reduce((s,r)=>s+area(r),0),2*.0625);
const donut=C.regionRings([[0,0,.75,.25],[0,.25,.25,.5],[.5,.25,.75,.5],[0,.5,.75,.75]]);
assert.equal(donut.length,2);assert.equal(donut.reduce((s,r)=>s+area(r),0),8*.0625);
assert(!pointInRings(.375,.375,donut));assert(pointInRings(.125,.125,donut));
assert.throws(()=>C.regionRings([[0,0,.3,.25]]),/lattice/);
assert.throws(()=>C.regionRings([[0,0,.5,.25],[.25,0,.75,.25]]),/overlapping/);

const geometry=JSON.parse(fs.readFileSync('data/historical/geometry.json'));
let tested=0,totalCells=0;
for(const region of geometry.regions){
 const cells=new Set();for(const[x0,y0,x1,y1]of region.runs)for(let y=Math.round(y0*4);y<Math.round(y1*4);y++)for(let x=Math.round(x0*4);x<Math.round(x1*4);x++)cells.add(`${x},${y}`);
 const rings=C.regionRings(region.runs);assert.equal(cells.size,region.cells);assert.equal(rings.reduce((s,r)=>s+area(r),0)/.0625,region.cells);
 for(const ring of rings){assert.deepEqual(ring[0],ring.at(-1));for(let i=1;i<ring.length;i++)assert.equal(Math.abs(ring[i][0]-ring[i-1][0])+Math.abs(ring[i][1]-ring[i-1][1]),.25);}
 // Check every cell center in and around the regional bounding box, including
 // holes and unoccupied coastal cells; area equality alone is insufficient.
 const points=[...cells].map(k=>k.split(',').map(Number)),xmin=Math.min(...points.map(p=>p[0]))-1,xmax=Math.max(...points.map(p=>p[0]))+1,ymin=Math.min(...points.map(p=>p[1]))-1,ymax=Math.max(...points.map(p=>p[1]))+1;
 for(let y=ymin;y<=ymax;y++)for(let x=xmin;x<=xmax;x++){assert.equal(pointInRings((x+.5)/4,(y+.5)/4,rings),cells.has(`${x},${y}`),`${region.name}: changed mask cell ${x},${y}`);tested++;}
 totalCells+=region.cells;
}
assert.equal(totalCells,13624);
assert.equal(C.scaleMaximum([null,0]),1);assert.equal(C.scaleMaximum([3.9,-4.2,null]),5);
assert.equal(C.scaleMaximum([17.8,8.2]),20);assert.equal(C.scaleMaximum([99],100),100);
assert.equal(C.scaleMaximum([125.1]),200);
assert.equal(C.color(null,20,false,'FFW'),'#172735');
assert.equal(C.color(20,20,false,'FFW'),'rgb(169,0,39)');
assert.equal(C.color(20,20,false,'LSR_FLASH'),'rgb(0,123,73)');
assert.equal(C.color(0,5,true,'FFW'),C.color(0,5,true,'LSR'));
assert.equal(C.color(-5,5,true,'FFW'),'rgb(112,185,255)');
assert.equal(C.color(5,5,true,'FFW'),'rgb(255,60,85)');
assert.equal(C.color(5,5,true,'LSR'),'rgb(37,235,152)');
assert.equal(C.color(9,5,true,'FFW'),C.color(5,5,true,'FFW'));
console.log(`PASS: dissolved masks preserve all ${totalCells} cells (${tested} cell-center checks), holes/islands, zero-centered differences and distinct FFW/LSR color scales`);
