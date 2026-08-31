# Phase 2B.1 — ECMWF MJO Integration

This incremental patch adds ECMWF MJO guidance alongside the existing NOAA/NCEP GEFS guidance.

## Scientific/model labeling

The ECMWF MJO product is explicitly labeled:

**ECMWF IFS Sub-seasonal Ensemble — 100 perturbed members + 1 control**

It is **not** presented as the standalone IFS Control Forecast (ex-HRES / IFS-CF). The cached product is ECMWF's Wheeler–Hendon MJO phase-space guidance derived from the IFS sub-seasonal ensemble.

## Files to replace

- `index.html`
- `assets/js/app.js`
- `scripts/update_climate_data.py`
- `scripts/validate_data.py`

## New runtime output

After a successful climate-data workflow, the repository should contain:

- `data/forecasts/mjo_ecmwf_ifs_subseasonal_ens.png`
- an `mjo_ecmwf_ifs_subseasonal_ens` entry in `data/forecast_status.json`

The ECMWF image is resolved via the official OpenCharts API rather than scraping the human-facing charts page.

## Guardrail

This phase compares climate-driver source guidance only. It does not infer precipitation, MPD, FFW, FFE, or flash-flood impacts, and no model-consensus score is calculated yet. Consensus is reserved for Phase 2B.3.
