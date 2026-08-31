# WPC Climate-to-Hydrology Prediction Dashboard

Phase 1 foundation for a real-time climate-to-hydrology situational awareness dashboard.

## Phase 1 scope

This repository intentionally includes **no unvalidated predictive science**. It provides:

- A responsive dashboard shell modeled after the agreed design target.
- Data contracts for ENSO/RONI, MJO, PNA, NAO, data freshness, and UFVS regional metadata.
- Explicit placeholder panels for future precipitation and flash-flood prediction products.
- A Python validation layer for JSON interfaces.
- GitHub Actions scaffolding for scheduled climate-data updates and GitHub Pages deployment.

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
