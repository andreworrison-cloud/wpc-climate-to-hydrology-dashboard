# Phase 2B.3 — Semantic Climate-State Colors + Consensus Guardrail

## 2B.3A
RONI/ENSO, PNA, and NAO use cool-negative / neutral / warm-positive semantic colors in current values and observed trend segments. MJO uses an eight-phase categorical palette, with amplitude < 1 subdued.

NOAA/GEFS source identity remains cyan; ECMWF source identity remains purple. Source/model identity and climate-state color remain separate concepts.

## 2B.3B
A compact consensus strip is added below MJO, PNA, and NAO. It identifies the evidence that will drive consensus, but deliberately does not manufacture High/Moderate/Low scores from chart pixels.

When both products are live, the dashboard says `EVIDENCE AVAILABLE — SCORE GUARDED`. Formal scores remain disabled until structured forecast values are ingested and validated.

Replace only:
- assets/js/app.js
- assets/css/styles.css

No climate-data workflow rerun is required; normal Pages deployment is sufficient.
