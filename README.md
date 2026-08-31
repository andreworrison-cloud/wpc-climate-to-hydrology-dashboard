# WPC Climate-to-Hydrology Prediction Dashboard

Phase 1 foundation for a real-time climate-to-hydrology situational awareness dashboard.

**Phase 1A:** NOAA/CPC ERSSTv6 Relative Oceanic Niño Index (RONI) live ingestion is active. MJO/RMM, PNA, and NAO remain staged interfaces pending individual validation.

## Phase 1 scope

This repository intentionally includes **no unvalidated predictive science**. It provides:

- A responsive dashboard shell modeled after the agreed design target.
- Data contracts for ENSO/RONI, MJO, PNA, NAO, data freshness, and UFVS regional metadata.
- Explicit placeholder panels for future precipitation and flash-flood prediction products.
- A Python validation layer for JSON interfaces.
- GitHub Actions scaffolding for scheduled climate-data updates and GitHub Pages deployment.
- Live NOAA/CPC RONI ingestion with source provenance, retrieval time, historical archive, and provisional-value labeling.

## Architecture

Authoritative climate sources -> Python ingestion/cache -> normalized JSON -> dashboard frontend

Future phases add:

historical analog engine -> precipitation prediction engine -> flash-flood prediction engine -> UFVS regional interpretation

## Repository layout

```text
.github/workflows/       GitHub Actions
assets/css/              Dashboard styling
assets/js/               Dashboard rendering logic
data/                    Normalized dashboard JSON interfaces
docs/                    Architecture and data-contract notes
scripts/                 Ingestion/validation code
index.html               GitHub Pages entry point
```

## Local preview

From the repository root:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Important

All forward-looking precipitation and flash-flood panels are intentionally marked **RESEARCH PLACEHOLDER — NOT ACTIVE** until historical testing establishes skill.

## Phase 1A — live RONI

Source: NOAA Climate Prediction Center ERSSTv6 Relative Oceanic Niño Index (RONI).

The update workflow checks the source daily and writes the latest value to `data/climate_current.json` plus the full parsed record to `data/roni_history.json`. The dashboard treats the newest RONI as observational/provisional only; it does **not** convert RONI into precipitation or flash-flood guidance. NOAA/CPC notes that recent RONI values can be revised for up to two months.

## Phase 1B — Live MJO/RMM

Phase 1B adds daily observed Wheeler-Hendon RMM ingestion from the Australian Bureau of Meteorology. The dashboard stores RMM1, RMM2, phase, amplitude, phase-region metadata, and a historical archive in `data/mjo_history.json`. This is observational climate-state monitoring only; no hydroclimate outcome is inferred from the MJO state.

The Pages workflow also listens for successful completion of `Update climate data`, so climate-data refreshes automatically redeploy the latest `main` branch to GitHub Pages.
