"""Production source-cache integrity, independent failures and no-op behavior."""
import copy
import csv
from datetime import date, timedelta
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
import build_presentation_review as p
from refresh_dashboard import restore_unchanged


class PresentationRefreshTests(unittest.TestCase):
 def setUp(self):
  self.folder=tempfile.TemporaryDirectory();self.addCleanup(self.folder.cleanup);self.root=Path(self.folder.name)
  out=io.BytesIO();Image.new('RGB',(240,200),'navy').save(out,format='PNG');self.image=out.getvalue()
  self.weekly='Nino1+2 Nino3 Nino34 Nino4 SST SSTA\n'+'\n'.join((date(2024,1,3)+timedelta(weeks=i)).strftime('%d%b%Y').upper()+' 28.0 0.3 27.0-0.4 26.0 0.1 29.0 0.5' for i in range(105))
  self.gefs={}
  for driver in ['pna','nao']:
   out=io.StringIO();w=csv.writer(out);w.writerow(['lead','member','time',driver+'_index','valid_time'])
   for lead in range(16):
    for member in range(31):w.writerow([lead,member,'2026-10-24',member/10,(date(2026,10,24)+timedelta(days=lead)).isoformat()])
   self.gefs[driver]={'presentation_trajectory':dict(p.trajectory(out.getvalue(),driver),status='available',retrieved_at='2026-10-24T12:00:00Z')}

 def seed(self):
  def source(url,prior=None):
   self.assertNotIn('gefs',url)  # Reuses the response already fetched by the daily job.
   return (self.weekly.encode() if url.endswith('.for') else self.image),{'etag':'"fixture"','last-modified':'Sat, 24 Oct 2026 12:00:00 GMT'}
  with patch.object(p,'fetch',side_effect=source):p.refresh_context(self.root,self.gefs)
  return json.loads((self.root/'data/presentation/context.json').read_text())

 def test_conditional_noop_and_dated_payloads(self):
  first=self.seed();path=self.root/'data/presentation/context.json';before={path:path.read_bytes()}
  images={r['path']:(self.root/r['path']).stat().st_mtime_ns for r in first['products']}
  def unchanged(url,prior=None):
   self.assertNotIn('gefs',url);self.assertEqual(prior['etag'],'"fixture"');return None,{}
  with patch.object(p,'fetch',side_effect=unchanged):p.refresh_context(self.root,self.gefs)
  restore_unchanged(before);self.assertEqual(path.read_bytes(),before[path])
  self.assertEqual(images,{name:(self.root/name).stat().st_mtime_ns for name in images})
  self.assertEqual(first['weekly']['values'][0]['nino3'],-.4)
  self.assertEqual(first['weekly']['date_role'],'week_centered_on')
  self.assertTrue(p.valid_payload(first['weekly']))
  self.assertTrue(all(p.valid_payload(v) for v in first['gefs'].values()))

 def test_failure_retains_verified_cache_without_new_retrieval_date(self):
  first=self.seed();broken={'pna':{'presentation_trajectory':{'status':'unavailable','error':'Incomplete latest cycle'}},'nao':self.gefs['nao']}
  with patch.object(p,'fetch',side_effect=OSError('Source offline')):p.refresh_context(self.root,broken)
  result=json.loads((self.root/'data/presentation/context.json').read_text())
  for old,new in zip(first['products'],result['products']):
   self.assertEqual(new['status'],'stale');self.assertEqual(new['path'],old['path']);self.assertEqual(new['retrieved_at'],old['retrieved_at'])
  self.assertEqual(result['weekly']['status'],'stale');self.assertEqual(result['weekly']['retrieved_at'],first['weekly']['retrieved_at'])
  self.assertEqual(result['gefs']['pna']['status'],'stale');self.assertEqual(result['gefs']['pna']['days'],first['gefs']['pna']['days'])
  self.assertEqual(result['gefs']['nao']['status'],'available')

 def test_corrupt_cache_is_unavailable_and_hash_named_cleanup_is_bounded(self):
  first=self.seed();(self.root/first['products'][0]['path']).write_bytes(b'corrupt')
  first['weekly']['values'][0]['nino3']=99;first['gefs']['pna']['days'][0]['median']=99
  path=self.root/'data/presentation/context.json';path.write_bytes(p.encoded(first))
  # File checkout times cannot establish product age in a fresh Actions clone.
  old=self.root/'data/presentation/upper_ocean_20240101_0000000000000000.png';old.write_bytes(self.image)
  legacy=self.root/'data/presentation/upper_ocean.png';legacy.write_bytes(self.image)
  broken={'pna':{'presentation_trajectory':{'status':'unavailable'}}}
  with patch.object(p,'fetch',side_effect=OSError('Offline')):p.refresh_context(self.root,broken)
  result=json.loads(path.read_text())
  self.assertEqual(result['products'][0]['status'],'unavailable');self.assertNotIn('path',result['products'][0])
  self.assertEqual(result['weekly']['status'],'unavailable');self.assertNotIn('values',result['weekly'])
  self.assertEqual(result['gefs']['pna']['status'],'unavailable');self.assertNotIn('days',result['gefs']['pna'])
  self.assertFalse(old.exists());self.assertTrue(legacy.exists())

if __name__=='__main__':unittest.main()
