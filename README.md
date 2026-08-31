# Phase 1C — Live PNA ingestion

Replace the matching files in the existing `wpc-climate-to-hydrology-dashboard` repository.

## Files in this patch

- `.github/workflows/update-climate-data.yml`
- `scripts/update_climate_data.py`
- `scripts/validate_data.py`

## What Phase 1C adds

- NOAA/CPC daily Pacific-North American (PNA) index ingestion.
- Primary source: CPC's current CDAS 500-hPa CSV feed.
- Fallback source: CPC's legacy daily PNA ASCII feed.
- Automatic `data/pna_history.json` creation.
- Live PNA value, sign/state, valid date, provenance, and data-health status.
- No hydroclimate or flash-flood prediction is inferred from PNA in this phase.

After committing, manually run **Actions → Update climate data → Run workflow** once. A successful run should update RONI, MJO/RMM, and PNA, create `data/pna_history.json`, commit the refreshed data, and automatically trigger GitHub Pages deployment.
