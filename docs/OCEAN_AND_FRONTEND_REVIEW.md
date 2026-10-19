# Ocean context and frontend review

This branch introduces an observed ocean viewer and a forecaster-oriented visual hierarchy while preserving the existing climate ingestion and GEFS-left/ECMWF-right charts. It does not modify Q3, Q6 evidence, model coefficients, historical science exports, or activation flags.

## Included

- Four observed driver cards with compact historical sparklines.
- NOAA source-rendered daily SST and SST anomaly maps: Global, Pacific, Caribbean.
- Explicit anomaly baseline: 1991–2020, product v3.1-clim19912020-v1. The bleaching-specific anomaly baseline is deliberately not substituted.
- Original NOAA observation dates, legends and attribution remain visible in the images.
- Local image caching and SHA256 records; failed refreshes retain prior verified images marked stale. Missing images remain unavailable. The frontend independently checks delivery age so a stopped workflow cannot appear indefinitely current.
- Four distinct layers: observed climate, forecast drivers, model-derived precipitation, historical impacts.
- Seven regional selectors, four lead windows and two target selectors. Current science records are not connected: all regional guidance is unavailable/inactive. No qualified signal and near climatology have distinct definitions, and neither is assigned as a missing-data default.
- Keyboard focus, skip link, responsive layouts and reduced-motion support.

## Scientific limits

SST context is not RONI and is not a Q3 predictor. No implied causal or forecast flood relationship is added. No private science exports are included in this branch. Historical FFW/LSR and analog graphics remain unpopulated pending verified export integration. Regional polygon mapping awaits connection of the recovered authoritative geometry; approximate bounds are not used as scientific masks.

Image valid_time is intentionally null: source image titles carry the observation date. HTTP Last-Modified and retrieval time are delivery metadata, not observation times. Images can update independently and should be compared using their printed dates.

## Review and release

Run `python scripts/validate_data.py`, `python -m unittest discover -s tests`, and `node --check assets/js/workbench.js`. The daily climate workflow now also caches ocean imagery. Initial source downloads and cached PNG hashes were checked. Browser visual QA has not been completed in this environment; inspect desktop/mobile layout and all controls before merging. Keep this development branch separate from main until visual review.

Sources:
- https://www.coralreefwatch.noaa.gov/product/5km/index_5km_sst.php
- https://www.coralreefwatch.noaa.gov/product/5km/index_5km_ssta_clim19912020.php
