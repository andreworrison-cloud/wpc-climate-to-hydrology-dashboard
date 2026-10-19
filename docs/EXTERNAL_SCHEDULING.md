# External scheduling cutover

Status: three cron-job.org jobs configured and enabled on 2026-10-19. All three
test requests returned HTTP 204 and GitHub registered workflow_dispatch runs.
The redundant GitHub schedule is removed. Runner completion and resulting Pages
publication remain separate verification steps; dispatch acceptance is not completion.

POST endpoint for all three cron-job.org jobs:
`https://api.github.com/repos/andreworrison-cloud/wpc-climate-to-hydrology-dashboard/actions/workflows/update-climate-data.yml/dispatches`

Headers: `Accept: application/vnd.github+json`, `Content-Type: application/json`,
`X-GitHub-Api-Version: 2022-11-28`, and an Authorization Bearer credential entered
securely in cron-job.org. Use a repository-scoped credential with Actions write.
Never commit credentials. Successful dispatch returns HTTP 204; verify the actual
Actions run separately (204 does not establish completed ingestion or deployment).

All times below UTC. NASA checks follow the user-specified cycle-relative schedule:
08:45/10:45 after 06Z and 20:45/22:45 after 18Z.
The observed-index times and combined daily collection time are provisional operational
choices, NOT verified source publication schedules. They remain enabled for continuity
pending source-specific availability review. Grouping forecasts and NOAA ocean maps at
one time does not establish a common release cadence.

| Job | Initial check times | JSON body |
|---|---|---|
| WPC Climate — NASA SPoRT | 08:45, 10:45, 20:45, 22:45 | `{"ref":"main","inputs":{"collection":"sport"}}` |
| WPC Climate — observed indices | 10:10, 14:10, 18:10 | `{"ref":"main","inputs":{"collection":"observed"}}` |
| WPC Climate — daily forecast and NOAA ocean context | 12:35 | `{"ref":"main","inputs":{"collection":"daily"}}` |

NASA uses two primary checks and two catch-up checks. Checks inspect the published
06/18 inventories; images are downloaded only for new dated inventory URLs or a
missing/corrupt cache. Same-URL in-place NASA image corrections are not detected by
this inventory gate; invalidate the affected cached manifest hash to force retrieval
if NASA announces a correction. This does not affect the observed index checks,
which compare the entire parsed historical series and catch older-value revisions.

The observed indices are checked independently of forecast ingestion. An unchanged
series skips output reconstruction. Timestamp-only JSON changes are restored to their
previous bytes. A changed value, valid time, source, failure or recovery remains a
real update. Check results are in Actions logs; retained retrieval timestamps must
not be presented as the most recent successful availability check.

The daily collection retains existing GEFS/ECMWF ingestion and NOAA maps. It does not
run on every SPoRT or observed-index check. NOAA images are fetched daily, then
unchanged content avoids a publication. No science qualification or fitting occurs.

## Cutover and verification

1. Configure the three jobs in cron-job.org, preserving unrelated hydro jobs.
2. Test each dispatch; verify selected collection and HTTP acceptance, then inspect
   source status and successful run completion separately.
3. Confirm no `schedule` block remains in `.github/workflows/update-climate-data.yml`.
4. Enable the three cron jobs; confirm next execution times in UTC.
5. Verify an unchanged check produces no commit and skips the deploy job; verify a
   changed source produces one data commit and one deploy job.

There is no `workflow_run` deployment: the updater deploys only when data changes.
Code pushes retain the ordinary Pages workflow. GITHUB_TOKEN data commits do not
trigger push workflows. Repeated checks serialize within each collection; separate collections write disjoint
data files and rebase before pushing. Avoid manually running `all` alongside individual
collections. Pages
jobs share a concurrency group. External dispatch avoids the scheduled-event timing
path but still uses GitHub runners and Pages, whose execution latency is observable
rather than guaranteed away.
