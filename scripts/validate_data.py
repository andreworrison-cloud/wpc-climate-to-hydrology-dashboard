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
    "roni_history.json": ["schema_version", "indicator", "values"],
}


def main() -> None:
    errors = []
    loaded = {}
    for name, keys in REQUIRED.items():
        path = DATA / name
        try:
            obj = json.loads(path.read_text(encoding="utf-8"))
            loaded[name] = obj
        except Exception as exc:
            errors.append(f"{name}: unable to parse JSON: {exc}")
            continue
        for key in keys:
            if key not in obj:
                errors.append(f"{name}: missing key '{key}'")

    climate = loaded.get("climate_current.json", {})
    roni = next((x for x in climate.get("indicators", []) if x.get("id") == "roni"), None)
    if not roni:
        errors.append("climate_current.json: missing RONI indicator")
    else:
        if not isinstance(roni.get("value"), (int, float)):
            errors.append("climate_current.json: live RONI value is not numeric")
        if not roni.get("valid_time"):
            errors.append("climate_current.json: live RONI valid_time missing")
        if "NOAA Climate Prediction Center" not in roni.get("source_name", ""):
            errors.append("climate_current.json: RONI source provenance missing")

    hist = loaded.get("roni_history.json", {})
    values = hist.get("values", [])
    if len(values) < 100:
        errors.append("roni_history.json: unexpectedly short historical record")
    elif not all(k in values[-1] for k in ("season", "year", "value")):
        errors.append("roni_history.json: latest row malformed")

    if errors:
        raise SystemExit("\n".join(errors))
    print("Phase 1A data interfaces validated successfully; live RONI is active.")


if __name__ == "__main__":
    main()
