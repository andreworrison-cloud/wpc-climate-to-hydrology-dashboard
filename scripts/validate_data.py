from __future__ import annotations
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
REQUIRED = {
    "climate_current.json": ["schema_version", "indicators"],
    "data_status.json": ["schema_version", "datasets"],
    "pattern_evolution.json": ["schema_version", "windows"],
    "ufvs_regions.json": ["schema_version", "regions"],
}

def main() -> None:
    errors = []
    for name, keys in REQUIRED.items():
        path = DATA / name
        try:
            obj = json.loads(path.read_text())
        except Exception as exc:
            errors.append(f"{name}: unable to parse JSON: {exc}")
            continue
        for key in keys:
            if key not in obj:
                errors.append(f"{name}: missing key '{key}'")
    if errors:
        raise SystemExit("\n".join(errors))
    print("Phase 1 data interfaces validated successfully.")

if __name__ == "__main__":
    main()
