import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('ocean',Path(__file__).resolve().parents[1]/'scripts/update_ocean_data.py')
ocean=importlib.util.module_from_spec(spec);spec.loader.exec_module(ocean)

class OceanTests(unittest.TestCase):
    def test_source_error_retains_cached_bytes_and_marks_stale(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory); folder=root/'data/ocean';folder.mkdir(parents=True)
            raw=(ocean.ROOT/'data/ocean/ssta_global.png').read_bytes()
            path=folder/'ssta_global.png';path.write_bytes(raw)
            row={'id':'ssta_global','image_path':'data/ocean/ssta_global.png','retrieved_at':'2026-10-18T00:00:00Z','sha256':ocean.hashlib.sha256(raw).hexdigest()}
            (folder/'manifest.json').write_text(json.dumps({'products':[row]}))
            with patch.object(ocean,'ROOT',root),patch.object(ocean.urllib.request,'urlopen',side_effect=OSError('offline')):
                ocean.main()
            result=json.loads((folder/'manifest.json').read_text())
            cached=next(r for r in result['products'] if r['id']=='ssta_global')
            self.assertEqual(cached['status'],'stale')
            self.assertEqual(cached['retrieved_at'],row['retrieved_at'])
            self.assertEqual(path.read_bytes(),raw)
            self.assertTrue(all(r['status']=='unavailable' for r in result['products'] if r['id']!='ssta_global'))
            self.assertIs(result['active_prediction'],False)
    def test_rejects_html_error_and_truncated_png(self):
        for raw in [b'<html>error</html>',b'\x89PNG\r\n\x1a\n'+b'0'*20000]:
            with self.assertRaises(ValueError):ocean.validate_png(raw)
    def test_cached_source_inventory(self):
        data=json.loads((ocean.ROOT/'data/ocean/manifest.json').read_text())
        self.assertEqual(len(data['products']),6)
        for row in data['products']:
            raw=(ocean.ROOT/row['image_path']).read_bytes()
            self.assertEqual(ocean.hashlib.sha256(raw).hexdigest(),row['sha256'])
            ocean.validate_png(raw)
            self.assertEqual(row['baseline'],'1991–2020' if row['product']=='ssta' else None)
            self.assertIsNone(row['valid_time'])
if __name__=='__main__':unittest.main()
