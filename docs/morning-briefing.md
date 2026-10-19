# Morning AI climate briefing

The morning workflow reads the existing dashboard JSON snapshot. It does not refit models, alter science eligibility, scrape forecast plots, or activate precipitation guidance.

- Scheduler: cron-job.org, daily 06:15 America/New_York; target availability by 06:30 Eastern, subject to runner/API availability. No GitHub cron duplicate.
- Workflow: `morning-briefing.yml`, manually dispatchable; code changes also trigger a commissioning run.
- Required repository Actions secret: `OPENAI_API_KEY`. Never put this in code, browser JavaScript, or cron-job.org.
- Optional repository variable: `OPENAI_BRIEFING_MODEL`, default `gpt-4.1`. Requires Responses API and strict JSON-schema output support.
- API: OpenAI Responses, `store:false`, maximum 2 requests (draft + evidence review), 2,500 output tokens each per attempt. Failed attempts may be manually retried. One accepted issuance per Eastern calendar date.
- Daily input comes from the existing source ingestion schedules. The briefing does not claim all sources updated overnight. Observed daily inputs use a 72-hour display-age limit, GEFS cycle age 48 hours, ocean imagery 72 hours; RONI retains its seasonal reference and revision caveat. These are display limits, not scientific qualification thresholds.
- Numerical GEFS PNA/NAO summaries are included. ENSO probability and MJO forecast graphics are linked but not interpreted from pixels. ECMWF graphical context cannot establish standardized-index agreement. SST imagery currently contributes availability/valid-time context, not numerical ocean diagnostics.
- Every paragraph cites evidence IDs. Local checks enforce layer separation and numerical-token consistency. A separate model request reviews support. These checks are imperfect and are not human review or forecast verification; the UI explicitly labels this.
- Inputs are archived with source file SHA256s and exact repository revision; accepted output records model/usage, prompt/engine hashes and the evidence-review result.
- Failures preserve the prior accepted output. It expires after 30 hours. Missing credentials produce an explicit unavailable state, never a template mislabeled as AI.
- The science-status statement is fixed outside model control. Future qualified precipitation and authoritative historical-context exports require explicit contract adapters, tests, and review; adding an image alone cannot activate their interpretation.

After adding the secret, run **Morning AI climate briefing → Run workflow**. Verify `data/briefing/status.json` says `available`, inspect the archived briefing/review and source citations, then check the live page. A green workflow alone does not mean an AI briefing was generated: configuration/API failures are published as availability states and Actions warnings.

Verification: `python -m unittest discover -s tests -p 'test*.py'`; `node tests/test_ocean_basin.cjs`.
