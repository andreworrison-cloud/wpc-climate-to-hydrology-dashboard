# Phase 2B — Forward Pattern Evolution

This patch adds **authoritative forward climate-driver guidance** to the WPC Climate-to-Hydrology Prediction Dashboard while preserving all Phase 1 and Phase 2A functionality.

## Replace these files

- `index.html`
- `assets/css/styles.css`
- `assets/js/app.js`
- `scripts/update_climate_data.py`
- `scripts/validate_data.py`
- `.github/workflows/update-climate-data.yml`

## What Phase 2B adds

The daily climate-data workflow now caches four authoritative forecast graphics under `data/forecasts/` and creates `data/forecast_status.json`:

1. **ENSO / RONI probabilities** — official NOAA/CPC RONI-based seasonal ENSO probability graphic.
2. **MJO / RMM** — NOAA/CPC bias-corrected GEFSv12 Wheeler-Hendon RMM phase-space forecast (15 days).
3. **PNA** — NOAA/CPC GEFS standardized PNA outlook (7-, 10-, and 14-day panels).
4. **NAO** — NOAA/CPC GEFS standardized NAO outlook (7-, 10-, and 14-day panels).

The frontend adds a new **Forward Pattern Evolution** section below Observed Pattern Evolution. Forecast graphics are cached into the repository rather than loaded directly from upstream websites.

## Science guardrail

These products describe forecast evolution of the climate drivers themselves. Phase 2B does **not** translate the guidance into precipitation, flash-flood, MPD, FFW, FFE, or UFVS impact signals. Those layers remain disabled.

## Installation / first run

1. Upload the six replacement files to the matching paths in the existing repository and commit them.
2. Suggested commit message: `Add Phase 2B forward pattern evolution guidance`
3. Go to **Actions → Update climate data → Run workflow**.
4. A successful run should create:
   - `data/forecast_status.json`
   - `data/forecasts/enso_probabilities.png`
   - `data/forecasts/mjo_gefs.png`
   - `data/forecasts/pna_gefs.png`
   - `data/forecasts/nao_gefs.png`
5. The existing Pages handoff should redeploy the dashboard automatically.

A transient forecast-image fetch failure is recorded as degraded forecast guidance but does not intentionally destroy the live observed climate-driver layer.
