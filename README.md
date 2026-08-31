# Phase 2A — Observed Pattern Evolution

This patch upgrades the existing WPC Climate-to-Hydrology Prediction Dashboard from current-state cards to observational climate-pattern trajectories.

## Replace these files

- `index.html`
- `assets/css/styles.css`
- `assets/js/app.js`

## What Phase 2A adds

- RONI recent evolution using the existing `data/roni_history.json` archive.
- Daily PNA and NAO trajectories with 30-, 60-, and 90-day display controls.
- A Wheeler–Hendon RMM1/RMM2 phase-space diagram showing the most recent 30-day observed MJO trajectory, unit-amplitude circle, phases 1–8, and geographic phase labels.
- Observed-only metrics such as latest value, recent change, and recent range.
- Stage 1 marked complete and Stage 2 marked active.

## Science guardrail

This is an observational visualization layer only. It makes no precipitation, flash-flood, teleconnection-impact, or forecast inference.

Suggested commit message:

`Add Phase 2A observed pattern evolution visualizations`
