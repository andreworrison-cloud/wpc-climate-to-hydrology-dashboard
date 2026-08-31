# Phase 2B.3.2 — ECMWF MJO RMMS discovery hotfix

The first 2B.3.2 run confirmed:
- structured GEFS PNA/NAO: live
- ECMWF Pacific/PNA-context metadata: live
- ECMWF Euro-Atlantic regime metadata: live
- ECMWF RMMS MJO: discovery failure only

Cause:
The newer OpenECPDS authenticated web listing did not expose ECMF filenames in the HTML shape assumed by the first parser.

Fix:
- Use ECMWF's documented authenticated FTP `RMMS` directory first.
- Recursively inspect up to two directory levels.
- Select the newest real-time ECMF/ECMWF RMM file.
- Retrieve the source file directly over FTP.
- Retain authenticated web listing as fallback.
- If no ECMF file is found, diagnostics now include a sample of actual listed filenames.

Replace only:
- `scripts/update_climate_data.py`

Then rerun `Actions -> Update climate data`.
