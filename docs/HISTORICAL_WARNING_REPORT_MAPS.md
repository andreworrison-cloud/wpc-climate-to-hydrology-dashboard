# Historical warning/report maps v1

The historical relationship atlas now offers a second view: regional FFW and flood-related LSR maps. The existing precipitation plots remain the default. Shared domain, season, climate-driver and precipitation-target controls apply to both. Map controls choose seasonal background, a climate-state composite, or its difference from the matching background; warning/report type; all/extreme/non-extreme precipitation days; and event-day frequency or event burden per 100 days. Hover/focus provides the numerator, denominator, represented calendar years and comparison sample. Click selects a region. National CONUS remains a separate summary.

## Definitions

The study is 2004–2025. Daily windows are `[previous day 12Z, ending day 12Z)`; an event exactly at 12Z belongs to the next ending day. The 8,034-date formal mask excludes the incomplete first window (2004-01-01) and missing CPC date (2007-02-26). This is a same-ending-day descriptive product: the atlas's future response-window selector does not apply. Neither contemporaneous daily-driver labels nor retrospective RONI establish availability at a historical issue time.

Extremes retain the regional seasonal P95 in the original 1991–2020 atlas reference for regional mean precipitation or regional fraction receiving >=25 mm. No threshold is fitted. The private prospective model's different reference contract is not substituted into this historical atlas.

Climate states: original archived ENSO labels; active MJO phases 1–8 at amplitude >=1 and weak amplitude <1; PNA/NAO below -0.5, inclusive [-0.5,+0.5], and above +0.5 standardized units. These are fixed descriptive bins, not additional model features. Missing PNA/NAO dates remain absent; their backgrounds use the same known-driver coverage and same precipitation-day category as their selected state. This differs by a small number of days from an unrestricted seasonal climatology.

`days with >=1 record / qualifying days * 100` is a historical event-day percentage. `records / qualifying days * 100` measures event burden and may exceed 100. A difference is selected-state rate minus matched seasonal background; event-day differences are percentage points. Multiple independent warning/report rows may occur on one day. States with zero days retain null rates. Every cell remains in the payload.

Hatching warns when there are fewer than 30 days or 5 represented calendar years. This is an explicitly selected display convention, not a statistical significance criterion, independent effective sample size, forecast-confidence tier or Q6 qualification threshold. No new intervals, p-values or FDR results are generated. Daily samples are temporally dependent. Color scales are shared across regions; event-day percentage uses 0–100%, and differences use +/-30 percentage points with saturation. Event-burden scales are shared across all retained states for the selected cohort.

## Authoritative lineage and checks

The pinned source identities are in `scripts/build_historical_maps.py` and the generated map manifest. They include the immutable Phase1A FFW and LSR tables; hardened Phase1B RMM/RONI; Phase7A dynamic daily matrix and 12Z event matrix; and exact inherited CPC masks. The existing Phase4C/4D export is unchanged.

- 83,674 unique FFW keys; 81,526 original coordinates and 2,148 reconstructed for regional assignment.
- 158,287 authoritative LSR rows: 96,810 flash flood; 57,974 flood; 2,775 debris flow; 728 landslide. All four are preserved, with separate subsets available. `VALID_TIME` is authoritative; legacy malformed `VALID` is never used. No approximate time/location deduplication is introduced.
- Raw authoritative events are independently assigned to 12Z ending days and reconcile against both the dynamic and aligned Phase7A tables.
- All 256 extreme/non-extreme Phase4C exposure/event-count comparisons pass. All 192 Phase4B ENSO-state comparisons pass, with the incomplete first event window explicitly excluded from map exposure.
- The complete descriptive family has 4,416 rows, 18 columns and 7 geographic regions plus a separate national summary.
- Region shading follows exact, disjoint archived CPC masks; the separate national mask equals their union. It represents regional sampling domains, not verified individual warning footprints. Contextual state lines derive from Census 2017 cartographic boundaries via us-atlas v3 (source hash retained).

Warnings are issuances and LSRs are reports, not a complete flood census. Differences can reflect precipitation distribution and warning/reporting practices. Climate-state composites do not establish residual climate effects after precipitation severity, causality or issued flood probabilities. Do not multiply these rates by Q3 probabilities.

## Reproduction and release

`python scripts/build_historical_maps.py --inputs /path/to/inputs` verifies complete source bytes before generating the map table, geographic mask runs, QA and manifest. The inputs directory contains hash-locked `dynamic.csv`, `aligned.csv`, `climate.csv`, `ffw.csv`, `lsr.csv`, the existing `freeze.zip` from which only exact mask bytes are read, and `states-10m.json`. No model asset is fitted or changed.

The browser validates hashes, row shapes, complete state partitions, integer counts, sample denominators and inactive flags before display. A failed initial update leaves the map unavailable; later failures retain the previously verified map. Background refresh checks the small map manifest every five minutes and reuses unchanged hashed payloads. User choices persist, and no animation starts automatically.

No private issuance notebook, scheduler, freeze, Q3/Q3A architecture, Q4/Q5 conclusion, calibration, evidence tier or public prediction flag is modified by this release.
