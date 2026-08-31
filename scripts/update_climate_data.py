"""Phase 1 climate-ingestion entry point.

This file intentionally does not fabricate climate values. Phase 1 establishes the
interface and automation hook only. Real source adapters for RONI/ENSO, MJO/RMM,
PNA, and NAO should be added one at a time and validated before activation.
"""
from pathlib import Path
from datetime import datetime, timezone
import json

ROOT = Path(__file__).resolve().parents[1]
STATUS = ROOT / "data" / "data_status.json"

def main() -> None:
    data = json.loads(STATUS.read_text())
    data["generated_at"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    STATUS.write_text(json.dumps(data, indent=2) + "\n")
    print("Phase 1 heartbeat complete; predictive science remains disabled.")

if __name__ == "__main__":
    main()
