// Real Luma in prototype v2 (11/24), on claude.ai: the page reads the viewer's own Luma through their claude.ai Luma
// connector (the artifact's `mcp` capability; the viewer allows it the first time). Read-only, and counts only:
// - list_events (status host, upcoming): the events you can pick under "bring my event"
// - get_event: the picked event's name, date, place, link and guest counts by status, kept current while the page is open
// No guest names or emails are read, so none can reach Pip. Nothing is written to Luma.
// Off claude.ai (localhost, Railway), use("mcp") isn't there and "bring my event" keeps its sample events.
(function () {
  const SERVER = 'Luma';
  let mcp = null, picked = null, unwatch = null;
  let LUMA = null; try { LUMA = JSON.parse(localStorage.getItem('nf.v2.luma') || 'null'); } catch {}
  const saveL = () => { try { LUMA ? localStorage.setItem('nf.v2.luma', JSON.stringify(LUMA)) : localStorage.removeItem('nf.v2.luma'); } catch {} };
  window.lumaReal = () => LUMA;

  // what to say for each way a connector call can fail (never one generic banner)
  const FIX = {
    server_not_connected: 'Add Luma in claude.ai: Settings → Connectors, then try again.',
    needs_reauth: 'Luma needs you to sign in again: claude.ai Settings → Connectors → Luma.',
    selection_required: 'You have more than one Luma connected. Pick one when claude.ai asks, then try again.',
    not_in_manifest: 'Luma isn\'t allowed for this page. Allow it from the page\'s permissions, then try again.',
    approval_required: 'This needs your OK to read Luma. Press connect again and allow it.',
    consent_required: 'This needs your OK to read Luma. Press connect again and allow it.',
    blocked_by_policy: 'Your organization doesn\'t allow Luma here.',
    server_unavailable: 'Luma isn\'t answering right now. Try again in a minute.',
  };
  const fixFor = e => FIX[e && e.code] || 'Couldn\'t reach Luma. Try again in a minute.';

  // a Luma time in the event's own time zone → our date and time labels
  function localParts(iso, tz) {
    const d = new Date(iso), f = o => new Intl.DateTimeFormat('en-US', { timeZone: tz || 'America/New_York', ...o }).formatToParts(d);
    const p = Object.fromEntries(f({ year: 'numeric', month: '2-digit', day: '2-digit', hour: 'numeric', minute: '2-digit', hour12: true }).map(x => [x.type, x.value]));
    return { iso: `${p.year}-${p.month}-${p.day}`, time: `${+p.hour}${p.minute !== '00' ? ':' + p.minute : ''}${String(p.dayPeriod).toLowerCase()}` };
  }
  function countsOf(ev) {
    const g = ev.guest_counts || {}, n = k => (g[k] && g[k].guests) || 0;
    return { yes: n('approved'), maybe: n('pending_approval') + n('waitlist'), no: n('declined'), invited: n('invited'), checkedIn: n('checked_in') };
  }

  // the real numbers win over the demo's simulated ones while an event is connected
  // (the forecast stays the app's one formula on the list size, as on every other screen)
  const _rsvp = rsvp;
  rsvp = function () { if (!LUMA) return _rsvp(); const c = LUMA.counts; return { yes: c.yes, maybe: c.maybe, no: c.no, none: c.invited }; };

  function applyEvent(ev) {
    const when = localParts(ev.start_at, ev.timezone), addr = (ev.geo_address_json || ev.geo_address_info || {}).address || '';
    LUMA = { id: ev.id || ev.api_id, url: ev.url, name: ev.name, counts: countsOf(ev), at: Date.now() };
    saveL();
    const c = LUMA.counts, total = c.yes + c.maybe + c.no + c.invited;
    Object.assign(Q, { name: ev.name, day: null, custDay: when.iso, time: null, custTime: when.time, area: addr.replace(/,\s*New York$/, '') || Q.area });
    setInvites(Math.max(1, total));
    $('#fromApp b').textContent = `From Luma: ${ev.name} · ${labelOf(when.iso)} · ${when.time} · ${total} on the list ✓`;
    renderQ2(); refresh(); links();
  }
  // the event's Luma link everywhere points at the real page
  function links() {
    if (!LUMA || !LUMA.url || !/^https:\/\//.test(LUMA.url)) return;
    const short = LUMA.url.replace(/^https:\/\//, '');
    document.querySelectorAll('[data-evslug]').forEach(el => { el.textContent = short; });
    document.querySelectorAll('a.luma, #evMeta a').forEach(a => { a.href = LUMA.url; a.target = '_blank'; a.rel = 'noopener'; a.onclick = null; });
  }
  // keep the counts current while the page is open (a read, refreshed every 2 minutes)
  function watch() {
    if (!mcp || !LUMA || unwatch) return;
    unwatch = mcp.watchTool(SERVER, 'get_event', { event_id: LUMA.id }, ev => {
      if (ev.type === 'data' && ev.result && ev.result.payload && typeof ev.result.payload === 'object') {
        const p = ev.result.payload; LUMA.counts = countsOf(p); LUMA.at = (ev.result.cache && ev.result.cache.storedAt) || Date.now(); saveL(); refresh(); links();
      } else if (ev.type === 'error' && ['needs_reauth', 'server_not_connected', 'blocked_by_policy', 'approval_required', 'not_in_manifest'].includes(ev.error.code)) {
        toast(fixFor(ev.error));
      }
    }, { refetchInterval: 120000 });
  }

  // "connect" on bring my event: your real upcoming events on Luma
  function rowHTML(e, i) {
    const w = localParts(e.start_at, e.timezone);
    const b = document.createElement('b'); b.textContent = e.name;
    const s = document.createElement('span'); s.textContent = `${labelOf(w.iso)} · ${w.time} · ${e.guest_count || 0} on the list`;
    return `<button class="row-card pick" role="radio" aria-checked="false" data-path="cover" data-luma="${i}"><span class="tick" aria-hidden="true"></span><div>${b.outerHTML}${s.outerHTML}</div></button>`;
  }
  async function connect(btn) {
    const say = t => { $('#bringSay').textContent = t; };
    btn.disabled = true; btn.textContent = 'connecting…';
    try {
      const r = await mcp.callTool(SERVER, 'list_events', { status: 'host', period: 'future', limit: 20 }, { cache: false });
      const list = (r.payload && r.payload.entries) || [];
      picked = list;
      btn.outerHTML = '<span class="state-ok">connected ✓</span>';
      const box = document.querySelector('#pickEvent [role="radiogroup"]');
      if (!list.length) { box.innerHTML = ''; say('Luma is connected, but you have no upcoming events you host. Make one on luma.com, then connect again.'); $('#pickEvent').hidden = false; return; }
      box.innerHTML = list.map(rowHTML).join('');
      $('#pickEvent').hidden = false; $('#useEvent').disabled = true;
      say(list.length === 1 ? 'Found your upcoming event on Luma. Is this the one?' : `Found ${list.length} upcoming events you host. Which one are we planning?`);
    } catch (e) {
      btn.disabled = false; btn.textContent = 'connect';
      say(fixFor(e));
    }
  }
  document.addEventListener('click', async e => {
    const c = e.target.closest('#connectLuma');
    if (c && mcp) { e.stopImmediatePropagation(); e.preventDefault(); connect(c); return; }
    const use = e.target.closest('#useEvent');
    if (use && picked) {
      const row = document.querySelector('#pickEvent [data-luma][aria-checked="true"]'); if (!row) return;
      const ev = picked[+row.dataset.luma];
      try {
        const r = await mcp.callTool(SERVER, 'get_event', { event_id: ev.api_id }, { cache: false });
        applyEvent(r.payload && typeof r.payload === 'object' ? r.payload : ev);
      } catch (err) { applyEvent(ev); toast(fixFor(err)); }
      watch();
    }
  }, true);

  // light up when this view can read connectors (claude.ai); otherwise the sample events stay
  if (window.claude && typeof window.claude.use === 'function') {
    window.claude.use('mcp').then(m => {
      mcp = m || null;
      if (!mcp) return;
      document.querySelectorAll('#bring .fine, [data-id="bring"] .fine').forEach(p => { p.textContent = 'Pip only reads your event and its guest counts. Nothing changes in Luma.'; });
      if (LUMA) { links(); watch(); }
    }).catch(() => {});
  }
  // the sample-event path in v2.js steps aside when the real list is showing
  window.lumaPicking = () => !!picked;
  if (LUMA) { refresh(); links(); }
  // start over clears the connected event too
  document.addEventListener('click', e => { if (e.target.closest('[data-restart]')) { LUMA = null; saveL(); } }, true);
})();
