import copy
import csv
from datetime import date,timedelta
import hashlib
import io
import json
from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from build_presentation_review import trajectory
ROOT=Path(__file__).resolve().parents[1]
class PresentationTests(unittest.TestCase):
 def test_preserved_family_hashes_and_support(self):
  m=json.loads((ROOT/'data/presentation/research_manifest.json').read_text());self.assertIs(m['active_prediction'],False);self.assertEqual(m['original_family'],96);self.assertEqual(m['minimum_mjo_ess'],30)
  for path,spec in m['files'].items():
   raw=(ROOT/path).read_bytes();self.assertEqual(hashlib.sha256(raw).hexdigest(),spec['sha256']);self.assertEqual(len(raw),spec['bytes'])
  r=json.loads((ROOT/m['roni_path']).read_text())['records'];self.assertEqual(len(r),64);self.assertEqual(sum(x['supported'] for x in r),2)
  curves=grid=0
  for d in m['domains']:
   v=json.loads((ROOT/d['path']).read_text());self.assertIs(v['active_prediction'],False)
   curves+=sum(len(g['points']) for g in v['curves'].values());grid+=sum(len(g['points']) for g in v['mjo'].values())
   for g in v['mjo'].values():
    self.assertEqual(g['bandwidth'],.65)
    for p in g['points']:self.assertEqual(p[3],p[2]>=30)
  self.assertEqual(curves,5120);self.assertEqual(grid,108160)
 def test_image_hashes_and_original_static_frames(self):
  from PIL import Image
  m=json.loads((ROOT/'data/presentation/context.json').read_text());self.assertIs(m['active_prediction'],False)
  for r in m['products']:
   self.assertIsNone(r['valid_time']);self.assertIsNone(r['initialization_time'])
   if r['status']=='available':
    p=ROOT/r['path'];self.assertEqual(hashlib.sha256(p.read_bytes()).hexdigest(),r['sha256'])
    with Image.open(p) as image:self.assertEqual(image.n_frames,1)
 def test_complete_numerical_members_and_date_only(self):
  out=io.StringIO();w=csv.writer(out);w.writerow(['lead','member','time','pna_index','valid_time'])
  for lead in range(16):
   for member in range(31):w.writerow([lead,member,'2026-10-24',(member-15)/10+lead/20,(date(2026,10,24)+timedelta(days=lead)).isoformat()])
  text=out.getvalue();d=trajectory(text,'pna');self.assertIsNone(d['initialization_time']);self.assertEqual(d['days'][0]['median'],0);self.assertAlmostEqual(d['days'][0]['p10'],-1.2);self.assertEqual(d['days'][15]['date'],'2026-11-08')
  for bad in ['\n'.join(text.splitlines()[:-1]),text.replace('2026-11-08','2026-11-09'),'\n'.join(text.splitlines()[:-1]+[text.splitlines()[1]])]:
   with self.assertRaises(ValueError):trajectory(bad,'pna')
if __name__=='__main__':unittest.main()
