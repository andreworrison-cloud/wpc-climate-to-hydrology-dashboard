# Phase 1B MJO Fetch Hotfix

This hotfix addresses HTTP 403 responses from the Bureau of Meteorology graphics endpoint when accessed from GitHub Actions.

Changes:
- Prefer BoM's direct climate-data endpoint: `https://www.bom.gov.au/clim_data/IDCKGEM000/rmm.74toRealtime.txt`
- Retain the original graphics endpoint as a fallback.
- Send browser-compatible request headers and a BoM referer.

Only `scripts/update_climate_data.py` needs to replace the current repository version.
