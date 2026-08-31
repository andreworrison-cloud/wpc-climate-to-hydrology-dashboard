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
    "mjo_history.json": ["schema_version", "indicator", "values"],
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
    mjo = next((x for x in climate.get("indicators", []) if x.get("id") == "mjo_rmm"), None)

    if not roni or not isinstance(roni.get("value"), (int, float)):
        errors.append("climate_current.json: live RONI value missing/non-numeric")
    elif "NOAA Climate Prediction Center" not in roni.get("source_name", ""):
        errors.append("climate_current.json: RONI source provenance missing")

    if not mjo or not isinstance(mjo.get("amplitude"), (int, float)):
        errors.append("climate_current.json: live MJO amplitude missing/non-numeric")
    else:
        if mjo.get("phase") not in range(1, 9):
            errors.append("climate_current.json: MJO phase must be 1-8")
        if not isinstance(mjo.get("rmm1"), (int, float)) or not isinstance(mjo.get("rmm2"), (int, float)):
            errors.append("climate_current.json: MJO RMM1/RMM2 missing")
        if "Bureau of Meteorology" not in mjo.get("source_name", ""):
            errors.append("climate_current.json: MJO source provenance missing")

    roni_values = loaded.get("roni_history.json", {}).get("values", [])
    if len(roni_values) < 100:
        errors.append("roni_history.json: unexpectedly short historical record")

    mjo_values = loaded.get("mjo_history.json", {}).get("values", [])
    if len(mjo_values) < 1000:
        errors.append("mjo_history.json: unexpectedly short historical record")
    elif not all(k in mjo_values[-1] for k in ("date", "rmm1", "rmm2", "phase", "amplitude")):
        errors.append("mjo_history.json: latest row malformed")

    if errors:
        raise SystemExit("\n".join(errors))
    print("Phase 1B data interfaces validated successfully; live RONI and MJO/RMM are active.")


if __name__ == "__main__":
    main()
