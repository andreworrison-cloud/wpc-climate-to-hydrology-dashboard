"""Verify common-cycle publication and failure retention without network."""
import importlib.util,json,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('collector',Path(__file__).resolve().parents[1]/'scripts/update_reanalyzer.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class RegionalTests(unittest.TestCase):
 def fake(self,url,headers=None):
  if '/dates/' in url:
   dates=['2026-10-28-00z']
   if 'na-lc' in url:dates+=['2026-10-28-06z']
   return json.dumps(dates).encode(),{}
  if url.endswith('/flist.json'):
   d,v=url.split('/')[-3:-1]
   return json.dumps([f'gfs_{d}_{v}_2026102800_000.png']).encode(),{}
  return b'verified map payload',{}
 def test_common_cycle_and_failed_refresh(self):
  with tempfile.TemporaryDirectory() as t,patch.object(m,'ROOT',Path(t)),patch.object(m,'get',self.fake),patch.object(m,'png_valid',return_value=(1024,789)):
   rows=m.regional_context({},'now')
   current=[r for r in rows if r['status']=='current']
   self.assertEqual(len(current),10)
   self.assertEqual({r['valid_time'] for r in current},{'2026-10-28T00:00:00+00:00'})
   self.assertEqual({r['lead_hours'] for r in current},{0})
   with patch.object(m,'get',side_effect=ValueError('partial source failure')):
    retained=m.regional_context({'atmosphere':{'maps':rows}},'later')
    self.assertEqual(sum(r['status']=='retained' for r in retained),9)
    self.assertEqual({r['sha256'] for r in retained if r['status']=='retained'},{r['sha256'] for r in current})
    initial=m.regional_context({},'later')
    self.assertFalse(any(r.get('path') for r in initial))
if __name__=='__main__':unittest.main()
