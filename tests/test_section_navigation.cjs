const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const code = fs.readFileSync('assets/js/section-navigation.js', 'utf8');

function page(hash = '#research-view', wall = false) {
  const events = new Map(), windowEvents = new Map(), frames = new Map(), timers = new Map();
  const state = {y: 0, targetY: 1000, moves: [], focused: false, scene: 'ocean', observed: [], observers: []};
  let serial = 0;
  const target = {
    id: 'research-view', tagName: 'ARTICLE', parentElement: null, isConnected: true,
    getClientRects: () => [1], getBoundingClientRect: () => ({top: state.targetY - state.y}),
    closest: () => target, hasAttribute: () => false, setAttribute() {},
    focus: () => {state.focused = true;}
  };
  const details = {...target, id: 'researchDefinitions', tagName: 'DETAILS', parentElement: target, open: false};
  const body = {classList: {contains: () => wall}}, grid = {};
  const selector = {get value() {return state.scene;}, set value(v) {state.scene = v;}, dispatchEvent() {}};
  const elements = {'research-view': target, researchDefinitions: details, wallScene: selector};
  const location = new URL('https://example.org/dashboard/' + hash);
  const document = {
    body, documentElement: {}, readyState: 'loading',
    getElementById: id => elements[id] || null,
    querySelector: () => grid, querySelectorAll: () => [target],
    addEventListener: (name, callback) => {
      if (!events.has(name)) events.set(name, []);
      events.get(name).push(callback);
    }
  };
  const window = {
    get scrollY() {return state.y;},
    scrollTo: options => {assert.equal(options.behavior, 'instant'); state.y = options.top; state.moves.push(options.top);},
    addEventListener: (name, callback) => windowEvents.set(name, callback)
  };
  const ctx = {document, window, location, URL, Set, Event,
    getComputedStyle: node => ({scrollPaddingTop: '24px', display: wall && node === target && state.scene !== 'research' ? 'none' : 'block'}),
    requestAnimationFrame: callback => {frames.set(++serial, callback); return serial;},
    cancelAnimationFrame: id => frames.delete(id),
    setTimeout: callback => {timers.set(++serial, callback); return serial;},
    clearTimeout: id => timers.delete(id),
    ResizeObserver: class {
      constructor(callback) {this.callback = callback; this.connected = true; state.observers.push(this);}
      observe(node) {state.observed.push(node);}
      disconnect() {this.connected = false;}
    },
    history: {state: null, pushState: (_, __, hash) => {location.hash = hash;}}
  };
  vm.runInNewContext(code, ctx);
  const emit = (name, event = {}) => {for (const callback of events.get(name) || []) callback(event);};
  const flush = () => {const batch = [...frames.values()]; frames.clear(); batch.forEach(fn => fn());};
  const resize = () => {state.observers.filter(o => o.connected).forEach(o => o.callback()); flush();};
  const link = (hash = '#research-view', modifiers = {}) => {
    const a = {href: 'https://example.org/dashboard/' + hash, target: '', hasAttribute: () => false};
    const e = {button: 0, target: {closest: () => a}, preventDefault() {this.prevented = true;}, ...modifiers};
    emit('click', e); flush(); return e;
  };
  emit('DOMContentLoaded'); flush();
  return {state, target, details, body, emit, flush, resize, link, timers, windowEvents, location};
}

{
  const p = page();
  assert.equal(p.state.y, 976, 'Initial deep link honors scroll padding');
  p.state.targetY += 6000; p.resize();
  assert.equal(p.state.y, 6976, 'Late-loaded maps above the atlas must not displace its landing');
  assert(p.state.observed.includes(p.target));
  assert.equal(p.state.focused, false, 'Loading a link does not steal focus');
}
for (const intent of ['wheel', 'touchstart', 'pointerdown', 'keydown']) {
  const p = page(); p.emit(intent); p.state.y = 150; p.state.targetY += 6000;
  p.resize(); p.emit('load'); p.emit('dashboard:checked'); p.flush();
  assert.equal(p.state.y, 150, intent + ' must stop subsequent automatic scrolling');
}
{
  const p = page(''); p.state.y = 200; p.resize(); p.emit('dashboard:checked'); p.flush();
  assert.equal(p.state.moves.length, 0, 'Background data delivery must never start navigation');
  const e = p.link(); assert(e.prevented); assert.equal(p.location.hash, '#research-view');
  assert.equal(p.state.y, 976); assert(p.state.focused);
  p.emit('pointerdown'); p.state.y = 400; p.link();
  assert.equal(p.state.y, 976, 'Clicking the same section link must still navigate');
}
{
  const p = page(''); assert(!p.link('#research-view', {ctrlKey: true}).prevented);
  assert.equal(p.state.moves.length, 0, 'Modified clicks retain native new-tab behavior');
}
{
  const p = page('#researchDefinitions'); assert(p.details.open, 'A linked definition guide opens');
  assert.equal(p.state.y, 976);
  p.windowEvents.get('pagehide')(); p.state.targetY += 1000; p.resize();
  assert.equal(p.state.y, 976, 'Navigation observers stop when leaving the page');
}
{
  const p = page('#research-view', true);
  assert.equal(p.state.scene, 'research', 'An atlas link reveals its situation-display scene');
  assert.equal(p.state.moves.length, 0, 'Situation display retains its full-screen arrangement');
}
{
  const p = page('#unknown'); assert.equal(p.state.moves.length, 0);
  const q = page('#%zz'); assert.equal(q.state.moves.length, 0, 'Malformed fragments remain harmless');
}
{
  const p = page(); [...p.timers.values()][0]();
  p.state.y = 350; p.state.targetY += 1000; p.resize();
  assert.equal(p.state.y, 350, 'Settling is bounded and cannot persist until a later poll');
}
console.log('Section navigation: initial/late layout, user cancellation, same-fragment links, background refresh, details, situation display and cleanup PASS');
