# Climate Reanalyzer package 1

Adds four OISST history cards, 30-day SST anomaly playback (Global and North Atlantic native views), and twelve GFS daily moisture/circulation maps. NASA SPoRT remains the default main ocean product; its existing Global/Pacific/Atlantic controls are unchanged. No Q3 input, evidence threshold, historical impact metric, or briefing activation changes.

Sources inspected 2026-10-20: Climate Reanalyzer's `sst_daily.min.js?v=002`, `daily_maps.min.js?v=000`, `tw_v14.min.js?v=000`, source JSON calendars, and all four regional series. ClimateReanalyzer.org / Climate Change Institute, University of Maine, CC BY 4.0; underlying NOAA OISST v2.1 and NOAA/NCEP GFS.

## Scientific display contract

- SST regions: global 60S–60N; Niño 3.4 5S–5N/170–120W; North Atlantic 0–60N/80–0W; Gulf of Mexico 20–30N/98–82W. No claim these are UFVS domains.
- `1991-2020` source climatology selected by name, not array index. Its 366-day calendar is joined by month/day. Annual records use actual year day-of-year with terminal null on nonleap years. Finalized values take precedence over preliminary overlaps. Preliminary year is read from the source JS declaration, not inferred from retrieval time. Leap-day and March-1 tests cover both calendars.
- Anomaly = daily regional SST minus source 5-day smoothed 1991–2020 climatology for that calendar date. This daily Niño 3.4 measure is not RONI or ONI. Full JSON series are rechecked daily, so retrospective revisions are captured. Source content SHA256 accompanies each series.
- Thirty daily SST anomaly dates are selected from the published inventory. Each PNG is checksum/structure checked. Missing frames are omitted and dated, never synthesized; maps retain full legends and source marks. Historical maps use the explicitly named 1991–2020 archive.
- Atmospheric images are GFS forecast-based daily averages, not observed reanalysis. `valid_time` and `initialization_time` remain null in structured metadata because these fixed-URL PNGs expose the valid date in the map label, not a verified machine-readable inventory; initialization is not supplied in verified metadata. UI explicitly directs readers to those unmodified labels. Retrieval/Last-Modified are never presented as model valid time. The source switched atmospheric anomaly normals to 1991–2020 on 2026-10-12.
- Missing inputs show unavailable or retained context, never near-climatology. SST ages over three days are visibly stale. No predictive flood/precipitation probabilities or causal claims.

## Operations

`update_reanalyzer.main()` joins the existing `daily` collection at the existing external 21:35Z trigger. No GitHub schedule or cron-job.org job is added. Conditional image requests use ETag/Last-Modified when supplied. Changed bytes are atomically replaced; unchanged content avoids publication through the existing substantive-change comparison. Transient failures retain previous valid products with failure flags. The animation cache is pruned only after writing its replacement manifest.

The branch-only integration workflow fetches source data, checks source contracts, exercises the actual frontend in Chromium, and retains screenshots. It is not a recurring production scheduler.

## Ocean animation expansion — 2026-10-20

The shared player offers absolute SST and SST anomaly for Global, North Pacific and North Atlantic. Global and North Atlantic are native Climate Reanalyzer map areas; the source's published `daily_maps.min.js` lists `world-wt3` and `natlan-ced` for both variables. Each variable has its own published date inventory (`dates_sst.json` and `dates_sstanom.json`). Absolute temperature is in °C; only anomalies reference the 1991–2020 baseline.

North Pacific is a labeled display crop of the global frame, preserving its original projection, header/date, color scale and attribution. It is not a separately computed regional field or a rectangular geographic mask. Rendering checks the reviewed source PNG dimensions and stops if the layout changes. It reuses the global files and hashes, requiring no separate Pacific downloads. Modified-image credit follows the source's CC BY 4.0 terms.

Variable and basin changes preserve the selected calendar date when available and pause playback. If that date is absent, the latest available frame is shown with an explicit notice. The same slider and 1/2/4/8 fps speed selector apply to both variables. Background checks do not change variable/domain/date or start playback; the user adopts new frame catalogs with “Load latest frames.” Frame URLs carry content hashes to pick up source revisions.

`animation.variables.sst.domains` and `animation.variables.ssta.domains` are additive schema fields. `animation.domains` retains the anomaly catalog for already-open older dashboard tabs. The collector uses the existing daily update job. Unreferenced dated frames have a 60-day grace period for open tabs retaining older frame lists; referenced frames are never pruned.
