import {createTrackMap, sizeCanvas} from "./track-map.mjs?v=20261128";

const $ = id => document.getElementById(id);
const canvas = $("track-map");
const chart = $("pressure-chart");
const classControl = $("storm-class");
const winterControl = $("winter");
const caseControl = $("case-select");
const classes = {noreaster:"Strict nor’easter",coastal:"Other coastal storm"};
const days = new Intl.DateTimeFormat("en-US",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"});
const shortDays = new Intl.DateTimeFormat("en-US",{day:"numeric",month:"short",timeZone:"UTC"});
let cases = [];
let shown = [];
let selected = null;
let active = 0;
let overview = false;
let full = false;
let trackMap;
let chartXs = [];

const winterLabel = year => `${year-1}–${String(year).slice(2)}`;
const clock = value => new Date(value).toISOString().slice(11,16);
const shortClock = value => `${shortDays.format(new Date(value))} · ${clock(value)}Z`;
const csvClock = value => new Date(value).toISOString().slice(0,16).replace("T"," ");
const coords = point => `${point.lat}°N, ${Math.abs(point.lon)}°W`;
function elem(tag, text) {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
}
function link(label, url) {
  const node = elem("a",label);
  node.href = url;
  return node;
}
function minIndex(storm) {
  const values = storm.track.points.map(point=>point.hpa);
  return values.indexOf(Math.min(...values));
}
function drawChart() {
  chartXs = [];
  if (!selected || overview) return;
  const size = sizeCanvas(chart);
  if (!size) return;
  const {context:ctx,width,height} = size;
  ctx.clearRect(0,0,width,height);
  const fixes = selected.track.points;
  const pressure = fixes.map(point=>point.hpa);
  const times = fixes.map(point=>Date.parse(point.validUtc));
  const low = Math.min(...pressure), high = Math.max(...pressure);
  const step = high-low<=12 ? 5 : high-low<=32 ? 10 : 20;
  const upper = Math.ceil((high+2)/step)*step;
  const lower = Math.floor((low-2)/step)*step;
  const left = 38, right = width-18, top = 15, bottom = height-25;
  const y = value=>bottom-(value-lower)/(upper-lower)*(bottom-top);
  chartXs = times.map(t=>left+(t-times[0])/(times.at(-1)-times[0])*(right-left));
  ctx.font = "11px system-ui";
  ctx.fillStyle = "#39576a";
  ctx.strokeStyle = "#d3e3e8";
  ctx.lineWidth = 1;
  ctx.textBaseline = "middle";
  for (let value=lower;value<=upper;value+=step) {
    ctx.beginPath();
    ctx.moveTo(left,y(value)); ctx.lineTo(right,y(value)); ctx.stroke();
    ctx.fillText(String(value),2,y(value));
  }
  ctx.strokeStyle = "#79aebc";
  ctx.beginPath(); ctx.moveTo(chartXs[active],top); ctx.lineTo(chartXs[active],bottom); ctx.stroke();
  ctx.strokeStyle = "#187c96";
  ctx.lineWidth = 2.25;
  ctx.beginPath();
  pressure.forEach((p,i)=>i ? ctx.lineTo(chartXs[i],y(p)) : ctx.moveTo(chartXs[i],y(p)));
  ctx.stroke();
  pressure.forEach((p,i)=>{
    ctx.beginPath();
    ctx.arc(chartXs[i],y(p),i===active ? 5.3 : 3,0,2*Math.PI);
    ctx.fillStyle = i===active ? "#174c60" : i===minIndex(selected) ? "#cc8214" : "#20849c";
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.2;
    ctx.stroke();
  });
  const first = shortClock(fixes[0].validUtc), last = shortClock(fixes.at(-1).validUtc);
  ctx.fillStyle = "#39576a";
  ctx.fillText(first,left,height-9);
  ctx.fillText(last,right-ctx.measureText(last).width,height-9);
}
function redraw() {
  trackMap?.draw(shown,selected,active,overview,full);
  drawChart();
}
function readActive() {
  const readout = $("map-readout");
  if (!selected || overview) {
    readout.hidden = true;
    redraw();
    return;
  }
  const points = selected.track.points;
  const point = points[active];
  readout.hidden = false;
  readout.replaceChildren(elem("strong",`${point.hpa} hPa`),elem("span",`Fix ${active+1} · ${shortClock(point.validUtc)}`));
  const source = $("active-source");
  source.hidden = !point.sourceUrl;
  if (point.sourceUrl) source.href = point.sourceUrl;
  for (const [i,button] of [...$("fix-buttons").children].entries()) {
    button.setAttribute("aria-pressed",String(active===i));
  }
  for (const [i,row] of [...$("fix-rows").children].entries()) {
    row.classList.toggle("active",active===i);
  }
  redraw();
}
function chooseFix(index, focus = false) {
  if (!selected || index<0 || index>=selected.track.points.length) return;
  active = index;
  readActive();
  if (focus) $("fix-buttons").children[index].focus();
}
function drawCaseDetails() {
  for (const id of ["case-meta","case-metrics","impact-title","fixes"]) $(id).hidden = !selected;
  $("case-heading").textContent = selected ? selected.title : "Case evidence";
  $("case-date").textContent = selected ? `${days.format(new Date(selected.start))} to ${days.format(new Date(selected.end))}` : "";
  $("case-impact").textContent = selected?.impact ?? (shown.length ? "Select a track or choose a case from the list." : "No cases match the active filters.");
  $("case-note").textContent = selected ? [selected.notes,selected.track.method].filter(Boolean).join(" ") : "";
  for (const id of ["case-sources","fix-rows","fix-buttons"]) $(id).replaceChildren();
  if (!selected) return;
  $("case-meta").textContent = classes[selected.classification];
  $("case-meta").classList.toggle("broad",selected.classification==="coastal");
  const points = selected.track.points;
  const low = points[minIndex(selected)];
  const metrics = [[`${low.hpa} hPa`,"Lowest plotted pressure"],[points.length,"Analyzed fixes"]];
  $("case-metrics").replaceChildren(...metrics.map(([value,label])=>{
    const card = elem("div","");
    card.append(elem("strong",value),elem("span",label));
    return card;
  }));
  $("case-sources").replaceChildren(...selected.sources.map(item=>{
    const li = elem("li","");
    li.append(link(item.label,item.url));
    return li;
  }));
  for (const [i,point] of points.entries()) {
    const row = elem("tr","");
    const valid = elem("td","");
    if (point.sourceUrl) valid.append(link(csvClock(point.validUtc),point.sourceUrl));
    else valid.textContent = csvClock(point.validUtc);
    row.append(valid,elem("td",coords(point)),elem("td",point.hpa));
    $("fix-rows").append(row);
    const button = elem("button","");
    button.type = "button";
    button.setAttribute("aria-label",`Fix ${i+1}, ${csvClock(point.validUtc)} UTC, ${point.hpa} hPa`);
    button.append(elem("strong",`${i+1} · ${point.hpa} hPa`),elem("span",`${clock(point.validUtc)}Z`));
    button.addEventListener("click",()=>chooseFix(i));
    button.addEventListener("keydown",event=>{
      if (!["ArrowLeft","ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      chooseFix(i+(event.key==="ArrowLeft" ? -1 : 1),true);
    });
    $("fix-buttons").append(button);
  }
}
function showMode() {
  $("single-view").setAttribute("aria-pressed",String(!overview));
  $("all-view").setAttribute("aria-pressed",String(overview));
  $("track-title").textContent = overview ? "Storm track overview" : "Analyzed storm track";
  $("case-legend").hidden = overview;
  $("overview-legend").hidden = !overview;
  $("pressure-panel").hidden = overview || !selected;
  $("extent").hidden = overview || !selected;
  $("extent").textContent = full ? "Fit to storm" : "Full coast";
  $("extent").setAttribute("aria-pressed",String(full));
  $("map-message").hidden = Boolean(shown.length);
  $("map-message").textContent = "No mapped cases match these filters.";
  readActive();
}
function selectCase(storm, fix = null) {
  selected = storm;
  caseControl.value = storm?.id ?? "";
  full = false;
  active = storm ? fix ?? minIndex(storm) : 0;
  const target = storm ? "#case="+encodeURIComponent(storm.id) : location.pathname+location.search;
  history.replaceState(null,"",target);
  drawCaseDetails();
  showMode();
}
function filter(id = selected?.id) {
  shown = cases.filter(storm=>
    (classControl.value==="all" || storm.classification===classControl.value) &&
    (winterControl.value==="all" || String(storm.winterEnd)===winterControl.value));
  $("result-count").textContent = `${shown.length} of ${cases.length} mapped cases`;
  const options = shown.map(storm=>new Option(`${days.format(new Date(storm.start))} · ${storm.title}`,storm.id));
  caseControl.replaceChildren(...(options.length ? options : [new Option("No matching cases","")]));
  caseControl.disabled = !shown.length;
  selectCase(shown.find(storm=>storm.id===id) ?? shown[0] ?? null);
}
function linkedId() {
  return new URLSearchParams(location.hash.slice(1)).get("case");
}
classControl.addEventListener("change",()=>filter());
winterControl.addEventListener("change",()=>filter());
caseControl.addEventListener("change",()=>{
  overview = false;
  selectCase(shown.find(storm=>storm.id===caseControl.value) ?? null);
});
$("single-view").addEventListener("click",()=>{overview=false;showMode();});
$("all-view").addEventListener("click",()=>{overview=true;showMode();});
$("extent").addEventListener("click",()=>{full=!full;showMode();});
canvas.addEventListener("pointermove",event=>{canvas.style.cursor=trackMap?.match(event) ? "pointer" : "default";});
canvas.addEventListener("pointerup",event=>{
  const hit = trackMap?.match(event);
  if (!hit) return;
  if (overview) {
    overview=false;
    selectCase(hit.storm,hit.index);
  } else chooseFix(hit.index);
});
chart.addEventListener("pointerup",event=>{
  if (!chartXs.length) return;
  const x = event.clientX-chart.getBoundingClientRect().left;
  const nearest = chartXs.map(px=>Math.abs(px-x));
  chooseFix(nearest.indexOf(Math.min(...nearest)));
});
addEventListener("hashchange",()=>{
  overview=false;
  classControl.value=winterControl.value="all";
  filter(linkedId());
});
const resize = new ResizeObserver(redraw);
resize.observe($("map-container"));
resize.observe(chart);

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
try {
  const [data, geography] = await Promise.all([loadJson("./cases.json"),loadJson("./geography.json")]);
  if (!data.cases?.length || !geography.land?.length) throw new Error("Atlas data empty");
  trackMap = createTrackMap(canvas,geography);
  cases = data.cases.sort((a,b)=>b.start.localeCompare(a.start));
  const winters = [...new Set(cases.map(storm=>storm.winterEnd))].sort((a,b)=>b-a);
  winterControl.append(...winters.map(year=>new Option(winterLabel(year),year)));
  for (const control of [winterControl,classControl,$("single-view"),$("all-view")]) control.disabled=false;
  $("coverage").textContent = `Selected cases across ${winters.length} winters, ${winterLabel(winters.at(-1))} to ${winterLabel(winters[0])}. Coverage varies by winter. Made with Natural Earth.`;
  filter(linkedId());
} catch (error) {
  $("result-count").textContent = "Track data unavailable";
  $("map-message").textContent = "Reload to retry or open the case data under Sources.";
  $("map-message").hidden = false;
}
