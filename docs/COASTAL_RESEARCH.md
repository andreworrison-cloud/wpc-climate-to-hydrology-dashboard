# East Coast coastal storm research

## Public historical summary · November 21, 2026

The dashboard's [East Coast coastal storm history](https://andreworrison-cloud.github.io/wpc-climate-to-hydrology-dashboard/#coastal-storm-history) summarizes the reviewed inventory and the impact-cohort climate analysis. The [winter counts](../data/coastal/coastal_counts_by_winter_1979_2024.csv) cover October–April winters 1979–80 through 2023–24. The three columns of counts are nested: 621 coastal episodes, 135 reviewed nor’easters and 115 with consequential U.S. East Coast impacts supported by the case record. A zero is a zero count in the reviewed inventory. Source completeness varies by period and location.

The impact cohort admits a reviewed coastal low or redevelopment with source-supported coastal circulation and consequential effects attributed to that phase. Qualifying effects include significant snow or ice, inland or coastal flooding, erosion, damage, documented damaging winds or a coastal gust of at least 50 kt, and material transport or utility disruption. Cases are reconciled against source reports and pressure analyses. Reviewed direct transitions carry separate flags in the case evidence and were excluded in a sensitivity test.

The count target is the number of first reviewed coastal references in a fixed seven-day window. Eligibility requires a defensible date allocation, coverage and climate predictors. There are 107 entries in 1,321 eligible weeks. Daily MJO, PNA and NAO predictors use a three-day lag. The historical RONI availability convention is the 15th of the following month at 12 UTC for a completed three-month season. Historical publication vintages are approximated. Support is sparse across many four-indicator combinations.

The seasonal-plus-trend Poisson reference uses two annual harmonics and a winter-year term. The regularized count models add RONI, the two MJO RMM components, PNA and NAO. The nonlinear fit includes their squares and pairwise products. Forward evaluation trains on earlier winters and scores 882 nonoverlapping weeks across the final 30 test winters. Percentage skill is the reduction in held-out Poisson deviance. Full-model intervals use paired winter-block resampling. Individual added-last intervals adjust for the four indicator families. The fitted NAO rate contrast is averaged across the eligible sample with the other predictors held at their observed values.

- Occurrence and impact sources include [WPC surface analyses](https://www.wpc.ncep.noaa.gov/html/sfc_archive.shtml), [NOAA Storm Events](https://www.ncei.noaa.gov/stormevents/), [ERA5 pressure analyses](https://doi.org/10.24381/cds.adbb2d47), WFO case reports and published case compilations.
- Climate inputs are [CPC RONI](https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/roni.shtml), [BoM RMM](https://www.bom.gov.au/climate/mjo/) and [CPC daily PNA and NAO](https://www.cpc.ncep.noaa.gov/products/precip/CWlink/daily_ao_index/teleconnections.shtml).

## Archived workbench · November 17, 2026

**November 17, 2026 correction:** This interface was published before the scientific presentation was ready. Navigation, panel and assets have been disconnected from the public entry point. Retain the code and snapshot as development material; no public coastal relationship/threat panel is currently offered.

Before any replacement publication, explain RONI, MJO, PNA and NAO individually and jointly; define the scientific question and target; distinguish inventory counts from climate effects; label every axis and unit; show uncertainty and source completeness. Review the proposed presentation with Andrew before publishing it. RONI main effects cancel in winter/month-conditioned timing models when constant within strata; this does not establish ENSO irrelevance. Added RONI/NAO terms did not establish a consistent improvement in the cited season-varying timing comparison; neither is scientifically excluded. No new model result is created by this withdrawal.

This adds a read-only historical archive and combined-driver evidence to the existing Climate Dashboard. It introduces no new collector, scheduler, model fit or issued outlook. Its independent data contract rejects forecast activation, issued probabilities/times, uncertified census promotion, inconsistent case totals and date-precision errors.

The November 17, 2026 snapshot contains 509 reviewed primary occurrences across October–April winters 1979–80 through 2023–24. There are 502 reviewed support-reference dates, seven documentary UTC date envelopes and five confirmed direct tropical-to-extratropical transitions. Excluding the latter leaves 504 cases. Six supported primary holds remain outside the primary count. Canonical register SHA256: `c5564f35a856c042fd9fcb507af453adeb433dc40a7076c3a8e388e3ef57cb05`.

The archive supports winter selection, search, a direct-transition exclusion, paging, keyboard-accessible winter bars and case inspection. Regional annotations cover 43 scoped positive cases; one attribution is open and 465 have not been reviewed for this task. Multiple regions are allowed. These are positive locality evidence, not complete impact footprints or region absences. Review cohorts and admission labels are not repurposed as physical storm types.

## Interpretation

The comparison table reproduces the four frozen-model date-allocation sensitivities at input ages one day (primary) and zero days (context). Each of seven uncertain cases contributes one evaluation case within its retained envelope; no exact date or probability weight is imputed. The full winter of each evaluated case was excluded from model training. These bounds are not confidence intervals, a refit, independent verification or calibrated probabilities. The source includes retrospective predictor captures and complete-month normalization; predictor age is not an operational lead. Reviewed support is not genesis or first impact.

The primary MJO–PNA minus PNA-only all-509 score range is +0.012954 to +0.014123 nats/case. Its direction is robust to the seven date envelopes under these frozen models. The added seasonal-variation result is small and does not override the earlier uncertainty/transfer findings. Timing models condition on winter and month and cannot settle between-winter ENSO effects on seasonal occurrence frequency.

## Outlook delivery contract

The intended future target is at least one qualifying East Coast coastal occurrence within a declared future period, beginning with Days 1–7 research. That is different from snow, rainfall, wind or coastal-flood severity. Before a probability product can be qualified, establish the target/exposure reference, historical issue-time input eligibility, independent calibration/discrimination including false alarms, and a versioned forecast evaluation. Regional extensions additionally need scoped region labels and missingness/selection analysis. Global timing research does not require completing every regional annotation first; sparse indicator combinations are not automatically discarded.

The current frontend contract requires `outlook.active=false` and null probability/issue/valid times. Unavailable or unqualified evidence does not become a near-climatology forecast. A future issued product needs a separate contract and qualification release; changing a JSON flag cannot activate this view. Existing Q6 qualification and display are unchanged.

## Data and reproduction

The public file is a compact derived research snapshot, not raw weather archives. The source analysis and captures stay in the research archive. Source analysis core SHA256: `538b9eff8d21d0ace71a47f8e929d2f1c534cac9492155fab06ada822b3453fe`. The snapshot is explicitly dated; it is not daily driver monitoring, a CPC collection-health audit or a current coastal assessment.

Build from the pinned source project and run checks:

```sh
python scripts/build_coastal_research.py --project-root /path/to/research/workspace --output data/coastal/research_snapshot.json
node tests/test_coastal_research.cjs
node tests/test_section_navigation.cjs
```

The complete 509-row source register, documentary date calendar, latest v0.3 annotation queue and frozen date-allocation table are required. The builder rejects a register hash mismatch. No private Drive URL, token, account credential or raw station line is included in the public snapshot.
