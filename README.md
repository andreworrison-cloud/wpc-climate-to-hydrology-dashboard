# Phase 2B.3.2 — Structured ECMWF Evidence Extraction

This phase preserves the science guardrail: no forecast chart pixels are interpreted.

## ECMWF MJO
Uses ECMWF's public S2S MJO RMM index feed (`RMMS`) with the documented public `s2sidx` credentials.
If the latest ECMF file is safely parsed, the script derives numerical ensemble summaries for Days 5, 10, 15, and 20:
- ensemble-mean RMM1/RMM2
- ensemble-mean amplitude
- member-mean amplitude
- active-member fraction (amplitude >= 1)
- ensemble-mean phase
- dominant member phase and fraction
- member counts by phase

## ECMWF Pacific / PNA context
The public OpenCharts API is a graphical-product API. The script stores its structured metadata and explicitly marks numerical PNA-equivalent evidence as unavailable rather than inventing an ECMWF standardized PNA index.

## ECMWF NAO regimes
The script stores structured product metadata, documented regime categories, and ensemble-size provenance. The OpenCharts graphical endpoint does not expose the daily bar probabilities as machine-readable values, so those probabilities remain guarded and are not inferred from pixels.

New output:
- `data/ecmwf_consensus_inputs.json`

Replace:
- `scripts/update_climate_data.py`
- `scripts/validate_data.py`

Then run the `Update climate data` workflow once.

Expected useful log lines:
- `STRUCTURED ECMWF MJO: ...`
- `STRUCTURED ECMWF PNA CONTEXT: metadata live...`
- `STRUCTURED ECMWF NAO REGIMES: metadata live...`

High/Moderate/Low consensus is still not activated in this phase.
