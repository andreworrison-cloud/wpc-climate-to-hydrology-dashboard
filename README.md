# Phase 1D — Live NAO Ingestion

This patch activates the NOAA Climate Prediction Center daily North Atlantic Oscillation (NAO) index while preserving the working Phase 1A–1C RONI, MJO/RMM, and PNA adapters.

## Replace these files

- `.github/workflows/update-climate-data.yml`
- `scripts/update_climate_data.py`
- `scripts/validate_data.py`

## New generated file

A successful workflow run will create `data/nao_history.json` and update `data/climate_current.json` plus `data/data_status.json`.

## Source

Primary: NOAA/CPC CDAS daily NAO CSV (`norm.daily.nao.cdas.z500.19500101_current.csv`).
Fallback: legacy CPC daily NAO ASCII feed.

The dashboard presents the observed standardized daily NAO index only. No precipitation or flash-flood implication is inferred by this Phase 1D adapter.
