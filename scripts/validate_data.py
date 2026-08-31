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
    "pna_history.json": ["schema_version", "indicator", "values"],
    "nao_history.json": ["schema_version", "indicator", "values"],
    "forecast_status.json": ["schema_version", "products", "science_guardrail"],
    "gefs_teleconnections.json": ["schema_version", "drivers", "science_guardrail"],
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
    pna = next((x for x in climate.get("indicators", []) if x.get("id") == "pna"), None)
    nao = next((x for x in climate.get("indicators", []) if x.get("id") == "nao"), None)

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

    if not pna or not isinstance(pna.get("value"), (int, float)):
        errors.append("climate_current.json: live PNA value missing/non-numeric")
    elif "NOAA Climate Prediction Center" not in pna.get("source_name", ""):
        errors.append("climate_current.json: PNA source provenance missing")

    if not nao or not isinstance(nao.get("value"), (int, float)):
        errors.append("climate_current.json: live NAO value missing/non-numeric")
    elif "NOAA Climate Prediction Center" not in nao.get("source_name", ""):
        errors.append("climate_current.json: NAO source provenance missing")

    roni_values = loaded.get("roni_history.json", {}).get("values", [])
    if len(roni_values) < 100:
        errors.append("roni_history.json: unexpectedly short historical record")

    mjo_values = loaded.get("mjo_history.json", {}).get("values", [])
    if len(mjo_values) < 1000:
        errors.append("mjo_history.json: unexpectedly short historical record")
    elif not all(k in mjo_values[-1] for k in ("date", "rmm1", "rmm2", "phase", "amplitude")):
        errors.append("mjo_history.json: latest row malformed")

    pna_values = loaded.get("pna_history.json", {}).get("values", [])
    if len(pna_values) < 1000:
        errors.append("pna_history.json: unexpectedly short historical record")
    elif not all(k in pna_values[-1] for k in ("date", "value")):
        errors.append("pna_history.json: latest row malformed")

    nao_values = loaded.get("nao_history.json", {}).get("values", [])
    if len(nao_values) < 1000:
        errors.append("nao_history.json: unexpectedly short historical record")
    elif not all(k in nao_values[-1] for k in ("date", "value")):
        errors.append("nao_history.json: latest row malformed")


    forecast = loaded.get("forecast_status.json", {})
    products = forecast.get("products", [])
    expected = {"enso_probabilities", "mjo_gefs", "mjo_ecmwf_ifs_subseasonal_ens", "pna_gefs", "pna_context_ecmwf_z500_pacific", "nao_gefs", "nao_context_ecmwf_regimes"}
    found = {x.get("id") for x in products}
    if not expected.issubset(found):
        errors.append(f"forecast_status.json: missing forecast products {sorted(expected-found)}")
    for product in products:
        if product.get("status") == "live":
            image_path = product.get("image_path")
            if not image_path or not (ROOT / image_path).exists():
                errors.append(f"forecast_status.json: live product {product.get('id')} has no cached image")


    structured = loaded.get("gefs_teleconnections.json", {})
    structured_drivers = structured.get("drivers", {})
    for key in ("pna", "nao"):
        if key not in structured_drivers:
            errors.append(f"gefs_teleconnections.json: missing {key.upper()} structured driver")
            continue
        rec = structured_drivers[key]
        if rec.get("status") == "live":
            summaries = rec.get("lead_summaries", [])
            targets = {x.get("target_day") for x in summaries}
            if not {5, 7, 10, 14}.issubset(targets):
                errors.append(f"gefs_teleconnections.json: {key.upper()} missing target lead summaries")
            for row in summaries:
                if not isinstance(row.get("mean"), (int, float)) or not isinstance(row.get("stdev"), (int, float)):
                    errors.append(f"gefs_teleconnections.json: {key.upper()} malformed mean/spread")
                for probkey in ("prob_positive", "prob_negative", "prob_abs_ge_1"):
                    prob = row.get(probkey)
                    if not isinstance(prob, (int, float)) or not (0 <= prob <= 1):
                        errors.append(f"gefs_teleconnections.json: {key.upper()} invalid {probkey}")

    if errors:
        raise SystemExit("\n".join(errors))
    print("Phase 2B.3.1 validated: source graphics and structured GEFS PNA/NAO consensus inputs are available.")


if __name__ == "__main__":
    main()
