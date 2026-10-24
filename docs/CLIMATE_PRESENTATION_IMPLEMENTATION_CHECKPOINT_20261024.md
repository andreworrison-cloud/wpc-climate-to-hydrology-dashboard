# Climate presentation package — implementation checkpoint, 2026-10-24

Status: INITIAL RENDERS REVIEWED; FINAL TESTS AND IMPLEMENTATION SAVE BLOCKED BY EXECUTION-WORKSPACE OUTAGE.

This checkpoint preserves the work specification and verified input identities. The corresponding new implementation files and derived assets were created in the execution workspace but have NOT yet been committed to this branch. The existing Q6 integration remains at commit 7662104b0669b30ee17b4ef61df0cd0d28713850. This document must not be interpreted as a completed feature release or numerical science closure.

## Approved package

Andrew authorized five upgrades while the selection-impact Colab audit continues: historical climate–precipitation atlas, equatorial Pacific diagnostics, interactive GEFS PNA/NAO forecasts, official CPC precipitation outlooks, and an opt-in large situational-display mode suitable for a 65-inch monitor.

No model fitting, Q6 rescoring, architecture change, forecast activation or deployment is authorized by this checkpoint. Q3/Q3A and original Q6 results remain preserved; Q4 and Q5 remain completed negative complexity experiments. The AI briefing remains deferred. Existing cron-job.org schedules remain unchanged. New live context joins the existing daily collection at 21:35 UTC; no additional scheduler is needed.

## Implemented locally before the outage

- One consolidated research packager, scripts/build_research_atlas.py, reads ten exact source snapshots and exports an inactive retrospective atlas.
- The atlas retains 64 trusted RONI cells, 5,120 PNA/NAO quantile-curve points and 108,160 MJO grid cells. SpatialP90 and direct FFW/LSR response surfaces are excluded.
- RONI uses original global96 inference, including both supported cells; state bars are descriptive and are not pairwise significance tests. Sample counts reconstruct from the monthly exposure table.
- PNA/NAO plots display the eight original quantile-bin means for each selected domain, anchor season, response window and target, without a new fit or significance claim.
- MJO uses original Gaussian-kernel bandwidth 0.65 and descriptive minimum ESS 30. All cells remain in the export; insufficient-support cells are hatched in the display. Active-only interpretation masks the weak center. Fixed anomaly colors saturate at ±15 percentage points; tooltips preserve the original values. Kernel ESS is not independent forecast evidence.
- A context collector caches six CPC Pacific analyses and three CPC precipitation-outlook graphics. It validates static GIF/PNG structure, rejects animation, checks cached hashes, uses conditional requests, retains only verified caches on failure, and keeps image valid/init times null when not machine-verified.
- Weekly Niño-region numerical data are rendered as four high-resolution SVG trajectories. Dates mean week-centered observations, not publication dates. They are separate from three-month ERSST RONI.
- The existing GEFS source response is reused to serialize the complete 31-member × 16-day trajectory, without a second network request. Initialization retains DATE precision; no cycle hour is inferred. Missing or duplicate members or inconsistent valid dates prevent trajectory availability. Member percentiles use linear interpolation and are not calibrated precipitation confidence.
- The interactive forecast plot separates observed history from GEFS median and 10–90% / 25–75% member bands. Showing individual member paths requires a user click.
- Situation Display has four manually selected scenes: Ocean & ENSO, Forecast Context, Research Atlas and Historical Impacts. It supports full screen and saved viewing preferences. It never rotates views or starts animation automatically.
- Observation-age badges distinguish daily source dates from the seasonal RONI period. A post-check heartbeat refreshes age labels even if published bytes have not changed.

Local files to recover if the execution workspace returns: /workspace/scratch/1f36569d2c15/climate_visuals/. New source modules are assets/js/intelligence.js, assets/js/intelligence-contract.js, assets/css/intelligence.css, scripts/build_research_atlas.py and scripts/update_context_data.py. Existing index.html, assets/js/auto-refresh.js, scripts/update_climate_data.py and scripts/refresh_dashboard.py were modified. New derived folders are data/research/ and data/context/. Test additions were being written when the outage occurred.

## Source identities

All raw scientific inputs stay in Drive; the website receives derived display exports with original-source provenance.

| Source | Drive file ID | SHA-256 |
|---|---|---|
| Phase4B_Output_Manifest.csv | 1Jx2ZAIRqlowt64zLGrIOa51RYCkBs0B4 | 6d1b0d2eeb12693c145194b650744177524abcfe9d493486756463d814cdb43d |
| Phase4B_Primary_Continuous_RONI_Inference.csv | 1DFp43cwx8F-jWgYmBLOpJXI_OVe4XZbX | 5193711e5a35f10a6c258a9b31afeb100a663e3b6d13772001168ebf8540dede |
| Phase4B_ENSO_State_Descriptive_Rates.csv | 1HQEwFHHTdrTKPB8LtSYO5zsmCyoyuLM1 | 95824bfffe37d94318fd77e7f63a58437e962aecdb24bdfb36e039f20877acba |
| Phase4B_Methodology_and_Guardrails.txt | 1P9Nu3oBOpoqRbGeCZgg4DNpXvcaL6J51 | c5ab4aaa96663b8b8e868e448e57f3b44e2b49aa3a3aceb16ae427f43659c7e6 |
| Phase4B_Monthly_Extreme_Precipitation_Rates_2004_2025.csv | 1OY9JiQ1EgoV23-0WK4FEPFsjlc3oVmj9 | 90a0f65c9525001969d0b2fbeb5978c6f320629ec6cd2bcb3e91f0728c742acd |
| Phase7B_Output_Manifest.csv | 13qYnmSAZcMdJkMZYT3DSW_PViuXThvr9 | b7807855cccac7f3ad3946ab92c01a57daec8d305329a103241f1f4b2babaf8e |
| Phase7B_Methodology_and_Guardrails.txt | 1UQnfOMHMPghG9cXjv73t8UjXhzgI_rsO | 821a94d0d2be5eae932ef3ecba714f04949d725d8108230f65634493d79c820c |
| Phase7B_Nonlinear_Quantile_Response_Curves.csv | 1iOyU4ZUjk9VbT83iKueRhyI4Y9EgQ5F2 | d990429e3584d1d07b4ebb4f998cae1d4b5dc3474d2b23b7169cbfa1e6ab1a67 |
| Phase7B_MJO_RMM_PhaseSpace_Kernel_Response_Surface.csv | 1qAn2KcGLAc8740PiVh2d1KZcJOwcbYlp | ff3f84f221719af96d776deed58788191889ad47503746addbeda01e33ad1040 |
| Phase7B_Phase7A_Invariant_Audit.csv | 176CliH658YbB48_u3itVVXgJO1EDfoFJ | 25744a74f6d03629c90667287adf2c11b27139de987640d919a609a970a3b80e |

Phase4B folder: https://drive.google.com/drive/folders/1rdYQ0bemGR3ca6ZUrXaIoSWYYqT8uxxp
Phase7B folder: https://drive.google.com/drive/folders/1jvDXzjfutCl25KQbpog5eyRkFqyKHwtJ
Hardened Phase7B synthesis: https://drive.google.com/drive/folders/1qmi-NWrQICaoBYHVZ-iRwTkYAB3PpkMN

## Live CPC sources inspected and successfully retrieved

All image URLs below share https://www.cpc.ncep.noaa.gov as origin:

- /products/analysis_monitoring/enso_update/ssta_c.gif
- /products/analysis_monitoring/enso_update/ssttlon5_c.gif
- /products/analysis_monitoring/ocean/weeklyenso_clim_81-10/wkteq_xz.gif
- /products/analysis_monitoring/enso_update/heat-last-year-hr.png
- /products/analysis_monitoring/enso_update/uv850-30d.gif
- /products/analysis_monitoring/enso_update/olra-30d.gif
- /products/predictions/610day/610prcp.new.gif
- /products/predictions/814day/814prcp.new.gif
- /products/predictions/WK34/gifs/WK34prcp.gif
- Weekly numerical Niño data: /data/indices/wksst9120.for

The source-rendered figures keep their own dates, units and baselines. Page-date metadata is auxiliary and may update separately from a map. The 6–10/8–14-day outlooks use their original tercile categories; Week 3–4 precipitation uses its own experimental above/below-median categories. These are period-total precipitation products, separate from Q3 extreme-day occurrence and flood probabilities.

GEFS numerical CSVs: https://ftp.cpc.ncep.noaa.gov/cwlinks/norm.daily.pna.gefs.z500.120days.csv and the corresponding nao filename. Observed daily histories remain the existing repository products; they do not become certified issue-time model inputs through this display work.

## Checks completed before the outage

- All original input bytes were downloaded; SHA-256 identities recorded above.
- Monthly categorical exposure and extreme counts reconstructed successfully.
- The 12 archived Phase7A event-sum invariant checks are zero.
- Entire atlas, CPC context and GEFS trajectories passed the initial browser-contract validation.
- The existing 22 Python tests passed before the new context tests were added.
- Initial Chromium render/control runs completed with zero page errors. All four scenes rendered at 1920×1080. Forecast, Niño and MJO scenes also rendered at 3840×2160.
- Desktop, 1080p and 4K screenshots were visually inspected. The source maps retained full frames and legends.
- Source-image hash verification and age-badge refinements were then added and remain pending final browser regression.
- New rejection/cache/coverage tests were being written when the execution workspace became unavailable. No final pass is claimed.

## Remaining release work

Recover the workspace if possible, finish source/contract rejection tests and browser regressions (including partial ensembles, invalid atlas activation, image checksum mismatch, no-op updates and saved selections), inspect final desktop/mobile/1080p/4K screenshots, commit the full package to this draft branch, and run its read-only GitHub checks. Keep the Colab audit undisturbed and keep science activation false. This checkpoint is documentation only; it does not publish the new visuals.
