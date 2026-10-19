import copy
import importlib.util
import json
import os
import tempfile
import unittest
from datetime import datetime, timezone, timedelta
from pathlib import Path
from unittest.mock import patch
SPEC=importlib.util.spec_from_file_location('briefing',Path(__file__).parents[1]/'scripts/generate_briefing.py')
b=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(b)
NOW=datetime(2026,10,19,10,15,tzinfo=timezone.utc)
PACKET={'facts':[{'id':'obs','layer':'observed','text':'PNA +0.775 on 2026-10-17.'},{'id':'fcst','layer':'forecast','text':'GEFS PNA mean -0.304 at lead 7 days.'}]}
DRAFT={'observed':[{'text':'PNA was +0.775 on 2026-10-17.','evidence_ids':['obs']}],'forecast':[{'text':'GEFS PNA mean is -0.304 at lead 7 days.','evidence_ids':['fcst']}],'watch':[{'text':'Watch the forecast PNA evolution.','evidence_ids':['fcst']}]}
class BriefingTests(unittest.TestCase):
 def test_stale_and_future_inputs(self):
  self.assertEqual(b.freshness('2026-10-14',NOW,72),'stale')
  self.assertEqual(b.freshness('2026-10-20',NOW,72),'invalid_future')
  self.assertEqual(b.freshness(None,NOW,72),'unknown')
 def test_numeric_invention_rejected(self):
  d=copy.deepcopy(DRAFT);d['observed'][0]['text']='PNA was +0.900 on 2026-10-17.'
  with self.assertRaises(ValueError):b.validate_draft(d,PACKET)
 def test_missing_evidence_and_mixed_layers(self):
  for id in ('invented','fcst'):
   d=copy.deepcopy(DRAFT);d['observed'][0]['evidence_ids']=[id]
   with self.assertRaises(ValueError):b.validate_draft(d,PACKET)
 def test_unsupported_impacts_rejected(self):
  d=copy.deepcopy(DRAFT);d['watch'][0]['text']='Watch for increased flooding risk.'
  with self.assertRaises(ValueError):b.validate_draft(d,PACKET)
 def test_supported_draft(self):b.validate_draft(DRAFT,PACKET)
 def test_no_secret_is_not_ai_output(self):
  with tempfile.TemporaryDirectory() as td,patch.dict(os.environ,{},clear=True):
   root=Path(td);b.run(root,NOW)
   self.assertFalse((root/'data/briefing/latest.json').exists())
   self.assertEqual(json.loads((root/'data/briefing/status.json').read_text())['status'],'configuration_required')
 def test_review_failure_preserves_previous(self):
  with tempfile.TemporaryDirectory() as td,patch.dict(os.environ,{'OPENAI_API_KEY':'test-only'},clear=True):
   root=Path(td);p=root/'data/briefing/latest.json';b.write(p,{'issue_date_et':'2026-10-18','sentinel':'keep'});original=p.read_bytes()
   packet=dict(PACKET,source_commit='fixture')
   with patch.object(b,'build_packet',return_value=packet),patch.object(b,'infer',side_effect=[(DRAFT,{'model':'fixture'}),({'approved':False,'reasons':['unsupported']},{'model':'fixture'})]):b.run(root,NOW)
   self.assertEqual(p.read_bytes(),original)
   self.assertEqual(json.loads((p.parent/'status.json').read_text())['status'],'generation_failed')
 def test_one_accepted_issuance_per_eastern_day(self):
  with tempfile.TemporaryDirectory() as td,patch.dict(os.environ,{'OPENAI_API_KEY':'test-only'},clear=True):
   root=Path(td)
   with patch.object(b,'build_packet',return_value=dict(PACKET,source_commit='fixture')),patch.object(b,'infer',side_effect=[(DRAFT,{'model':'fixture'}),({'approved':True,'reasons':[]},{'model':'fixture'})]) as infer:
    b.run(root,NOW);b.run(root,NOW+timedelta(hours=1));self.assertEqual(infer.call_count,2)
   self.assertEqual(json.loads((root/'data/briefing/latest.json').read_text())['status'],'available')
if __name__=='__main__':unittest.main()
