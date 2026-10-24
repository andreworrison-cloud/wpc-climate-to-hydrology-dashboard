# Q6 inactive science integration review

This branch connects the existing evidence catalog and trusted historical-context export to the four-layer dashboard. It does not fit models, revise Q6 tiers, dispatch research notebooks, issue probabilities or activate guidance. Review before merging to the live Pages branch.

The scientific result remains: 5,079 No Qualified Signal cells, 41 Research Watch cells, and 320 annual Context Only rows. There are zero qualified seasonal or monthly cells. Research Watch is a research designation, not a weaker forecast tier. Every one of the 5,440 original cells is retained in the downloadable tables; the explorer displays the 5,120 seasonal/monthly cells. Annual rows never qualify. A month cannot rescue its failed parent season.

## Scientific interpretation

- **Observed climate:** existing RONI, Wheeler–Hendon RMM, PNA, NAO and ocean histories remain observed context. Plotting RONI at its middle month does not make that value available at that historical issue time.
- **Forecast drivers:** existing GEFS and ECMWF displays remain separate forecast-driver context. This integration does not feed them into Q3 or infer U.S. precipitation from them.
- **Precipitation evidence:** the selector exposes original region × anchor season/month × window × target × candidate results. No current issue time or valid period exists. Positive Brier improvement is better accuracy, not a positive rainfall tendency. Single-driver models do not identify unique conditional attribution within ALL. National CONUS is a separate summary, not an eighth UFVS map region.
- **Historical impacts:** Phase 4C compares event-count rates per extreme versus non-extreme precipitation day. These are not event probabilities, severity predictions, or multipliers for Q3 probabilities. Phase 4D does not support a broad additional RONI effect on event yield after precipitation severity is accounted for. This does not negate climate–precipitation associations or demonstrate a zero residual effect.

`AreaFrac25Extreme` refers to extreme **area fraction receiving ≥25 mm**, using the archived seasonal 95th percentile. It is not “rainfall over ≥25% of the region.” Both Q3 targets mean at least one extreme day in the selected future seven-day window. The 1991–2020 event-definition reference is separate from the training-only monthly probability anchor. This label correction changes no data or event definitions.

No Qualified Signal describes an evaluated relationship that did not qualify. Unavailable describes the absence of an available issued product or required input. Near climatology would require a validated, available, issued assessment close to its own training-only anchor; it is never a missing-data or failed-evidence fallback. This schema cannot carry an issued or near-climatology value.

## Frozen source record

The builder pins exact SHA-256 identities; mismatches stop packaging before any output is written. Download the four files from the original reviewed Drive exports into a local input directory. Do not replace pins to make a changed file pass.

| Source | SHA-256 | Original export |
|---|---|---|
| All Evidence Cells CSV | `dbb2ef927217a49050db10b8f0e0abcc1e73ddf961bbb7ba63a86845ec5f7b9b` | [Drive](https://drive.google.com/file/d/1YA_JiQwAmm8_wdQMiJjW9sw85Mibltjo/view) |
| Dashboard Science Review JSON | `083d4ab8f64d7911e769a306fd524bc5dcbc3fbf8cc3ca65ce29d19099b1c6a1` | [Drive](https://drive.google.com/file/d/1RPxfgz0R3lJE-bJa6uq_tVsqd609EkWN/view) |
| Historical Context Review JSON | `46f4bf9f1a73d2c4898d82f731909cae9afd5c06f35c81545b7f881a951aa704` | [Drive](https://drive.google.com/file/d/1Oouyk5twxfZE1oO_2to0TNfFsIzYOA6m/view) |
| Readiness Source Manifest JSON | `1f6eab0f7f5486dee1ceb213b8031a914cb7d95f74b5db5da3b3bfcc2f657c8b` | [Drive](https://drive.google.com/file/d/1Lh0k9NXX30S0nrnkxdKMADD7-6tE9nCA/view) |

Frozen Q6 methodology: `fa6141ca2a7158cc5622924c70f9197a25d631aabb1170cc6ddc45f9dc843a9e`.

Q3/Q3A and the completed negative Q4/Q5 experiments remain unchanged. Original Q6 scores remain retrospective development evidence. Original RONI features include unfinished overlapping seasons and revised historical values. Historical vintages, release timing, CPC antecedent inputs, and threshold-reference availability remain unresolved for an as-issued forecast. The separate numerical selection-impact continuation remains under review. Neither this display integration nor the original source manifest is an executable-fit proof.

## Historical lineage and inference families

The unchanged historical export traces to the Phase 1A authoritative event foundation, the Phase 7A daily representation and Phase 4C/4D inference. It contains 128 trusted Phase 4C cells and 128 Phase 4D cells, using only AreaMean and AreaFrac_GE25mm. SpatialP90 is excluded.

Phase 4C retains **122/128** supported trusted display cells under the **original global 192-test BH family**. No filtered 128-test correction is calculated. Phase 4D retains **0/128** supported core-family cells. Their original family labels, source hashes and full inference fields remain in `historical_context_v1.json`.

The 8,034-date formal inference mask excludes 2004-01-01 and 2007-02-26. Event days end at 12Z: `[previous day 12Z, ending day 12Z)`. An event at the ending 12Z belongs to the next ending day. This is distinct from the 8,036-date Phase 1A calendar. FFWs are warning issuances and LSRs are reports; neither is a complete flood census. Imputed centroids support inherited regional assignments, not detailed event footprints.

## Data contract and reproducibility

```sh
python scripts/build_science_review.py --source /path/to/frozen/exports --root .
node tests/test_science_review.cjs
node tests/test_driver_timeline.cjs
```

No Python dependencies or Drive credentials are required for packaging. The raw inputs remain in Drive; no raw event tables or scientific fits are added to the website repository. There is one consolidated packaging entry point.

`data/science/manifest.json` identifies all sources, builder identity, methodology, limitations, file sizes and file hashes. Eight region/national tables use a shared `columns` array and equal-length `rows` arrays to avoid repeating field names. Each domain retains 680 cells: 4 windows × 2 targets × 5 models × 17 strata (4 seasons, 12 months, annual). A cell ID is `domain|window|target|model|stratum_type|stratum`. Row order does not imply ranking.

The shared `guidance_defaults` explicitly carries `active=false`, `deployment_eligible=false`, `input_status=not_evaluated`, `display_state=unavailable`, and null probability, anchor probability, delta probability, issue time and valid bounds. These apply to every row. There are no current forecast values hidden in the metrics. Retrospective Brier, ECE, sample counts, fold/year counts, failure reasons, parent-season tiers and Moderate gate outcomes come directly from the frozen CSV/catalog.

The browser hashes each science payload before rendering and independently checks dimensions, sample arithmetic, event-rate reconstruction, original inference families and inactive states. On a failed initial check, science panels remain unavailable. A failed background update retains previously verified historical evidence and reports the failure. The existing five-minute background check reads only the small science manifest; unchanged region files are reused by content hash. User region, window, period, model, target and event selections are preserved. No playback starts automatically.

The review workflow runs source/contract rejection tests and browser controls, refresh, layout and activation-rejection checks. It retains screenshots for visual review and has read-only repository permission. It has no deployment step. Existing ingestion schedules, GitHub Pages deployment, AI briefing and Colab workers are unchanged.

## Reading the running selection audit

A completed checkpoint is evidence that a requested task was saved; it is not an automatic numerical pass. `Selection_Changed`, `All_Candidates_Stationary`, `Selected_Candidate_Replay_Resolved`, `All_Candidate_Replay_Resolved` and `Selection_Usable` answer different questions. Reproducing the selected candidate alone does not prove the competing path or the original one-SE choice fully reproducible. An unchanged selected penalty alone is also insufficient.

Review final candidate replay differences, selected-versus-unselected discrepancies, one-SE selection changes, hydro dependencies and remaining nonstationarity before deciding the scope of any localized repair. Do not rerun the full experiment or widen tolerances merely because unresolved flags appear. Numerical review does not resolve historical vintages or operational input availability. No notebook replacement or restart is required by this frontend branch.
