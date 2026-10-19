import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
from refresh_dashboard import restore_unchanged, substantive

class RefreshTests(unittest.TestCase):
    def test_noop_preserves_bytes(self):
        with tempfile.TemporaryDirectory() as folder:
            p=Path(folder)/'data.json'
            old=b'{"retrieved_at":"old","value":1}'
            p.write_text('{"retrieved_at":"new","value":1}')
            restore_unchanged({p:old})
            self.assertEqual(p.read_bytes(),old)
    def test_revision_and_failure_are_changes(self):
        for field,value in [('value',2),('status','stale'),('valid_time','new')]:
            self.assertNotEqual(substantive({'value':1,'status':'available','valid_time':'old'}),
                                substantive({'value':1,'status':'available','valid_time':'old',field:value}))
