# Phase 2B.3.1 — Structured GEFS PNA/NAO Teleconnection Ingestion

This increment moves the consensus layer away from chart-image interpretation.

Official CPC rotating 120-day GEFS machine-readable inputs:
- `norm.daily.pna.gefs.z500.120days.csv`
- `norm.daily.nao.gefs.z500.120days.csv`

New output:
- `data/gefs_teleconnections.json`

For the latest identifiable GEFS cycle, the script summarizes Days 5, 7, 10, and 14:
ensemble mean/median, spread, range, sign probabilities, |index|>=1 probability, and member count.

High/Moderate/Low consensus remains disabled. This structures the GEFS side only; ECMWF structured evidence comes next.

Replace:
- `scripts/update_climate_data.py`
- `scripts/validate_data.py`

Then run the `Update climate data` workflow once.
