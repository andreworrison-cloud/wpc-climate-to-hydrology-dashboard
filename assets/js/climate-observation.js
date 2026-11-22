(function (root) {
  "use strict";

  const seasons = ["DJF", "JFM", "FMA", "MAM", "AMJ", "MJJ", "JJA", "JAS", "ASO", "SON", "OND", "NDJ"];
  const dayMs = 86400000;
  const dateLabel = new Intl.DateTimeFormat("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"});
  const monthLabel = new Intl.DateTimeFormat("en-US", {month: "short", timeZone: "UTC"});

  function day(value) {
    if (typeof value !== "string" || !/^\d{4}-\d\d-\d\d$/.test(value)) return null;
    const stamp = Date.parse(value);
    return Number.isFinite(stamp) && new Date(stamp).toISOString().slice(0, 10) === value ? stamp : null;
  }

  const finiteIndex = value => Number.isFinite(value) && Math.abs(value) < 20;
  const goodMjo = row => finiteIndex(row.rmm1) && finiteIndex(row.rmm2) &&
    Number.isFinite(row.amplitude) && row.amplitude >= 0 && row.amplitude < 20 &&
    Number.isInteger(row.phase) && row.phase >= 1 && row.phase <= 8;

  function indexDates(payload, isGood, today) {
    const days = new Map();
    for (const row of payload?.values ?? []) {
      if (!row || day(row.date) === null || row.date > today || !isGood(row)) continue;
      days.set(row.date, row);
    }
    return days;
  }

  function newest(days) {
    let latest = null;
    for (const date of days.keys()) if (latest === null || latest < date) latest = date;
    return latest;
  }

  function roniSeason(payload, end, availabilityLag = false) {
    let latest = null;
    for (const row of payload?.values ?? []) {
      if (!row || !finiteIndex(row.value) || !Number.isInteger(row.year) || row.year < 1900) continue;
      const center = seasons.indexOf(row.season);
      if (center < 0) continue;
      const last = Date.UTC(row.year, center + 2, 0);
      const availability = availabilityLag ? Date.UTC(row.year, center + 2, 15, 12) : last;
      if (availability >= end || (latest && latest.last >= last)) continue;
      latest = {season: row.season, year: row.year, value: row.value, last, center};
    }
    return latest;
  }

  function snapshot(histories, now = new Date()) {
    const today = now.toISOString().slice(0, 10);
    const pna = indexDates(histories.pna, row => finiteIndex(row.value), today);
    const nao = indexDates(histories.nao, row => finiteIndex(row.value), today);
    const mjo = indexDates(histories.mjo, goodMjo, today);
    const latest = {pna: newest(pna), nao: newest(nao), mjo: newest(mjo)};
    const roni = roniSeason(histories.roni, day(today) + dayMs);
    let shared = null;
    for (const date of mjo.keys()) {
      if ((shared === null || shared < date) && pna.has(date) && nao.has(date)) shared = date;
    }
    const common = shared ? {date: shared, pna: pna.get(shared).value, nao: nao.get(shared).value, mjo: mjo.get(shared)} : null;
    return {latest, common, roni, age: shared ? (day(today) - day(shared)) / dayMs : null};
  }

  const signed = value => `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
  const formatDate = date => dateLabel.format(day(date));
  function seasonLabel(roni) {
    const first = Date.UTC(roni.year, roni.center - 1, 1);
    const ends = new Date(roni.last);
    const begins = new Date(first);
    const startYear = begins.getUTCFullYear() === ends.getUTCFullYear() ? "" : ` ${begins.getUTCFullYear()}`;
    return `${monthLabel.format(first)}${startYear}–${monthLabel.format(roni.last)} ${ends.getUTCFullYear()}`;
  }

  function show(container, state) {
    if (!container) return;
    const heading = container.querySelector("[data-alignment-status]");
    const values = container.querySelector("[data-alignment-values]");
    const note = container.querySelector("[data-alignment-note]");
    const monthly = container.querySelector("[data-alignment-roni]");
    const {common, latest, roni, age} = state;
    if (monthly) monthly.textContent = roni ? `Latest RONI ${signed(roni.value)} °C · ${seasonLabel(roni)}` : "RONI period unavailable";
    if (!common) {
      heading.textContent = "No shared daily observation available";
      values.hidden = true;
      note.textContent = "Compare available indices using their individual observation dates.";
      return;
    }
    heading.textContent = `${formatDate(common.date)} · ${age === 0 ? "today UTC" : `${age} UTC calendar day${age === 1 ? "" : "s"} ago`}`;
    values.hidden = false;
    values.querySelector("[data-mjo-value]").textContent =
      `${common.mjo.amplitude >= 1 ? `Phase ${common.mjo.phase}` : "Weak MJO"} · amplitude ${common.mjo.amplitude.toFixed(2)}`;
    values.querySelector("[data-pna-value]").textContent = signed(common.pna);
    values.querySelector("[data-nao-value]").textContent = signed(common.nao);
    const advanced = ["mjo", "pna", "nao"].filter(key => latest[key] > common.date);
    note.textContent = advanced.length
      ? `Newer observations in the individual charts: ${advanced.map(key => `${key.toUpperCase()} ${formatDate(latest[key])}`).join(" · ")}.`
      : "The three daily charts share this latest observation date.";
  }

  const api = {snapshot, show, roniSeason, day, formatDate, seasonLabel, signed};
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ClimateObservation = api;
})(typeof window === "object" ? window : globalThis);
