const assert=require('node:assert/strict');
const {basinLayout,lonLabel,latLabel}=require('../assets/js/ocean-basin.js');
for(const region of ['pacific','atlantic']){
 const p=basinLayout(1548,892,region);
 assert.ok(p.width+2*p.margin>p.headerHeight+p.mapHeight+p.legendHeight+2*p.margin,'landscape canvas');
 assert.ok(p.mapY>103&&p.mapY+p.sourceHeight<761,'polar areas cropped');
 for(const [x,w] of p.segments)assert.ok(x>=32&&x+w<=1516,'source frame excluded');
}
const pac=basinLayout(1548,892,'pacific');
assert.equal(pac.segments[0][0]+pac.segments[0][1],1516);
assert.equal(pac.segments[1][0],32);
assert.deepEqual(pac.bounds,{west:100,east:280,south:-45,north:45});
assert.equal(basinLayout(1548,892,'atlantic').segments.length,1);
assert.equal(lonLabel(180),'180°');assert.equal(lonLabel(280),'80°W');assert.equal(lonLabel(100),'100°E');assert.equal(latLabel(0),'EQ');
assert.throws(()=>basinLayout(1600,900,'atlantic'),/layout changed/);
assert.throws(()=>basinLayout(1548,892,'indian'),/Unknown/);
console.log('Landscape extents, frame exclusion, coordinate labels and layout guard: PASS');

assert.equal(pac.width,basinLayout(1548,892,'atlantic').width);
assert.equal(pac.mapHeight,basinLayout(1548,892,'atlantic').mapHeight);
