// The two paths, "just me" and "my organization", share some pages: the event page, party night,
// the day after, find a place, vendors, connected apps, settings, account, and new event.
// Those pages carry the individual menu, so from the org side a tap used to land you in "your events".
// This remembers which side you're on and, on the org side, gives the shared pages the org menu,
// sends "your events" to the team dashboard, keeps the event you opened, and makes back go back.
// Loaded after v2.js. (Mari, 11/24)
(function () {
  const ORG_PAGES = new Set(['org', 'orgdash', 'reports', 'guests', 'signoff']);
  const ME_PAGES = new Set(['yourevents']);
  const RAIL_ON = { vendors: 'vendors', apps: 'apps', pipset: 'pipset', alerts: 'pipset', handson: 'pipset', account: 'account', guests: 'guests', reports: 'reports' };
  let mode = 'me', orgEvent = null, prev = null;
  try { mode = localStorage.getItem('nf.v2.mode') === 'org' ? 'org' : 'me'; orgEvent = localStorage.getItem('nf.v2.orgEvent'); } catch (e) {}
  const save = () => { try { localStorage.setItem('nf.v2.mode', mode); orgEvent ? localStorage.setItem('nf.v2.orgEvent', orgEvent) : localStorage.removeItem('nf.v2.orgEvent'); } catch (e) {} };
  const setMode = m => { if (mode !== m) { mode = m; if (m === 'me') orgEvent = null; save(); } document.body.dataset.path = mode; };

  const orgNav = document.querySelector('.screen[data-id="orgdash"] nav.rail');
  const ORG_RAIL = orgNav ? orgNav.outerHTML : '';
  const original = new Map(); // screen id -> its own menu, to put back on the individual side

  function railFor(id) {
    const sec = document.querySelector(`.screen.inapp[data-id="${id}"]`);
    if (!sec || ORG_PAGES.has(id) || !ORG_RAIL) return;
    const nav = sec.querySelector('nav.rail'); if (!nav) return;
    if (mode === 'org') {
      if (!original.has(id)) original.set(id, nav.outerHTML);
      if (!nav.dataset.org) {
        const t = document.createElement('div'); t.innerHTML = ORG_RAIL;
        const n = t.firstElementChild; n.dataset.org = '1'; nav.replaceWith(n);
      }
      const n = sec.querySelector('nav.rail');
      const want = RAIL_ON[id] || 'orgdash';
      n.querySelectorAll('.rail-item').forEach(b => b.classList.remove('on'));
      const on = [...n.querySelectorAll('.rail-item[data-goto]')].find(b => b.dataset.goto === want && !b.hasAttribute('data-jump-ok'));
      if (on) on.classList.add('on');
      if (typeof syncRail === 'function') syncRail();
    } else if (original.has(id) && nav.dataset.org) {
      const t = document.createElement('div'); t.innerHTML = original.get(id); nav.replaceWith(t.firstElementChild);
      if (typeof syncRail === 'function') syncRail();
    }
  }

  // which side: set by the "who's this for?" choice and by the pages that belong to one side
  document.addEventListener('click', e => {
    const c = e.target.closest('[data-id="who"] .choice[data-path]');
    if (c) setMode(c.dataset.path === 'org' ? 'org' : 'me');
    // opening an event from the team dashboard keeps its name on the shared pages
    const row = e.target.closest('.screen[data-id="orgdash"] [data-goto]');
    if (row && ['event', 'night', 'dayafter', 'place'].includes(row.dataset.goto)) {
      const b = row.querySelector('b') || row.closest('[role="row"], .ev-row, .wd')?.querySelector('b');
      if (b) { orgEvent = b.textContent.trim(); save(); }
    }
  }, true);

  function setName() {
    document.querySelectorAll('[data-evname]').forEach(el => { el.textContent = orgEvent; });
    document.querySelectorAll('[data-evslug]').forEach(el => { el.textContent = 'luma.com/' + orgEvent.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); });
  }
  const _goP = go;
  go = function (id) {
    if (mode === 'org' && id === 'yourevents') id = 'orgdash';
    const from = current;
    if (ORG_PAGES.has(id)) setMode('org'); else if (ME_PAGES.has(id)) setMode('me');
    _goP(id);
    railFor(id);
    // back from "new event" or team setup returns to where you came from, not the sign-up question
    if ((id === 'start' || id === 'org') && from && document.querySelector(`.screen.inapp[data-id="${from}"]`)) {
      const back = document.querySelector(`.screen[data-id="${id}"] .back`); if (back) back.dataset.goto = from;
    } else if (id === 'start' || id === 'org') {
      const back = document.querySelector(`.screen[data-id="${id}"] .back`); if (back) back.dataset.goto = 'who';
    }
    // from an org page straight into a shared page: back returns to that org page
    const sec = document.querySelector(`.screen[data-id="${id}"]`);
    if (sec && id !== 'start' && id !== 'org') sec.querySelectorAll('.back, #placeBack').forEach(b => {
      if (!b.dataset.origGoto) b.dataset.origGoto = b.dataset.goto || '';
      if (mode === 'org' && ORG_PAGES.has(from)) b.dataset.goto = from;
      else if (!(id === 'place' && b.id === 'placeBack')) b.dataset.goto = b.dataset.origGoto;
    });
    if (mode === 'org' && orgEvent && !ORG_PAGES.has(id)) setName();
    prev = from;
  };
  document.body.dataset.path = mode;
  if (current) railFor(current);
  if (mode === 'org' && orgEvent && current && !ORG_PAGES.has(current)) setName();
})();
