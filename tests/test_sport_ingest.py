import sys,json,unittest,hashlib
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import update_sport_sst as sport

class InventoryTests(unittest.TestCase):
 def test_rejects_wrong_product_or_domain(self):
  with patch.object(sport.urllib.request,'urlopen'),patch.object(sport.json,'load',return_value={'thisDataset':{'cgi_key':'imerglate'}}):
   with self.assertRaises(ValueError):sport.inventory('esst06','sst_legacy','global')
 def test_selects_latest_valid_frame(self):
  d={'thisDataset':{'cgi_key':'esst06'},'thisProduct':{'cgi_key':'sst_legacy'},'thisLocation':{'cgi_key':'global'},'data':[
    {'time':'Oct 17, 2026 - 06:00 UTC','path':'/sport/dynamic/enhanced_sst/old.png'},
    {'time':'Oct 18, 2026 - 06:00 UTC','path':'/sport/dynamic/enhanced_sst/new.png'}]}
  with patch.object(sport.urllib.request,'urlopen'),patch.object(sport.json,'load',return_value=d):
   dt,path,url=sport.inventory('esst06','sst_legacy','global');self.assertTrue(path.endswith('/new.png'));self.assertEqual(dt.hour,6)
 def test_cached_manifest(self):
  d=json.loads((sport.ROOT/'data/ocean/sport_manifest.json').read_text());self.assertEqual(len(d['products']),6)
  for r in d['products']:
   self.assertEqual(r['provider'],'sport');self.assertIn(r['status'],['available','stale'])
   self.assertEqual(hashlib.sha256((sport.ROOT/r['image_path']).read_bytes()).hexdigest(),r['sha256'])
   self.assertEqual(r['baseline'],'MERRA-2 1991–2020' if r['product']=='ssta' else None)
   self.assertIsNotNone(r['valid_time'])
if __name__=='__main__':unittest.main()
