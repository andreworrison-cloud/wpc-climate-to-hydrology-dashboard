/* Keep an explicitly requested section in view while initial content changes size.
   User interaction cancels settling; scheduled data refreshes never start navigation. */
(() => {
  const settleLimitMs = 60000;
  let pending = null, frame = null, deadline = null, observer = null;

  function stop() {
    pending = null;
    if (frame !== null) cancelAnimationFrame(frame);
    if (deadline !== null) clearTimeout(deadline);
    observer?.disconnect();
    frame = deadline = observer = null;
  }

  function targetFor(hash) {
    if (!hash || hash === '#') return null;
    try { return document.getElementById(decodeURIComponent(hash.slice(1))); }
    catch { return null; }
  }

  function reveal(target) {
    for (let node = target; node; node = node.parentElement) {
      if (node.tagName === 'DETAILS') node.open = true;
    }
    if (!document.body.classList.contains('wall')) return;
    const panel = target.closest('article, aside');
    if (!panel || getComputedStyle(panel).display !== 'none') return;
    const scene = {
      ocean: 'ocean', 'pacific-view': 'ocean',
      'ensemble-view': 'forecast', 'cpc-view': 'forecast',
      'research-view': 'research', historical: 'impacts'
    }[panel.id];
    const selector = document.getElementById('wallScene');
    if (scene && selector) {
      selector.value = scene;
      selector.dispatchEvent(new Event('change', {bubbles: true}));
    } else {
      document.getElementById('wallToggle')?.click();
    }
  }

  function align() {
    frame = null;
    const target = pending;
    if (!target || !target.isConnected || !target.getClientRects().length ||
        document.body.classList.contains('wall')) return;
    const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    const delta = target.getBoundingClientRect().top - padding;
    if (Math.abs(delta) > 1) {
      // Explicitly override the page's smooth scrolling during layout settling.
      window.scrollTo({top: Math.max(0, window.scrollY + delta), behavior: 'instant'});
    }
  }

  function schedule() {
    if (pending && frame === null) frame = requestAnimationFrame(align);
  }

  function navigate(hash, focus = false) {
    stop();
    const target = targetFor(hash);
    if (!target) return;
    reveal(target);
    pending = target;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(schedule);
      // Panels also catch changes when flex ordering or display:contents is used.
      const nodes = new Set([document.body, document.querySelector('.dashboard-grid'), target,
        ...document.querySelectorAll('.panel')]);
      for (const node of nodes) if (node) observer.observe(node);
    }
    if (focus) {
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({preventScroll: true});
    }
    deadline = setTimeout(stop, settleLimitMs);
    schedule();
  }

  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey ||
        event.shiftKey || event.altKey) return;
    const link = event.target.closest?.('a[href]');
    if (!link || link.hasAttribute('download') ||
        (link.target && link.target !== '_self')) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname ||
        url.search !== location.search || !targetFor(url.hash)) return;
    event.preventDefault();
    if (url.hash !== location.hash) history.pushState(history.state, '', url.hash);
    navigate(url.hash, true);
  });
  window.addEventListener('hashchange', () => navigate(location.hash));
  window.addEventListener('pagehide', stop);
  document.addEventListener('load', schedule, true);
  document.addEventListener('dashboard:checked', schedule);
  // Stop before a user's scroll, selection, chart interaction, or keyboard input.
  for (const type of ['wheel', 'touchstart', 'pointerdown', 'keydown']) {
    document.addEventListener(type, stop, {capture: true, passive: true});
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => navigate(location.hash), {once: true});
  } else {
    navigate(location.hash);
  }
})();
