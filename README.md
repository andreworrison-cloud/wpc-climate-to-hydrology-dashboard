# Phase 2A MJO Label Hotfix

This surgical hotfix fixes the overlapping text at the top of the MJO / RMM phase-space diagram.

## Replace only

`assets/js/app.js`

The `+RMM2` axis label has been moved downward toward the positive RMM2 axis so it no longer overlaps the centered `WESTERN PACIFIC` geographic label.

No other dashboard layout, data, styling, trajectories, phase labels, or scientific logic were changed.

Suggested commit message:

`Fix MJO phase-space Western Pacific label overlap`
