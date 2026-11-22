const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const api = require("../assets/js/climate-observation.js");

const now = new Date("2026-11-21T23:30:00Z");
const climate = {
  roni: {values: [{season: "ASO", year: 2026, value: 1.97}, {season: "JAS", year: 2026, value: 1.69}]},
  mjo: {values: [
    {date: "2026-11-19", rmm1: .9, rmm2: -.9, phase: 3, amplitude: 1.27},
    {date: "2026-11-20", rmm1: 1.13, rmm2: -.97, phase: 4, amplitude: 1.49}
  ]},
  pna: {values: [{date: "2026-11-19", value: .57}, {date: "2026-11-20", value: null}]},
  nao: {values: [{date: "2026-11-19", value: .39}, {date: "2026-11-20", value: .51}]}
};
const state = api.snapshot(climate, now);
assert.equal(state.common.date, "2026-11-19");
assert.equal(state.common.mjo.phase, 3);
assert.equal(state.common.nao, .39);
assert.equal(state.latest.mjo, "2026-11-20");
assert.equal(state.age, 2);
assert.equal(api.seasonLabel(state.roni), "Aug–Oct 2026");
assert.equal(api.snapshot({...climate, nao: {values: []}}, now).common, null);
assert.equal(api.day("2026-02-30"), null);
assert.equal(api.roniSeason(climate.roni, Date.parse("2026-11-15T12:00:00Z"), true).season, "JAS");
assert.equal(api.roniSeason(climate.roni, Date.parse("2026-11-15T12:00:01Z"), true).season, "ASO");
const ndj = api.roniSeason({values:[{season:"NDJ", year:2025,value:-1}]}, Date.parse("2026-02-03"));
assert.equal(api.seasonLabel(ndj), "Nov 2025–Jan 2026");

const base = path.join(__dirname, "..", "data");
const production = Object.fromEntries(["roni", "mjo", "nao", "pna"].map(key =>
  [key, JSON.parse(fs.readFileSync(path.join(base, key + "_history.json"), "utf8"))]));
const observed = api.snapshot(production);
assert.ok(observed.common && observed.roni);
assert.ok(observed.latest.pna >= observed.common.date && observed.latest.nao >= observed.common.date);
console.log(`Shared published observations verified for ${observed.common.date}.`);
