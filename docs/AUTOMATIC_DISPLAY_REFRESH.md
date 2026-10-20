# Automatic display refresh

The browser checks published static JSON files every five minutes and when the tab becomes visible. Requests revalidate the browser cache. Checks do not trigger GitHub Actions, cron-job.org, data ingestion, model fitting or AI generation. One check may run at a time; network requests and image staging have timeouts.

Observed indices/history/health, forecast guidance, ocean maps, and SST/atmospheric context are separate update groups. An unchanged group does not rerender. New forecast images and the selected ocean/atmospheric map are decoded before replacement. Failed fetches or staged images retain the preceding display; the check-status line identifies affected groups. Updated JSON becomes the comparison baseline only after successful application. Source valid/retrieval timestamps remain distinct from the browser’s last-check timestamp.

Controls are read at application time: history period, MJO view, ocean provider/product/basin, zoom/position, atmospheric selectors, and regional controls remain user-owned. Ocean/atmospheric selection changes during staging defer that update. Expanded index magnitude keys are preserved.

Background updates never invoke Play. An already user-started animation continues with its existing frame list. New animation catalogs expose a “Load latest frames” button; only that button or a user source-view change adopts the refreshed list. Explicit loading pauses playback; another explicit Play click is required. No background code advances a paused animation’s date selector. Hidden tabs may be throttled by the browser; a visibility check catches up when reopened. Sleeping devices cannot refresh until awake.

AI briefing remains deferred; this feature does not change its availability or schedule. Q3/Q6, inactive science guidance, and upstream cron schedules remain unchanged.

Verification uses cached real products plus intercepted test-only publications and delivery failures. The browser test advances the five-minute clock, checks unchanged DOM reuse, new driver data, selection/zoom/frame preservation, manual playback, and recovery after JSON/image failures.
