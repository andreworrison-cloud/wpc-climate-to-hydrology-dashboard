const fs=require('fs'),assert=require('node:assert/strict'),crypto=require('crypto');
const C=require('../assets/js/science-contract.js');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const copy=v=>structuredClone(v),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const m=C.manifest(read('data/science/manifest.json'));
for(const [path,spec] of Object.entries(m.files)){
  const raw=fs.readFileSync(path);assert.equal(raw.length,spec.bytes,path);assert.equal(sha(raw),spec.sha256,path);
}
assert.equal(sha(fs.readFileSync('scripts/build_science_review.py')),m.builder_sha256);
const cells=m.domains.flatMap(d=>C.evidence(read(d.path),d.name));
assert.equal(cells.length,5440);assert.equal(cells.filter(r=>r.stratum_type==='annual').length,320);
assert.equal(cells.filter(r=>r.tier==='Research Watch').length,41);
assert.equal(cells.filter(r=>r.tier==='No Qualified Signal').length,5079);
assert.equal(cells.filter(r=>r.stratum_type==='season'&&r.moderate_gates.every(Boolean)).length,0);
const h=C.history(read(m.history_path));
const broken=copy(m);broken.active=true;assert.throws(()=>C.manifest(broken));
for(const change of [v=>v.guidance_defaults.probability=0,v=>v.guidance_defaults.display_state='near_climatology',v=>v.sources=[],v=>v.methodology_sha256='0'.repeat(64)]){
  const bad=copy(m);change(bad);assert.throws(()=>C.manifest(bad));
}
const d=m.domains[0],t=read(d.path);
for(const change of [v=>v.rows.pop(),v=>v.rows[0][6]=[],v=>v.rows[1]=v.rows[0],v=>v.rows[0][5]='Moderate',v=>v.columns.pop()]){
  const bad=copy(t);change(bad);assert.throws(()=>C.evidence(bad,d.name));
}
for(const change of [v=>v.phase4c[0].Precip_Response='SpatialP90',v=>v.phase4c[0].Original_Correction_Family='Filtered128',v=>v.phase4c[0].Event_Rate_Extreme_perDay=0,v=>v.phase4d[0].Core128_FDR_0p05=true,v=>v.lineage.ffw_sha256='unknown']){
  const bad=copy(h);change(bad);assert.throws(()=>C.history(bad));
}
console.log('PASS: 5,440 cells retained; original tiers, trusted history, source hashes and inactive-state rejection checks.');
