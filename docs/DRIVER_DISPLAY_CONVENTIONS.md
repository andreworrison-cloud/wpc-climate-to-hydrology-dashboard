# Driver interpretation display — 2026-10-20

These labels summarize the latest observed index magnitude. They do not change Q3/Q6, activate guidance, classify predictive evidence, or infer precipitation impacts.

## RONI

Use CPC RONI strength-probability category boundaries: absolute magnitude <0.5°C neutral; [0.5,1) weak; [1,1.5) moderate; [1.5,2) strong; ≥2 very strong. Positive is El Niño range, negative La Niña range. Display “range” because a single overlapping season does not independently establish an event or atmospheric coupling. Preserve season/year and provisional status. The source can be revised and is not a daily measurement.

Source checked: https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/strengths/

## MJO

RMM amplitude <1 weak; [1,2) moderate/active; ≥2 strong/active. The unit-circle distinction is source-supported; the moderate/strong subdivision at 2 is an explicit dashboard convention, not an official BOM strength taxonomy. Phase colors 1–8 match all existing MJO charts; amplitude <1 uses gray. Selected phase-space histories retain the selected calendar window and scale to accommodate large coordinates without clipping.

Source checked: https://www.bom.gov.au/climate/mjo/

## PNA and NAO

Absolute standardized index <0.5 near-zero; [0.5,1) weak; [1,2) moderate; ≥2 strong. Keep positive/negative sign in the label. These are descriptive dashboard brackets, not official CPC strength classes. CPC describes these daily indices as standardized relative to monthly standard deviations interpolated to each day; do not interpret these brackets as normal-distribution probabilities.

Sources checked:
- https://www.cpc.ncep.noaa.gov/products/precip/CWlink/pna/pna.shtml
- https://www.cpc.ncep.noaa.gov/products/precip/CWlink/pna/nao.shtml

## SST readouts

Pointer position selects the nearest available observation by actual calendar date. No temporal interpolation of values. Display original date, SST, seasonal climatology, anomaly and preliminary flag. Readout supports pointer movement, tap/click, focus and Left/Right/Home/End keys; all numbers come from the same verified source rows as the chart.
