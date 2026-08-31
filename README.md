# WPC Climate-to-Hydrology Prediction Dashboard — Phase 2B.2

Phase 2B.2 expands Forward Pattern Evolution into a model-organized multi-model layer while preserving all Phase 1, Phase 2A, and Phase 2B.1 functionality.

## What changes

- CPC ENSO/RONI probabilities remain a separate **Seasonal Background** product.
- A dynamic forecast-calendar legend is added beneath the CPC ENSO/RONI image, translating the overlapping 3-month seasons into an explicit calendar span.
- The multi-model section is organized consistently as **GEFS on the left / ECMWF IFS Sub-seasonal Ensemble on the right**.
- MJO compares GEFS and ECMWF Wheeler–Hendon ensemble guidance directly.
- PNA compares the GEFS standardized PNA-index outlook against **ECMWF Pacific-sector weekly 500-hPa height-anomaly circulation context**. The ECMWF product is explicitly *not* labeled as a PNA-index forecast.
- NAO compares the GEFS standardized NAO-index outlook against **ECMWF Euro-Atlantic weather-regime probabilities** (NAO+, NAO−, Scandinavian Blocking, Atlantic Ridge, and no clear regime).

## ECMWF terminology

All new ECMWF products are labeled as **ECMWF IFS Sub-seasonal Ensemble — 100 perturbed members + 1 control**. They are not presented as standalone IFS Control Forecast products.

## Files to replace

- `index.html`
- `assets/css/styles.css`
- `assets/js/app.js`
- `scripts/update_climate_data.py`
- `scripts/validate_data.py`

After committing, run **Actions → Update climate data → Run workflow** to cache the two new ECMWF products and refresh `forecast_status.json`.

## Science guardrail

Phase 2B.2 remains a climate-driver/pattern guidance layer. It does not infer precipitation, MPD, FFW, FFE, or flash-flood impacts.
