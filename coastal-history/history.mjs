const $ = (id) => document.getElementById(id);
const canvas = $("track-map");
const ctx = canvas.getContext("2d");
const classControl = $("storm-class");
const winterControl = $("winter");
const caseControl = $("case-select");
const basemap = new Image();
const classes = {
  noreaster: { label: "Strict nor’easter", color: "#006966", dash: [], css: "strict" },
  coastal: { label: "Other coastal storm", color: "#99500e", dash: [6, 4], css: "broad" },
};
const dateFormat = new Intl.DateTimeFormat("en-US", {
  day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
});
let cases = [];
let shown = [];
let selected = null;
let plotted = [];
let travelWidth = 0;
let travelHeight = 0;

function utcDay(value) {
  return dateFormat.format(new Date(value));
}
function utcTime(value) {
  const time = new Date(value).toISOString();
  return `${time.slice(0, 10)} ${time.slice(11, 16)}`;
}
function winterLabel(winter) {
  return `${Number(winter) - 1}–${String(winter).slice(2)}`;
}
function coordinates(point) {
  return `${point.lat}°N, ${Math.abs(point.lon)}°W`;
}
function html(tag, content) {
  const node = document.createElement(tag);
  node.textContent = content;
  return node;
}
function plotPoint(point) {
  return [((point.lon + 92) / 37) * travelWidth, ((53 - point.lat) / 30) * travelHeight];
}
function project(storm) {
  return storm.track.points.map((point, i, fixes) => ({
    position: plotPoint(point),
    joins: i > 0 && Date.parse(point.validUtc) - Date.parse(fixes[i - 1].validUtc) <= 12 * 3600 * 1000,
  }));
}
function draw(caseItem, points, active, muted) {
  const style = classes[caseItem.classification];
  ctx.strokeStyle = ctx.fillStyle = style.color;
  ctx.lineWidth = active ? 3.8 : 1.7;
  ctx.globalAlpha = active ? 1 : muted ? .34 : .78;
  ctx.lineCap = ctx.lineJoin = "round";
  ctx.setLineDash(style.dash);
  ctx.beginPath();
  for (const { position: [x, y], joins } of points) {
    if (joins) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  for (const [i, { position: [x, y] }] of points.entries()) {
    const last = i === points.length - 1;
    if (!active && !last) continue;
    ctx.beginPath();
    ctx.arc(x, y, last ? (active ? 4.7 : 3.2) : 2.3, 0, 2 * Math.PI);
    if (last) {
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.lineWidth = active ? 2.5 : 1.6;
      ctx.stroke();
    } else {
      ctx.fillStyle = style.color;
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}
function redraw() {
  if (!ctx) return;
  const { width, height } = canvas.getBoundingClientRect();
  if (!width || !height) return;
  travelWidth = width;
  travelHeight = height;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const pixelWidth = Math.round(width * dpr);
  const pixelHeight = Math.round(height * dpr);
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  ctx.setTransform(pixelWidth / width, 0, 0, pixelHeight / height, 0, 0);
  ctx.fillStyle = "#e9f3f8";
  ctx.fillRect(0, 0, width, height);
  if (basemap.complete && basemap.naturalWidth) ctx.drawImage(basemap, 0, 0, width, height);
  plotted = shown.map((storm) => ({ storm, points: project(storm) }));
  for (const { storm, points } of plotted) {
    if (storm !== selected) draw(storm, points, false, Boolean(selected));
  }
  const active = plotted.find(({ storm }) => storm === selected);
  if (active) draw(active.storm, active.points, true, false);
}
function pointSegmentDistance(x, y, [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay;
  const span = dx * dx + dy * dy;
  const t = span ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / span)) : 0;
  return Math.hypot(x - ax - t * dx, y - ay - t * dy);
}
function matchTrack(event) {
  const rectangle = canvas.getBoundingClientRect();
  const x = event.clientX - rectangle.left, y = event.clientY - rectangle.top;
  let smallest = event.pointerType === "touch" ? 15 : 10;
  let match = null;
  for (const { storm, points } of plotted) {
    for (const [i, item] of points.entries()) {
      const distance = pointSegmentDistance(x, y, item.joins ? points[i - 1].position : item.position, item.position);
      if (distance < smallest) {
        smallest = distance;
        match = storm;
      }
    }
  }
  return match;
}
function selectCase(storm, changeUrl = true) {
  selected = storm;
  caseControl.value = storm?.id ?? "";
  const meta = $("case-meta"), stats = $("track-stats"), fixes = $("fixes");
  meta.hidden = stats.hidden = fixes.hidden = !storm;
  $("case-sources").replaceChildren();
  $("fix-rows").replaceChildren();
  $("case-heading").textContent = storm?.title ?? "Choose a storm";
  $("case-impact").textContent = storm?.impact ?? "Select a track on the map or choose a case from the list.";
  $("case-note").textContent = storm ? [storm.notes, storm.track.method].filter(Boolean).join(" ") : "";
  if (storm) {
    const style = classes[storm.classification];
    const date = storm.start === storm.end ? utcDay(storm.start) : `${utcDay(storm.start)} – ${utcDay(storm.end)}`;
    meta.className = "case-meta " + style.css;
    meta.textContent = `${style.label} · ${date}`;
    const points = storm.track.points;
    const lowest = Math.min(...points.map((point) => point.hpa));
    const statsNodes = [[`${lowest} hPa`, "Lowest plotted pressure"], [String(points.length), "Plotted fixes"]];
    stats.replaceChildren(...statsNodes.map(([value, label]) => {
      const wrapper = html("div", "");
      wrapper.append(html("strong", value), html("span", label));
      return wrapper;
    }));
    const sourceRows = storm.sources.map(({ label, url }) => {
      const item = html("li", "");
      const link = html("a", label);
      link.href = url;
      item.append(link);
      return item;
    });
    $("case-sources").replaceChildren(...sourceRows);
    $("fix-rows").replaceChildren(...points.map((point) => {
      const row = html("tr", "");
      const valid = html("td", "");
      if (point.sourceUrl) {
        const link = html("a", utcTime(point.validUtc));
        link.href = point.sourceUrl;
        valid.append(link);
      } else valid.textContent = utcTime(point.validUtc);
      row.append(valid, html("td", coordinates(point)), html("td", String(point.hpa)));
      return row;
    }));
  }
  if (changeUrl) history.replaceState(null, "", storm ? "#case=" + encodeURIComponent(storm.id) : location.pathname + location.search);
  redraw();
}
function filter(initialCase) {
  shown = cases.filter((storm) =>
    (classControl.value === "all" || storm.classification === classControl.value) &&
    (winterControl.value === "all" || String(storm.winterEnd) === winterControl.value));
  const want = shown.find((storm) => storm.id === (initialCase || selected?.id));
  $("result-count").textContent = `${shown.length} of ${cases.length} mapped cases`;
  caseControl.replaceChildren(new Option("All matching tracks", ""),
    ...shown.map((storm) => new Option(`${utcDay(storm.start)} · ${storm.title}`, storm.id)));
  caseControl.disabled = !shown.length;
  $("map-message").hidden = Boolean(shown.length);
  $("map-message").textContent = "No mapped cases match these filters.";
  selectCase(want ?? null, !initialCase || !want);
}
function linkedId() {
  return new URLSearchParams(location.hash.slice(1)).get("case");
}

classControl.addEventListener("change", () => filter());
winterControl.addEventListener("change", () => filter());
caseControl.addEventListener("change", () => selectCase(shown.find((storm) => storm.id === caseControl.value) ?? null));
canvas.addEventListener("pointermove", (event) => {
  canvas.style.cursor = matchTrack(event) ? "pointer" : "crosshair";
});
canvas.addEventListener("pointerup", (event) => {
  const storm = matchTrack(event);
  if (storm) selectCase(storm);
});
addEventListener("hashchange", () => {
  classControl.value = winterControl.value = "all";
  filter(linkedId());
});
new ResizeObserver(redraw).observe($("map-container"));
basemap.addEventListener("load", redraw);
basemap.addEventListener("error", () => { $("map-message").textContent = "Map background unavailable. Case positions are available below."; $("map-message").hidden = false; });
basemap.src = "./basemap.webp";

try {
  const reply = await fetch("./cases.json");
  if (!reply.ok) throw new Error(String(reply.status));
  const data = await reply.json();
  if (!Array.isArray(data.cases) || !data.cases.length) throw new Error("No mapped cases");
  cases = data.cases.sort((a, b) => b.start.localeCompare(a.start));
  const winters = [...new Set(cases.map((storm) => Number(storm.winterEnd)))].sort((a, b) => b - a);
  winterControl.append(...winters.map((winter) => new Option(winterLabel(winter), winter)));
  winterControl.disabled = classControl.disabled = false;
  const span = winters.length > 1 ? `${winterLabel(winters.at(-1))} to ${winterLabel(winters[0])}` : winterLabel(winters[0]);
  $("coverage").textContent = `Selected cases from ${winters.length} winters (${span}). Coverage varies by winter. The counts describe the cases shown.`;
  filter(linkedId() ?? cases[0].id);
} catch (error) {
  $("result-count").textContent = "The reviewed case data could not be loaded.";
  $("case-heading").textContent = "Case details unavailable";
  $("map-message").textContent = "Reload the page to retry.";
  $("map-message").hidden = false;
}
