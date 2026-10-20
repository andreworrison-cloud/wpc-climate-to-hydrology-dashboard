import importlib.util,unittest
from datetime import date
from pathlib import Path
spec=importlib.util.spec_from_file_location('cr',Path(__file__).resolve().parents[1]/'scripts/update_reanalyzer.py');cr=importlib.util.module_from_spec(spec);spec.loader.exec_module(cr)
class CalendarTests(unittest.TestCase):
 def records(self,year):
  return [{'name':str(year),'data':[None]*366},{'name':'Preliminary','data':[None]*366},{'name':'1991-2020','data':[20+i/1000 for i in range(366)]}]
 def test_nonleap_march_uses_calendar_baseline(self):
  r=self.records(2025);r[0]['data'][59]=25
  row=cr.parse_series(r,2025,date(2025,3,2))[0]
  self.assertEqual(row['date'],'2025-03-01');self.assertEqual(row['climatology_c'],20.06)
 def test_leap_day(self):
  r=self.records(2024);r[0]['data'][59]=25;r[0]['data'][60]=26
  rows=cr.parse_series(r,2024,date(2024,3,2));self.assertEqual([r['date'] for r in rows],['2024-02-29','2024-03-01']);self.assertEqual(rows[1]['climatology_c'],20.06)
 def test_finalized_beats_preliminary_overlap(self):
  r=self.records(2026);r[0]['data'][1]=21;r[1]['data'][1]=22;r[1]['data'][2]=23
  rows=cr.parse_series(r,2026,date(2026,1,4));self.assertFalse(rows[0]['preliminary']);self.assertEqual(rows[0]['sst_c'],21);self.assertTrue(rows[1]['preliminary'])
 def test_future_and_bad_schema_rejected(self):
  r=self.records(2026);r[1]['data'][20]=25
  with self.assertRaises(ValueError):cr.parse_series(r,2026,date(2026,1,1))
  r=self.records(2026);r[2]['data']=r[2]['data'][:-1]
  with self.assertRaises(ValueError):cr.parse_series(r,2026,date(2026,1,1))
 def test_html_not_accepted_as_image(self):
  with self.assertRaises(ValueError):cr.png_valid(b'<html>error</html>')
if __name__=='__main__':unittest.main()
