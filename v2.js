// NoFuss v2: the screens from context/ui-ux/flow.md in brand v0.2.
// Plain script (no build step). Pages are <section class="screen" data-id>; data-goto links them.
const $ = (s, r = document) => r.querySelector(s);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const rand = (a, b) => a + Math.random() * (b - a);
// the demo remembers one run on this device, so a reload keeps your event ("start over" clears it)
let SAVED = {}; try { SAVED = JSON.parse(localStorage.getItem('nf.v2.run') || '{}') || {}; } catch {}
let BUDGET_TOUCHED = !!SAVED.EV;
let STK = SAVED.STK || 'setup', LOG = SAVED.LOG || [], READY = false;
const THREAD = SAVED.THREAD || [];   // the chat with Pip (11/24)

// ---------- pages ----------
const screens = [...document.querySelectorAll('.screen')];
let current = null;
function go(id) {
  if (!screens.some(s => s.dataset.id === id)) id = 'landing';
  current = id;
  screens.forEach(s => s.classList.toggle('on', s.dataset.id === id));
  try { history.replaceState(null, '', location.search + '#' + id); } catch {}
  window.scrollTo(0, 0);
  if (id === 'landing') startLanding();
}
document.addEventListener('click', e => { const t = e.target.closest('[data-goto]'); if (t) go(t.dataset.goto); });
addEventListener('hashchange', () => { const id = location.hash.slice(1); if (id && id !== current) go(id); });
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, 3500); }

// icons in white discs (our own set, never emoji)
document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = nfIcon(el.dataset.icon, { color: el.dataset.iconColor || 'var(--p-burgundy)', size: 30 }); });

// Pip's face: the host's Pip (yellow circle by default); always opens the chat (the chat comes with the in-app screens)
const PIPME = { color: 'yellow', shape: 'circle' };
try { Object.assign(PIPME, JSON.parse(localStorage.getItem('nf.v2.pip') || '{}')); } catch (e) {}
PIPME.name = PIPME.name || 'Pip'; PIPME.voice = PIPME.voice || 'warm'; PIPME.talk = PIPME.talk || 'playful';
document.querySelectorAll('[data-pipface]').forEach(el => { el.innerHTML = nfPip({ color: PIPME.color, shape: PIPME.shape, size: 52 }); });
document.addEventListener('click', e => { if (e.target.closest('[data-pipface], [data-chat]')) openChat(); });

// choice cards: pick one, and the group's continue button goes down that path
document.querySelectorAll('[role="radiogroup"][data-next]').forEach(g => g.addEventListener('click', e => {
  const c = e.target.closest('[role="radio"]'); if (!c) return;
  g.querySelectorAll('[role="radio"]').forEach(x => x.setAttribute('aria-checked', x === c));
  const btn = document.getElementById(g.dataset.next); btn.disabled = false; btn.dataset.goto = c.dataset.path;
}));

// ---------- 1 · the intro (first open only; ?intro replays it) ----------
const COLORS = ['yellow', 'burgundy', 'orange', 'olive', 'blue', 'pink']; // butter only sits on dark discs
let timers = [], falling = false;
const seenIntro = () => { try { return localStorage.getItem('nf.v2.intro') === 'seen'; } catch { return false; } };
const markSeen = () => { try { localStorage.setItem('nf.v2.intro', 'seen'); } catch {} };
function startLanding() {
  if (!seenIntro() || new URLSearchParams(location.search).has('intro')) playIntro();
  else { $('#intro').style.display = 'none'; setStayPip(); }
}

// is a point inside a Pip's shape? (same shapes as pips.js, a little shrunk) — used to fill every gap
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const inRR = (u, v, x0, y0, x1, y1, rad) => { if (u < x0 || u > x1 || v < y0 || v > y1) return false; const cx = clamp(u, x0 + rad, x1 - rad), cy = clamp(v, y0 + rad, y1 - rad); return (u - cx) ** 2 + (v - cy) ** 2 <= rad * rad; };
const inC = (u, v, cx, cy, r) => (u - cx) ** 2 + (v - cy) ** 2 <= r * r;
function inPip(p, px, py) {
  const u = (px - p.x) / p.s * 120, v = (py - p.top) / p.s * 120;
  switch (p.color) {
    case 'yellow': return inC(u, v, 60, 62, 44);
    case 'burgundy': return v < 60 ? inC(u, v, 60, 60, 44) : inRR(u, v, 16, 40, 104, 106, 7);
    case 'orange': return v < 62 ? inC(u, v, 60, 62, 44) : inRR(u, v, 16, 40, 104, 106, 7);
    case 'blue': return inRR(u, v, 24, 14, 96, 108, 36);
    case 'olive': return v < 100 ? (v > 50 && inC(u, v, 60, 100, 50)) : inRR(u, v, 10, 80, 110, 106, 5);
    default: return inRR(u, v, 16, 24, 104, 106, 24);
  }
}

function playIntro() {
  const intro = $('#intro'), btn = $('#go');
  timers.forEach(clearTimeout); timers = []; falling = false;
  intro.querySelectorAll('.pip').forEach(p => p.remove());
  intro.style.display = ''; intro.style.opacity = ''; intro.classList.remove('clearing');
  btn.className = 'go';
  document.documentElement.style.overflow = 'hidden';
  $('#stayPip').classList.add('hidden'); $('#stayPip').innerHTML = '';

  const W = intro.clientWidth, H = intro.clientHeight;
  const base = Math.max(120, Math.min(250, W / 5));
  const stepY = base * 0.6, stepX = base * 0.8;
  const rows = Math.ceil((H + base * 1.2) / stepY), rowDelay = 1250 / rows;
  const CELL = 40, buckets = {}, placed = [];
  let row = 0, last = [];
  const addPip = (x, top, s, r, behind) => {
    let color; do { color = COLORS[Math.floor(Math.random() * COLORS.length)]; } while (last.includes(color));
    last = [color, last[0]];
    const el = document.createElement('div');
    el.className = 'pip'; el.dataset.color = color;
    el.style.cssText = `left:${x}px; top:${top}px; width:${s}px; height:${s}px; z-index:${(behind ? 0 : 1000) - r * 10 + Math.floor(rand(0, 9))}`;
    el.innerHTML = nfPip({ color, size: s });
    intro.insertBefore(el, btn);
    const pip = { el, top, s, r, x, color }; placed.push(pip);
    for (let bx = Math.floor(x / CELL); bx <= Math.floor((x + s) / CELL); bx++)
      for (let by = Math.floor(top / CELL); by <= Math.floor((top + s) / CELL); by++) (buckets[bx + ',' + by] ||= []).push(pip);
  };
  for (let y = H + base * 0.15; y > -base * 0.75; y -= stepY, row++)
    for (let x = -base * 0.45 + (row % 2) * stepX * 0.5; x < W + base * 0.1; x += stepX) { const s = base * rand(0.95, 1.12); addPip(x + rand(-5, 5), y - s * 0.62 + rand(-4, 4), s, row, false); }
  for (let gx = 0; gx <= W; gx += 2) for (let gy = 0; gy <= H; gy += 2) {
    const near = buckets[Math.floor(gx / CELL) + ',' + Math.floor(gy / CELL)] || [];
    if (near.some(p => inPip(p, gx, gy))) continue;
    const s = base * 0.9; addPip(gx - s / 2, gy - s * 0.55, s, Math.round((H - gy) / stepY), true);
  }
  // ↻ animation: intro. They fall in from the top, bottom rows first, and pile up.
  if (!reduce) placed.forEach(({ el, top, s, r }) => {
    const fall = top + s + rand(40, 160);
    el.animate([
      { transform: `translateY(-${fall}px)`, easing: 'cubic-bezier(.5,0,.9,.5)' },
      { transform: 'translateY(0)', offset: .72, easing: 'cubic-bezier(.2,.8,.4,1)' },
      { transform: 'translateY(-7%)', offset: .86, easing: 'cubic-bezier(.5,0,.8,.4)' },
      { transform: 'translateY(0)' },
    ], { duration: 620, delay: Math.max(0, r) * rowDelay + rand(0, 120), fill: 'both' });
  });
  timers.push(setTimeout(() => { btn.classList.add('show'); btn.focus({ preventScroll: true }); }, reduce ? 300 : 2000));
  if (!reduce) timers.push(setTimeout(blinkSome, 2200));
}

function dropPips() {
  if (falling) return; falling = true; markSeen();
  const intro = $('#intro'), btn = $('#go');
  btn.classList.remove('show'); btn.classList.add('leave');
  const H = intro.clientHeight;
  let pips = [...intro.querySelectorAll('.pip')];
  // One Pip stays behind. The landing is burgundy, so it's always a yellow Pip (Mari 11/23).
  const stay = $('#stayPip'), ir = intro.getBoundingClientRect(), tr = stay.getBoundingClientRect();
  let keeper = null;
  if (!reduce && tr.bottom < ir.bottom && tr.width > 0) {
    const tx = tr.left + tr.width / 2, ty = tr.top + tr.height / 2; let best = Infinity;
    pips.filter(p => +p.style.zIndex > 0 && p.dataset.color === 'yellow').forEach(p => {
      const r = p.getBoundingClientRect(), d = Math.hypot(r.left + r.width / 2 - tx, r.top + r.height / 2 - ty);
      if (d < best) { best = d; keeper = p; }
    });
  }
  setStayPip(true);
  if (keeper) {
    pips = pips.filter(p => p !== keeper);
    keeper.getAnimations().forEach(a => a.finish());
    const r = keeper.getBoundingClientRect(), k = tr.width / r.width;
    keeper.style.zIndex = 4500; keeper.style.transformOrigin = '0 0';
    keeper.animate([
      { transform: 'translate(0,0) scale(1)' },
      { transform: 'translate(0,-14px) scale(1)', offset: .2 },
      { transform: `translate(${tr.left - r.left}px, ${tr.top - r.top}px) scale(${k})` },
    ], { duration: 1100, delay: 150, easing: 'cubic-bezier(.45,0,.25,1)', fill: 'forwards' });
  }
  if (reduce) { intro.style.transition = 'opacity .3s'; intro.style.opacity = 0; timers.push(setTimeout(endIntro, 320)); return; }
  intro.classList.add('clearing');
  let longest = 0;
  pips.forEach(p => {
    p.getAnimations().forEach(a => a.finish());
    const top = parseFloat(p.style.top), s = parseFloat(p.style.width);
    const delay = rand(0, 260) + (H - top) / H * 120, dur = rand(780, 1100);
    longest = Math.max(longest, delay + dur);
    p.animate([
      { transform: 'translate(0,0) rotate(0deg)', easing: 'cubic-bezier(.2,.7,.4,1)' },
      { transform: `translate(0,-${rand(10, 20)}px) rotate(0deg)`, offset: .16, easing: 'cubic-bezier(.55,0,.95,.55)' },
      { transform: `translate(${rand(-40, 40)}px, ${H - top + s + 80}px) rotate(${rand(-35, 35)}deg)` },
    ], { duration: dur, delay, fill: 'forwards' });
  });
  timers.push(setTimeout(endIntro, Math.max(longest, 1300) + 50));
}
function endIntro() {
  const intro = $('#intro');
  setStayPip(); $('#stayPip').classList.remove('hidden');
  intro.style.display = 'none'; intro.style.opacity = ''; intro.style.transition = '';
  document.documentElement.style.overflow = '';
  falling = false;
}
function setStayPip(keepHidden) {
  if (!$('#stayPip').innerHTML) $('#stayPip').innerHTML = nfPip({ color: 'yellow', size: 300 });
  if (!keepHidden) $('#stayPip').classList.remove('hidden');
}
$('#go').onclick = dropPips;
$('#skip').onclick = () => { timers.forEach(clearTimeout); markSeen(); endIntro(); };
addEventListener('keydown', e => { if (e.key === 'Escape' && current === 'landing' && $('#intro').style.display !== 'none') $('#skip').click(); });

// tap a Pip: it jumps; now and then one blinks
function jump(svg) {
  if (!svg || svg.getAnimations().some(a => a.id === 'jump')) return null;
  const a = svg.animate([
    { transform: 'translateY(0) scale(1,1)' }, { transform: 'translateY(0) scale(1.1,.88)', offset: .14 },
    { transform: 'translateY(-34%) scale(.94,1.08)', offset: .5 }, { transform: 'translateY(0) scale(1.08,.92)', offset: .84 },
    { transform: 'translateY(0) scale(1,1)' },
  ], { duration: reduce ? 1 : 560, easing: 'ease-in-out' });
  a.id = 'jump'; return a;
}
function blink(svg, twice) {
  const k = [{ transform: 'scaleY(1)' }, { transform: 'scaleY(.12)', offset: .45 }, { transform: 'scaleY(1)' }];
  if (twice) k.splice(2, 0, { transform: 'scaleY(1)', offset: .6 }, { transform: 'scaleY(.12)', offset: .78 });
  svg.querySelectorAll(':scope > circle').forEach(el => el.animate(k, { duration: twice ? 380 : 200, easing: 'ease-in-out' }));
}
$('#intro').addEventListener('pointerdown', e => {
  const p = e.target.closest('.pip'); if (!p || falling) return;
  const z = p.style.zIndex; p.style.zIndex = 4000;
  const a = jump(p.querySelector('svg')); if (a) a.onfinish = () => { p.style.zIndex = z; };
});
$('#stayPip').addEventListener('pointerdown', () => jump($('#stayPip svg')));
function blinkSome() {
  const intro = $('#intro');
  if (intro.style.display === 'none' || falling) return;
  const pips = [...intro.querySelectorAll('.pip')].filter(p => +p.style.zIndex > 0);
  const p = pips[Math.floor(Math.random() * pips.length)];
  if (p) blink(p.querySelector('svg'), Math.random() < .3);
  timers.push(setTimeout(blinkSome, rand(900, 2200)));
}
(function stayBlink() {
  const svg = $('#stayPip svg');
  if (svg && !reduce && !$('#stayPip').classList.contains('hidden') && current === 'landing') blink(svg, Math.random() < .3);
  setTimeout(stayBlink, rand(2200, 4500));
})();

// ---------- 5 · connect your event app ----------
$('#connectLuma').onclick = e => {
  e.target.outerHTML = '<span class="state-ok">connected ✓</span>';
  $('#pickEvent').hidden = false; $('#bringSay').textContent = 'Found 2 upcoming events. Which one are we planning?';
};

// ---------- 6 · Q1: the event type (drives Q2's advice) ----------
const Q = { type: 'cocktail party', day: null, time: null, custDay: null, custTime: null, calMonth: '2026-12', calOpen: false, wheelOpen: false, tH: 7, tM: 0, tAP: 'pm', invites: 30, name: '', area: 'Lower East Side', pro: null };
if (SAVED.Q) Object.assign(Q, SAVED.Q, { calOpen: false, wheelOpen: false });
document.querySelectorAll('[data-id="q1"] .tile').forEach(t => {
  t.insertAdjacentHTML('beforeend', '<span class="tile-tick" aria-hidden="true"></span>');
  t.addEventListener('click', () => {
    if (Q.type !== t.dataset.type) Object.assign(Q, { day: null, time: null, custDay: null, custTime: null, calOpen: false, wheelOpen: false });
    Q.type = t.dataset.type;
    $('#otherType').hidden = Q.type !== 'something else'; if (!$('#otherType').hidden) $('#otherType').focus();
    renderQ2();
  });
});

// ---------- 7 · Q2: when (advice follows the type; hardcoded for now, Burak: fine if consistent) ----------
const WHEN = {
  'cocktail party':   { say: "For cocktail parties, Thursdays and Fridays get the most yeses, and 7pm gives people time to get there after work.", days: ['2026-12-03', '2026-12-04', '2026-12-05'], day: '2026-12-04', times: ['6pm', '7pm', '8pm'], time: '7pm' },
  'dinner':           { say: "Dinners do best Thursday to Saturday, and most people like to sit down by 7:30.", days: ['2026-12-03', '2026-12-04', '2026-12-05'], day: '2026-12-05', times: ['7pm', '7:30pm', '8pm'], time: '7:30pm' },
  'networking night': { say: "Networking nights do best midweek. People keep Fridays for friends, so start right after work.", days: ['2026-12-01', '2026-12-02', '2026-12-03'], day: '2026-12-02', times: ['5:30pm', '6pm', '7pm'], time: '6pm' },
  'a talk':           { say: "Talks and launches do best early in the week. Tuesday right after work is a classic.", days: ['2026-12-01', '2026-12-02', '2026-12-03'], day: '2026-12-01', times: ['6pm', '6:30pm', '7pm'], time: '6:30pm' },
  'birthday':         { say: "Birthdays work best on a Friday or Saturday night, so nobody has work the next morning.", days: ['2026-12-04', '2026-12-05', '2026-12-06'], day: '2026-12-05', times: ['7pm', '8pm', '9pm'], time: '8pm' },
  'something else':   { say: "Fridays at 7 are a safe start. Change it if your crowd is different.", days: ['2026-12-03', '2026-12-04', '2026-12-05'], day: '2026-12-04', times: ['6pm', '7pm', '8pm'], time: '7pm' },
};
const TODAY = '2026-11-23';
const dOf = iso => new Date(iso + 'T12:00:00');
const isoOf = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const labelOf = iso => { const d = dOf(iso); return d.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase() + ' ' + (d.getMonth() + 1) + '/' + d.getDate(); };
const addDays = (iso, n) => { const d = dOf(iso); d.setDate(d.getDate() + n); return isoOf(d); };
const dayDiff = (a, b) => Math.round((dOf(b) - dOf(a)) / 86400000);
const pillHTML = (label, on, suggested, extra = '') => `<button class="pill" role="radio" aria-checked="${on}" ${extra}>${label}${suggested ? '<span class="tag">suggested</span>' : ''}</button>`;
function renderQ2() {
  const w = WHEN[Q.type] || WHEN['something else'];
  if (!Q.day && !Q.custDay) Q.day = w.day;
  if (!Q.time && !Q.custTime) Q.time = w.time;
  $('#q2Say').textContent = w.say + " I've marked my pick, but it's your call.";
  $('#dayGroup').innerHTML = w.days.map(iso => pillHTML(labelOf(iso), Q.day === iso && !Q.custDay, iso === w.day, `data-day="${iso}"`)).join('')
    + pillHTML(Q.custDay ? labelOf(Q.custDay) : 'pick a date', !!Q.custDay || Q.calOpen, false, 'data-cal');
  $('#timeGroup').innerHTML = w.times.map(t => pillHTML(t, Q.time === t && !Q.custTime, t === w.time, `data-time="${t}"`)).join('')
    + pillHTML(Q.custTime || 'pick a time', !!Q.custTime || Q.wheelOpen, false, 'data-wheel');
  const cal = $('#calendar'); cal.hidden = !Q.calOpen;
  if (Q.calOpen) {
    const [y, m] = Q.calMonth.split('-').map(Number);
    const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7, count = new Date(y, m, 0).getDate();
    const cells = Array.from({ length: Math.ceil((lead + count) / 7) * 7 }, (_, i) => {
      const d = new Date(y, m - 1, 1 - lead + i), iso = isoOf(d);
      return `<button data-pickday="${iso}" class="${d.getMonth() === m - 1 ? '' : 'out'}" aria-pressed="${Q.custDay === iso}" ${iso < TODAY ? 'disabled' : ''} aria-label="${d.toDateString()}">${d.getDate()}</button>`;
    }).join('');
    const name = new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toLowerCase();
    cal.innerHTML = `<div class="cal-head"><b>${name}</b><span><button data-calshift="-1" aria-label="Previous month">‹</button> <button data-calshift="1" aria-label="Next month">›</button></span></div>
      <div class="cal-grid">${['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(x => `<span class="dow">${x}</span>`).join('')}${cells}</div>`;
  }
  const wheel = $('#wheel'); wheel.hidden = !Q.wheelOpen;
  if (Q.wheelOpen) {
    const col = (vals, cur, key, wrap, fmt) => [-2, -1, 0, 1, 2].map(off => {
      let i = vals.indexOf(cur) + off; if (wrap) i = (i + vals.length) % vals.length;
      const v = vals[i], far = Math.abs(off);
      return v == null ? '<button style="visibility:hidden"></button>'
        : `<button data-wkey="${key}" data-wval="${v}" style="font-size:${far ? (far === 1 ? 20 : 15) : 26}px;font-weight:${far ? 600 : 800};opacity:${far ? (far === 1 ? .55 : .3) : 1}" aria-label="${fmt(v)}">${fmt(v)}</button>`;
    }).join('');
    wheel.innerHTML = `<div class="wheel-cols"><div class="wheel-band"></div>
      <div class="wheel-col">${col([1,2,3,4,5,6,7,8,9,10,11,12], Q.tH, 'tH', true, String)}</div>
      <div class="wheel-col">${col([0,5,10,15,20,25,30,35,40,45,50,55], Q.tM, 'tM', true, v => String(v).padStart(2, '0'))}</div>
      <div class="wheel-col">${col(['am','pm'], Q.tAP, 'tAP', false, v => v.toUpperCase())}</div></div>
      <div class="wheel-ok"><button data-wcancel>cancel</button><button class="ok" data-wok>OK</button></div>`;
  }
  $('#q2Next').disabled = !((Q.day || Q.custDay) && (Q.time || Q.custTime));
}
document.querySelector('[data-id="q2"]').addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) return;
  const d = t.dataset;
  if (d.day) Object.assign(Q, { day: d.day, custDay: null, calOpen: false });
  else if (d.cal != null) Object.assign(Q, { calOpen: !Q.calOpen, wheelOpen: false });
  else if (d.pickday) Object.assign(Q, { custDay: d.pickday, day: null, calOpen: false });
  else if (d.calshift) { const [y, m] = Q.calMonth.split('-').map(Number); Q.calMonth = isoOf(new Date(y, m - 1 + +d.calshift, 1)).slice(0, 7); }
  else if (d.time) Object.assign(Q, { time: d.time, custTime: null, wheelOpen: false });
  else if (d.wheel != null) Object.assign(Q, { wheelOpen: !Q.wheelOpen, calOpen: false });
  else if (d.wkey) Q[d.wkey] = d.wkey === 'tAP' ? d.wval : +d.wval;
  else if (d.wcancel != null) Q.wheelOpen = false;
  else if (d.wok != null) Object.assign(Q, { custTime: `${Q.tH}:${String(Q.tM).padStart(2, '0')}${Q.tAP}`.replace(':00', ''), time: null, wheelOpen: false });
  else return;
  renderQ2();
});
renderQ2();

// ---------- 8 · Q3: the forecast follows the invite count (typed or stepped) ----------
function setInvites(n, typing) {
  Q.invites = Math.max(1, Math.min(500, n));
  if (!typing) $('#count').value = Q.invites;
  $('#fcNum').textContent = `~${Math.round(Q.invites * .53)}–${Math.round(Q.invites * .67)}`;
  $('#fcFood').textContent = `~${Math.round(Q.invites * .67)}`;
}
$('#minus').onclick = () => setInvites(Q.invites - 1);
$('#plus').onclick = () => setInvites(Q.invites + 1);
$('#count').addEventListener('input', e => { const v = e.target.value.replace(/\D/g, ''); e.target.value = v; if (v) setInvites(+v, true); });
$('#count').addEventListener('blur', e => setInvites(+e.target.value || Q.invites));
$('#count').addEventListener('keydown', e => {
  if (e.key === 'ArrowUp') { e.preventDefault(); setInvites(Q.invites + 1); }
  if (e.key === 'ArrowDown') { e.preventDefault(); setInvites(Q.invites - 1); }
  if (e.key === 'Enter') e.target.blur();
});

// ---------- who's covering what → budget → plan → checkout (one set of answers drives them all) ----------
const EV = { venue: 'free', food: 'host', drinks: 'host', cap: 600, size: 'right', place: null, deposit: 250, extras: [] };
if (SAVED.EV) Object.assign(EV, SAVED.EV);
const FEES = [['Delivery', 12], ['Service fee', 5]];
const SIZE_K = { lean: .8, right: 1, every: 1.1 };
function orderLines() {
  const k = SIZE_K[EV.size] * Q.invites / 30, r = n => Math.round(n * k), L = [];   // sized to the guest count (the sample order is for 30 invited)
  if (EV.drinks === 'host') L.push([`Wine, ${r(8)} bottles`, r(120)], [`Beer, ${r(30)}`, r(80)], ['Signature cocktail kit', r(110)], ['No-alcohol drinks', r(40)]);
  if (EV.drinks === 'mix') L.push([`Wine, ${r(4)} bottles`, r(60)], ['No-alcohol drinks', r(40)]);
  if (EV.drinks !== 'host') L.push(['Ice, cups and mixers', 45]);
  if (EV.food === 'host') L.push(['Bites', r(45)]);
  return L;
}
const orderTotal = () => { const L = orderLines(); return L.length ? L.reduce((t, l) => t + l[1], 0) + FEES.reduce((t, f) => t + f[1], 0) : 0; };
const venueCost = () => (EV.venue === 'paid' || EV.venue === 'find') ? EV.deposit : 0;
const estimate = () => orderTotal() + venueCost();
const money = n => '$' + n;

function renderCover() {
  document.querySelectorAll('[data-cover]').forEach(b => b.setAttribute('aria-checked', EV[b.dataset.cover] === b.dataset.val));
  const say = [];
  if (EV.venue === 'find') say.push("I'll shortlist three places that fit, next.");
  else if (EV.venue === 'paid') say.push("Venues usually want a deposit. I'll count it in your budget and ask before booking.");
  else if (EV.venue === 'booked') say.push("Great, the place is sorted. I'll leave it out of the budget.");
  if (EV.food === 'potluck') say.push("For a potluck I'll add a sign-up to the invite, so dishes don't double up.");
  if (EV.drinks === 'byob') say.push("BYOB: I'll say so in the invite and just get ice, cups and mixers.");
  if (EV.drinks === 'mix') say.push("I'll cover the basics, and the invite asks people to bring a bottle if they like.");
  $('#coverSay').textContent = say.length ? say.join(' ') : "Tell me who's covering what, so I only plan and buy what you need.";
  $('#coverNote').textContent = `With these answers I'd expect about ${money(estimate())}.`;
  $('#coverNext').dataset.goto = EV.venue === 'find' ? 'place' : 'q4';
}
document.addEventListener('click', e => { const b = e.target.closest('[data-cover]'); if (b) { EV[b.dataset.cover] = b.dataset.val; refresh(); } });
$('#useEvent').addEventListener('click', () => { $('#fromApp').hidden = false; });
$('#startNext').addEventListener('click', () => { if ($('#startNext').dataset.goto === 'q1') $('#fromApp').hidden = true; });

// ---------- find a place: three at a time, by event type ----------
const PLACES = {
  dinner: [
    { n: 'Lucia, private room', src: 'Resy', kind: 'private dining room', cap: 'up to 22', price: 'free · $65 per person minimum', dep: 0, go: '10 min by subway (F)', note: 'Quiet enough to talk' },
    { n: 'The Long Table', src: 'OpenTable', kind: 'restaurant reservation', cap: 'up to 20', price: 'free · card held for no-shows', dep: 0, go: '7 min walk', note: 'Card hold counts as a payment' },
    { n: 'Studio 4B', src: 'Peerspace', kind: 'space + your caterer', cap: 'up to 30', price: '$300 deposit', dep: 300, go: '12 min by subway (L)', note: 'Kitchen on site' },
  ],
  party: [
    { n: 'Roof at 120 Grand', src: 'Peerspace', kind: 'rooftop + indoor backup', cap: 'up to 30', price: '$250 deposit', dep: 250, go: '5 min walk', note: 'Rain backup room ✓' },
    { n: 'Bar Nine, back room', src: 'Resy', kind: 'bar, private room', cap: 'up to 25', price: 'free · $35 per person minimum', dep: 0, go: '12 min by subway (F)', note: 'Drinks handled by the bar' },
    { n: 'The Loft on Grand', src: 'Peerspace', kind: 'event space', cap: 'up to 40', price: '$280 deposit', dep: 280, go: '9 min walk', note: 'Bring your own drinks allowed' },
  ],
  talk: [
    { n: 'Hall 2, Ace Hotel', src: 'hotel quote', kind: 'meeting room with screen', cap: 'up to 60', price: '$450 deposit', dep: 450, go: '15 min by subway (N)', note: 'Mic and projector included' },
    { n: 'Studio 4B', src: 'Peerspace', kind: 'space + chairs', cap: 'up to 50', price: '$300 deposit', dep: 300, go: '12 min by subway (L)', note: 'Screen on request' },
    { n: 'The Reading Room', src: 'Peerspace', kind: 'library-style room', cap: 'up to 35', price: '$220 deposit', dep: 220, go: '6 min walk', note: 'Good acoustics' },
  ],
};
const placeKind = () => ({ 'dinner': 'dinner', 'a talk': 'talk' })[Q.type] || 'party';
let PLACE_FROM = 'cover';
function renderPlaces() {
  const k = placeKind();
  $('#placeSay').textContent = { dinner: 'For a dinner I look at reservations and private rooms first. Here are three that fit.', talk: 'For a talk you need a room with a screen and seats. Here are three.', party: 'For a party this size, event spaces and bars with a private room work best. Here are three.' }[k];
  $('#placeNear').textContent = `around ${Q.area || 'you'}`;
  $('#placeFor').textContent = `for ~${Math.round(Q.invites * .67)} · ${labelOf(Q.custDay || Q.day || '2026-12-04')}`;
  $('#places').innerHTML = PLACES[k].map((p, i) => `<article class="place ${EV.place === p.n ? 'picked' : ''}">
      <div class="photo">${nfIcon('location', { color: 'var(--p-ink)', size: 40 })}</div><span class="src">${p.src}</span><b>${p.n}</b>
      <ul><li>${p.kind} · ${p.cap}</li><li>${p.price}</li><li>${p.go}</li><li>${p.note}</li></ul>
      <div class="acts"><button class="mini" data-pickplace="${i}">${EV.place === p.n ? 'picked ✓' : 'pick this'}</button><button class="ghost" data-pipface>more like this</button></div></article>`).join('');
  $('#placeBack').dataset.goto = PLACE_FROM;
}
document.addEventListener('click', e => {
  const f = e.target.closest('[data-place-from]'); if (f) PLACE_FROM = f.dataset.placeFrom;
  if (e.target.closest('#coverNext') && EV.venue === 'find') PLACE_FROM = 'cover';
  const pk = e.target.closest('[data-pickplace]'); if (!pk) return;
  const p = PLACES[placeKind()][+pk.dataset.pickplace];
  EV.place = p.n; EV.deposit = p.dep; EV.venue = p.dep ? 'find' : 'free';
  refresh(); renderPlaces();
  setTimeout(() => go(PLACE_FROM === 'cover' ? 'q4' : PLACE_FROM), 450);
}, true);

// ---------- budget: the suggestion follows the estimate; customize takes a typed cap ----------
function renderBudget() {
  const est = estimate(), key = est < 300 ? 'low' : est <= 600 ? 'mid' : 'custom';
  document.querySelectorAll('#budgetRows .opt-row').forEach(r => {
    r.querySelector('.opt-tag').innerHTML = r.dataset.key === key ? '<span class="tag">suggested</span>' : '';
    const sub = r.querySelector('.sub');
    if (r.dataset.key === 'low') { const t = key === 'low' ? `About right: I'd expect ~${money(est)}` : ''; if (sub) sub.textContent = t; else if (t) r.querySelector('.opt-txt').insertAdjacentHTML('beforeend', `<span class="sub">${t}</span>`); }
    if (r.dataset.key === 'mid') { const t = key === 'mid' ? `About right: I'd expect ~${money(est)}` : ''; if (sub) sub.textContent = t; else if (t) r.querySelector('.opt-txt').insertAdjacentHTML('beforeend', `<span class="sub">${t}</span>`); }
    if (r.dataset.key === 'custom') sub.textContent = key === 'custom' ? `I'd expect ~${money(est)}, so set your own cap` : 'Type your own spending cap';
  });
  const up = Math.ceil(est / 50) * 50;
  $('#budgetAmt').placeholder = up;
  if (!BUDGET_TOUCHED) {
    document.querySelectorAll('#budgetRows .opt-row').forEach(r => r.setAttribute('aria-checked', r.dataset.key === key));
    $('#customBudget').hidden = key !== 'custom';
    if (key === 'custom') { $('#budgetAmt').value = up; EV.cap = up; } else EV.cap = key === 'low' ? 300 : 600;
    $('#q4Next').disabled = false; $('#q4Next').dataset.goto = 'q5';
  }
  $('#budgetSay').textContent = `This is your spending cap. I'll never go over it without asking. With your answers I'd expect about ${money(est)}${venueCost() ? ', including the venue deposit' : ''}.`;
}
(function () {
  const g = $('#budgetRows'), box = $('#customBudget'), amt = $('#budgetAmt'), next = $('#q4Next');
  const check = () => {
    const custom = g.querySelector('[data-custom-budget]').getAttribute('aria-checked') === 'true';
    box.hidden = !custom;
    if (custom) { next.disabled = !amt.value; $('#budgetHint').textContent = amt.value && +amt.value < 150 ? "That's tight for ~20 guests. I'll keep the order small and tell you what fits." : 'Pip never goes over this without asking.'; }
  };
  g.addEventListener('click', e => { const r = e.target.closest('.opt-row'); if (r) BUDGET_TOUCHED = true; if (r && r.dataset.cap) EV.cap = +r.dataset.cap; setTimeout(() => { check(); if (!box.hidden) amt.focus(); }); });
  amt.addEventListener('input', () => { BUDGET_TOUCHED = true; amt.value = amt.value.replace(/\D/g, ''); if (amt.value) EV.cap = +amt.value; check(); });
})();
// hands-on: the suggested level carries the tag
document.querySelectorAll('[data-suggested] .opt-tag').forEach(t => { t.innerHTML = '<span class="tag">suggested</span>'; });

// ---------- the things that need the host's OK, built from the answers ----------
function okItems() {
  const items = [{ id: 'invite', title: 'the invite', sub: `Free · to ${Q.invites} people from your Luma page`, cost: 0 }];
  if (venueCost()) items.push({ id: 'venue', title: 'the venue deposit', sub: `${EV.place || 'your venue'} · a card hold counts as a payment`, cost: venueCost() });
  if (EV.food === 'potluck') items.push({ id: 'potluck', title: 'the potluck sign-up', sub: 'Free · goes out with the invite', cost: 0 });
  const what = EV.drinks === 'host' ? (EV.food === 'host' ? 'drinks and bites' : 'drinks') : EV.drinks === 'mix' ? 'drinks basics' : 'ice, cups and mixers';
  items.push({ id: 'order', title: `the order: ${what}`, sub: 'Instacart · delivered on the day, 4–6pm', cost: orderTotal() });
  return items;
}

// ---------- icons and Pips that fill in on load ----------
// one bold back arrow everywhere (our icon set, not the thin ← character)
document.querySelectorAll('.back').forEach(b => { b.innerHTML = nfIcon('back', { ui: true, size: 22 }); });
document.querySelectorAll('[data-ri]').forEach(el => { el.innerHTML = nfIcon(el.dataset.ri, { color: 'var(--p-ink)', size: 24 }); });
document.querySelectorAll('[data-ri-white]').forEach(el => { el.innerHTML = nfIcon(el.dataset.riWhite, { color: 'var(--p-white)', size: 22 }); });
function paintPips() {
  document.querySelectorAll('[data-pipface-small]').forEach(el => { el.innerHTML = nfPip({ color: PIPME.color, shape: PIPME.shape, size: 44 }); });
  document.querySelectorAll('[data-pipface-big]').forEach(el => { el.innerHTML = nfPip({ color: PIPME.color, shape: PIPME.shape, size: 160 }); });
}
paintPips();
document.addEventListener('click', e => { const t = e.target.closest('[data-todo]'); if (t) toast(t.dataset.todo); });

// ---------- the menu: ☰ expands it (remembered); on the phone it's a drawer ----------
let railOpen = false; try { railOpen = localStorage.getItem('nf.v2.rail') === 'open'; } catch {}
const syncRail = () => document.querySelectorAll('.rail').forEach(r => { r.classList.toggle('expanded', railOpen); const l = r.querySelector('.rail-toggle .lbl'); if (l) l.textContent = railOpen ? 'collapse' : 'menu'; });
syncRail();
document.addEventListener('click', e => {
  if (e.target.closest('[data-rail]')) { railOpen = !railOpen; try { localStorage.setItem('nf.v2.rail', railOpen ? 'open' : 'closed'); } catch {} syncRail(); }
  if (e.target.closest('[data-rail-open]')) e.target.closest('.app').querySelector('.rail').classList.add('open');
  if (e.target.closest('[data-rail-close]') || (e.target.closest('.rail [data-goto], .rail [data-chat]'))) document.querySelectorAll('.rail.open').forEach(r => r.classList.remove('open'));
  const sub = e.target.closest('[data-sub]'); if (sub) sub.setAttribute('aria-expanded', sub.getAttribute('aria-expanded') !== 'true');
});

// ---------- 13 · Pip builds the plan (↻ animation: checklist) ----------
let buildTimers = [];
function runBuild() {
  const f = `~${Math.round(Q.invites * .53)}–${Math.round(Q.invites * .67)}`;
  const lines = [
    [`Forecast: ${f} of ${Q.invites} likely to come`, 'From your guest count and how events like this usually go'],
    ['Luma page drafted', 'Not published until you say OK'],
    [`Invite written for ${labelOf(Q.custDay || Q.day || '2026-12-04')}, ${Q.custTime || Q.time || '7pm'}`, EV.drinks === 'byob' ? 'It says BYOB, ready for you to read' : 'Ready for you to read'],
    [EV.drinks === 'byob' && EV.food !== 'host' ? 'Ice, cups and mixers sorted' : `Food and drinks sized for ~${Math.round(Q.invites * .67)}`, `Inside your ${money(EV.cap)} cap`],
    [`One reminder planned for ${labelOf(addDays(Q.custDay || Q.day || '2026-12-04', -3))}`, "Only to people who haven't replied"],
  ];
  if (EV.food === 'potluck') lines.splice(3, 0, ['Potluck sign-up ready', "So dishes don't double up"]);
  if (EV.place) lines.splice(1, 0, [`${EV.place} held`, 'Booking waits for your OK']);
  $('#buildList').innerHTML = lines.map(([b, sub]) => `<li><span class="circle"></span><div><b>${b}</b><span>${sub}</span></div></li>`).join('');
  buildTimers.forEach(clearTimeout); buildTimers = [];
  const items = [...document.querySelectorAll('#buildList li')]; $('#buildDone').hidden = true;
  items.forEach((li, i) => buildTimers.push(setTimeout(() => li.classList.add('done'), reduce ? 0 : 500 + i * 600)));
  buildTimers.push(setTimeout(() => { $('#buildDone').hidden = false; }, reduce ? 0 : 500 + items.length * 600));
}

// ---------- 14 · the plan, as a poster ----------
const EVENT_NAMES = { 'cocktail party': 'Drinks on the roof', 'dinner': 'Dinner at ours', 'networking night': 'Night of good intros', 'a talk': 'An evening talk', 'birthday': 'Birthday drinks', 'something else': 'Our get-together' };
function renderPlan() {
  const name = evName();
  document.querySelectorAll('[data-evname]').forEach(el => { el.textContent = name; });
  // the Luma link follows the event's name (Ilteris's review: it said drinks-on-the-roof for every event)
  document.querySelectorAll('[data-evslug]').forEach(el => { el.textContent = 'luma.com/' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); });
  $('#pType').textContent = Q.type === 'something else' ? ($('#otherType').value || 'your event') : Q.type;
  $('#pWhen').textContent = `${labelOf(Q.custDay || Q.day || '2026-12-04')} · ${Q.custTime || Q.time || '7pm'}`;
  $('#pPlace').textContent = EV.place || (EV.venue === 'booked' ? 'Your place (already booked)' : 'Add the place');
  $('#pFind').textContent = EV.place ? 'change' : 'find a place with Pip';
  $('#pInvited').textContent = `${Q.invites} invited`;
  $('#pFc').textContent = `forecast ~${Math.round(Q.invites * .53)}–${Math.round(Q.invites * .67)} likely`;
  const PLURAL = { 'cocktail party': 'cocktail parties', dinner: 'dinners', 'networking night': 'networking nights', 'a talk': 'talks', birthday: 'birthday parties' };
  $('#pWhy').textContent = `From ${Q.invites} invites and how ${PLURAL[Q.type] || 'events like this'} usually go. It updates as people reply.`;
  const items = okItems(), n = items.length;
  $('#planNeeds').innerHTML = items.map(i => `<div class="ok-item"><span class="circle"></span><div><b>${i.title[0].toUpperCase() + i.title.slice(1)}</b><span>${i.cost ? money(i.cost) + ' · ' : ''}${i.sub}</span></div></div>`).join('');
  $('#planCount').textContent = n; $('#planReview').textContent = `review ${n} things`; $('#planDock').textContent = `${n} need your OK · review`;
  if (OKS.paid) {
    $('#planNeeds').innerHTML = '<div class="ok-item"><span class="circle on"></span><div><b>All approved</b><span>The invite is out and the order is paid. Nothing else waits for you.</span></div></div>';
    $('#planCount').textContent = 0; $('#planReview').textContent = 'see your event'; $('#planReview').dataset.goto = 'event';
    $('#planDock').textContent = 'see your event'; $('#planDock').dataset.goto = 'event';
  }
}

// ---------- the chat: small pop-up; ⤢ (or "see why") = full screen with Pip's reasoning ----------
const WHY = {
  q2: { why: 'Days and times that usually get the most yeses for this kind of event.', checked: 'The event type you picked.', decided: "Pip's built-in advice (hardcoded for now)." },
  q3: { why: "About 4 in 10 people who say yes to a small free event don't come (PheedLoop), so I plan for the forecast, not every yes.", checked: 'Your invite count, and show-up rates for free events.', decided: 'Plain math in code, not the AI model.' },
  q4: { why: 'The budget is your spending cap. Anything over it comes back to you first.', checked: 'Your answers to who covers what.', decided: 'A rule in code: never over the cap without asking.' },
  plan: { why: 'Big decisions and money wait for you: that is the invite and the order (plus a deposit or sign-up if you have one).', checked: 'Your cap ✓ · one reminder per guest ✓ · no messages 10pm–8am ✓', decided: 'Rules in code. The AI model only drafted the invite.' },
};
const whyHTML = w => w ? `<button class="see-why" data-seewhy>see why</button><dl class="why"><dt>why</dt><dd>${w.why}</dd><dt>what I checked</dt><dd>${w.checked}</dd><dt>decided by</dt><dd>${w.decided}</dd></dl>` : '';
function setFull(on) {
  $('#chat').classList.toggle('full', on);
  $('#chatExpand').textContent = on ? '⤡' : '⤢';
  $('#chatMode').textContent = on ? 'with my reasoning' : '';
}
function openChat() {
  const say = document.querySelector('.screen.on .bubble'), log = $('#chatLog');
  if (log.dataset.page !== current) {
    log.dataset.page = current;
    log.innerHTML = (say && say.textContent ? `<div class="msg pip">${say.textContent}${whyHTML(WHY[current])}</div>` : '')
      + `<div class="msg pip">Tell me what you need and I'll handle it: "move it to Saturday", "add 5 people", "find a cheaper place". Anything big comes back to you for an OK.</div>`;
  }
  setFull(false); $('#chat').hidden = false; $('#chatInput').focus({ preventScroll: true });
}
const closeChat = () => { $('#chat').hidden = true; setFull(false); };
$('#chatClose').onclick = closeChat;
$('#chatExpand').onclick = () => setFull(!$('#chat').classList.contains('full'));
document.addEventListener('click', e => { if (e.target.closest('[data-seewhy]')) setFull(true); });
addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#chat').hidden) { if ($('#chat').classList.contains('full')) setFull(false); else closeChat(); } });
$('#chatInput').addEventListener('input', () => { $('.c-send').hidden = !$('#chatInput').value.trim(); });
$('#chatForm').onsubmit = e => {
  e.preventDefault();
  const t = $('#chatInput').value.trim(); if (!t) return;
  const log = $('#chatLog'); if (!log.querySelector('.thread')) log.insertAdjacentHTML('beforeend', '<section class="thread" aria-live="polite"></section>');
  $('#chatInput').value = ''; $('.c-send').hidden = true;
  askPip(t).then(() => { log.scrollTop = log.scrollHeight; }); setTimeout(() => { log.scrollTop = log.scrollHeight; }, 0);
};

// ---------- 15 · your OK: approve each part, then confirm, then pay (locked over the cap) ----------
const OKS = { approved: {}, confirmed: false, paid: false };
if (SAVED.OKS) Object.assign(OKS, SAVED.OKS);
const SIZE_INFO = {
  lean:  { label: 'lean · for 16', why: 'Cheapest. If more people say yes, Pip tops it up on 12/3.' },
  right: { label: 'just right · for 20', why: 'Matches the top of the forecast, so nobody runs dry.' },
  every: { label: 'every yes · for 22', why: 'Covers every yes, but expect leftovers.' },
};
function cardBody(i) {
  if (i.id === 'invite') {
    const extra = (EV.drinks === 'byob' ? " BYOB: bring what you like to drink, we'll have ice and cups." : EV.drinks === 'mix' ? ' Bring a bottle if you like.' : '') + (EV.food === 'potluck' ? " It's a potluck: pick a dish on the sign-up." : '');
    return `<div class="invite-preview"><p class="field-label">draft</p><b>${$('#pWhen') ? document.querySelector('[data-evname]').textContent : 'Your event'} · ${$('#pWhen').textContent}</b>
      <p>Come join us.${extra} Can't make it? Just let us know.</p>
      <span class="muted">Sends today at 6pm · never between 10pm and 8am</span><span class="muted">The reply form asks: ☐ text me if plans change (and the check-in link)</span></div>`;
  }
  if (i.id === 'venue') return `<p style="margin:0;font-size:15.5px;line-height:1.5">A ${money(i.cost)} deposit holds ${EV.place || 'the venue'} for the night. Refundable until 11/27. Anything else is paid to the venue on the night, and Pip asks you first.</p>`;
  if (i.id === 'potluck') return `<p style="margin:0;font-size:15.5px">Guests pick a slot when they reply, so dishes don't double up:</p><ul class="potluck"><li>Mains: 3 spots</li><li>Sides and salads: 4 spots</li><li>Desserts: 3 spots</li></ul>`;
  const L = orderLines(), t = orderTotal();
  const sizes = EV.drinks === 'host' ? `<div class="sizes" role="radiogroup" aria-label="Order size">${Object.entries(SIZE_INFO).map(([k, z]) => {
      const keep = EV.size; EV.size = k; const v = orderTotal(); EV.size = keep;
      const forN = { lean: Math.round(Q.invites * .53), right: Math.round(Q.invites * .67), every: Math.round(Q.invites * .73) }[k], ev = Q.custDay || Q.day || '2026-12-04';
      const why = k === 'lean' ? `Cheapest. If more people say yes, Pip tops it up on ${labelOf(addDays(ev, -1))}.` : z.why;
      return `<button class="size" role="radio" aria-checked="${EV.size === k}" data-size="${k}"><b>${z.label.replace(/\d+$/, forN)}</b><span>${why}</span><strong>${money(v)}</strong>${k === 'right' ? '<span class="tag">suggested</span>' : ''}</button>`;
    }).join('')}</div>` : '';
  return `${sizes}<table class="lines" aria-label="What's in the order"><tbody>${L.map(([k, v]) => `<tr><td>${k}</td><td>${money(v)}</td></tr>`).join('')}
    ${FEES.map(([k, v]) => `<tr class="fee"><td>${k}</td><td>${money(v)}</td></tr>`).join('')}<tr class="total"><td>total</td><td>${money(t)}</td></tr></tbody></table>`;
}
function renderOK() {
  const items = okItems(), total = items.reduce((t, i) => t + i.cost, 0);
  const done = items.filter(i => OKS.approved[i.id]).length, all = done === items.length, over = total > EV.cap;
  $('#okFlow').innerHTML = items.map((i, n) => `<article class="ok-card ${OKS.approved[i.id] ? 'approved' : ''}">
      <div class="ok-card-head"><span class="circle"></span><div><b>${n + 1} · ${i.title}</b><span>${i.cost ? money(i.cost) + ' · ' : ''}${i.sub}</span></div></div>
      <div class="ok-body">${cardBody(i)}<div class="ok-actions"><button class="btn" data-approve="${i.id}">approve${i.cost ? ' ' + money(i.cost) : ''}</button><button class="ghost" data-chat>change it with Pip</button></div></div>
      <div class="ok-done"><span>Approved${i.cost ? ' · ' + money(i.cost) : ''}</span><button class="ghost" data-undo="${i.id}">undo</button></div></article>`).join('');
  $('#okProgress').textContent = `${done} of ${items.length} approved`;
  $('#sumRows').innerHTML = items.map(i => `<div class="sum-row"><span class="circle ${OKS.approved[i.id] ? 'on' : ''}"></span><span>${i.title}</span><b>${i.cost ? money(i.cost) : 'free'}</b></div>`).join('');
  $('#sumTotal').textContent = money(total);
  const up = Math.ceil(total / 50) * 50;
  $('#sumCap').innerHTML = over ? `<div class="warn">${money(total - EV.cap)} over your ${money(EV.cap)} cap. Pay stays locked until something changes.<span class="ok-actions"><button class="ghost" data-chat>change the order</button><button class="ghost" data-raise="${up}">raise my cap to ${money(up)}</button></span></div>`
    : `<span class="cap-ok">Inside your ${money(EV.cap)} cap ✓ · no hidden costs</span>`;
  const ready = all && !over;
  const label = OKS.paid ? `paid ${money(total)} ✓` : !all ? `approve ${items.length - done} more to pay` : over ? 'over your cap: pay is locked' : `pay ${money(total)}`;
  [$('#payBtn'), $('#payDock')].forEach(b => { b.disabled = !ready || OKS.paid; b.textContent = label; });
  $('#okSay').textContent = over ? `This comes to ${money(total)}, over your ${money(EV.cap)} cap. I won't take payment until it fits.`
    : all ? `Everything's approved. The total is ${money(total)}. Tap pay when you're ready. Nothing else.`
    : `${items.length - done} ${items.length - done === 1 ? 'thing' : 'things'} to go. Nothing is sent or charged until you say so.`;
  $('#okFlow').hidden = OKS.paid; $('#okPaid').hidden = !OKS.paid;
  if (OKS.paid) $('#okSay').textContent = "Done. The invite goes out at 6pm. I'll tell you when replies come in.";
  $('#paidTxt').textContent = `${orderTotal() ? `The order is paid, ${money(orderTotal())}, and arrives on the day, 4–6pm. ` : ''}${venueCost() ? `${EV.place || 'The venue'} is held with a ${money(venueCost())} deposit on your card, refundable until 11/27. ` : ''}The invite goes out today at 6pm. Nothing else will be charged without your OK.`;
  $('#payFine').textContent = OKS.paid ? 'Done. Nothing else is charged without your OK.' : 'Nothing is charged until you tap.';
  const left = items.length - done; document.querySelectorAll('.ok-badge').forEach(b => { b.textContent = left; b.hidden = left === 0; });
}
document.querySelector('[data-id="ok"]').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.approve) OKS.approved[b.dataset.approve] = true;
  else if (b.dataset.undo) OKS.approved[b.dataset.undo] = false;
  else if (b.dataset.size) { EV.size = b.dataset.size; OKS.approved.order = false; }
  else if (b.dataset.raise) EV.cap = +b.dataset.raise;
  else if (b.id === 'payBtn' || b.id === 'payDock') { if (!b.disabled) OKS.paid = true; }
  else return;
  refresh();
});
// changing the answers resets the approvals (what you approved may have changed)
document.addEventListener('click', e => { if (e.target.closest('[data-cover], [data-pickplace]')) { OKS.approved = {}; OKS.confirmed = false; } }, true);

// ---------- 16 · the event page ----------
function renderEvent() {
  const L = orderLines(), t = orderTotal(), when = $('#pWhen').textContent;
  $('#evMeta').firstChild.textContent = `${when} · `;
  $('#evParty').textContent = `party ${when.split(' · ')[0]}`;
  document.querySelectorAll('[data-evday]').forEach(el => { el.textContent = when.split(' · ')[0]; });
  const evIso = Q.custDay || Q.day || '2026-12-04', evLeft = Math.round((new Date(evIso + 'T12:00') - new Date('2026-11-23T12:00')) / 864e5);
  $('#evDays').textContent = evLeft === 1 ? '1 day to go' : `${evLeft} days to go`;
  $('#evYes').textContent = `22 of ${Q.invites} said yes`; $('#evInvited').textContent = `22 yes · 4 maybe · ${Q.invites} invited`;
  $('#evFc').textContent = `forecast ~${Math.round(Q.invites * .53)}–${Math.round(Q.invites * .67)} likely to come`;
  const parts = [];
  if (L.length) parts.push(`<div class="ev-food-item"><span class="circle ${OKS.paid ? 'on' : ''}"></span><div><b>${OKS.paid ? 'Order paid' : 'Order waiting for your OK'} · ${money(t)}</b><span>Instacart · arrives on the day, 4–6pm · ${L.map(l => l[0].toLowerCase()).join(', ')}</span></div></div>`);
  if (EV.food === 'potluck') parts.push(`<div class="ev-food-item"><span class="circle"></span><div><b>potluck sign-up · 7 of 10 dishes picked</b><span>Mains 2 of 3 · sides 3 of 4 · desserts 2 of 3</span></div></div>`);
  if (EV.drinks === 'byob') parts.push(`<span class="muted">BYOB is in the invite. Pip got ice, cups and mixers.</span>`);
  parts.push(`<span class="muted">Still right for the forecast ✓ If yeses jump, Pip offers a top-up 2 days before.</span>`);
  $('#evFood').innerHTML = parts.join('');
  $('#evFoodTag').textContent = EV.food === 'potluck' ? 'potluck' : EV.drinks === 'byob' ? 'BYOB' : `sized for ~${Math.round(Q.invites * .67)}`;
  const extra = EV.extras.reduce((a, x) => a + x.v, 0);
  const spent = (OKS.paid ? t + venueCost() : 0) + extra;
  $('#evBudgetTag').textContent = `${money(spent)} spent of your ${money(EV.cap)} cap`;
  $('#evBudgetBar').style.width = Math.min(100, Math.round(spent / EV.cap * 100)) + '%';
  const paidRows = [...(OKS.paid ? [venueCost() ? ['Venue deposit', venueCost()] : null, t ? ['The order', t] : null] : []), ...EV.extras.map(x => [x.t, x.v])].filter(Boolean);
  $('#evBudgetRows').innerHTML = (paidRows.length ? paidRows
    .map(([k, v]) => `<div class="ev-food-item"><span class="circle on"></span><div><b>${k}</b><span>${money(v)} · paid</span></div></div>`).join('') : '<span class="muted">Nothing paid yet. </span>')
    + (spent > EV.cap ? `<span class="muted"><b>${money(spent - EV.cap)} over your cap.</b> You approved it; nothing else gets added without asking.</span>` : `<span class="muted">${money(EV.cap - spent)} left under your cap. Anything new asks you first.</span>`);
}
// the menu's event sections jump to the right folder, from any page
document.addEventListener('click', e => {
  const j = e.target.closest('[data-jump]'); if (!j) return;
  const el = document.getElementById(j.dataset.jump); if (!el) return;
  e.stopPropagation();
  if (el.classList.contains('dfolder')) openFolder(el, true);
  if (current !== 'event') go('event');
  setTimeout(() => {
    const main = $('#main-event');
    const sc = main.scrollHeight > main.clientHeight + 1 && getComputedStyle(main).overflowY === 'auto' ? main : document.scrollingElement;
    const top = el.getBoundingClientRect().top - (sc === main ? main.getBoundingClientRect().top : 0) + sc.scrollTop - 14;
    sc.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
  }, 60);
}, true);
// after paying, the confirmation starts at the top
document.addEventListener('click', e => { if (e.target.closest('#payBtn, #payDock')) setTimeout(() => { window.scrollTo(0, 0); const m = $('#main-ok'); if (m) m.scrollTop = 0; }, 30); });

function refresh() { renderCover(); renderBudget(); renderPlan(); renderOK(); renderEvent(); if (typeof renderStage === 'function') renderStage(); }
const _go = go; go = function (id) { closeChat(); _go(id); if (id === 'place') renderPlaces(); if (id === 'building') runBuild(); if (id === 'plan') renderPlan(); if (id === 'ok' || id === 'event') refresh(); paintPips(); };
refresh();

// the event folders sit stacked like dividers; tap one and it pulls out and opens (one at a time)
function openFolder(f, open) {
  document.querySelectorAll('#evDrawer .dfolder').forEach(x => {
    const on = x === f ? open : false;
    x.classList.toggle('open', on);
    x.querySelectorAll('[data-fold]').forEach(btn => btn.setAttribute('aria-expanded', on));
    x.querySelector('.d-chev').textContent = on ? 'close' : 'open';
  });
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-fold]'); if (!t) return;
  const f = t.closest('.dfolder'); openFolder(f, !f.classList.contains('open'));
});

// ---------- 17 · an alert: rain on party night ----------
const RAIN = {
  inside: { t: 'move it inside', s: '$0 · the bar room downstairs', go: 'OK, move it inside', msg: "Rain's likely friday, so we're moving inside: the bar room downstairs, same address, same time. See you there! 🍸", done: "it's inside now",
    list: ['The venue booked the bar room downstairs for fri, 7pm. $0.', 'Luma now says: inside, the bar room downstairs.'] },
  tent: { t: 'add a canopy', s: '$180 · set up by 6pm · inside your cap', go: 'OK, add the canopy · $180', msg: "Rain's possible friday, so there'll be a canopy on the roof. Same place, same time, you'll stay dry. See you there!", done: 'the canopy is booked',
    list: ['A 10×20 ft canopy is booked, set up by 6pm fri. $180, paid. It shows in your budget folder.', 'The venue knows it is coming.'] },
  keep: { t: 'keep it on the roof', s: "$0 · guests bring a jacket · I keep watching", go: 'OK, keep it on the roof', msg: "Heads up: rain is possible friday night. We're still on the roof, so bring a jacket. I'll text if anything changes.", done: 'still on the roof',
    list: ["Nothing booked. I'll check again thu, fri morning and 2 hours before, and ask if it gets worse."] },
};
let rainPick = SAVED.rainPick || 'inside', rainEdited = false, rainDone = !!SAVED.rainDone;
function renderAlert() {
  const r = RAIN[rainPick];
  $('#alertPickT').textContent = r.t; $('#alertPickS').textContent = r.s;
  $('#alertGo').textContent = r.go; $('#alertDock').textContent = r.go;
  if (!rainEdited) $('#rainMsg').value = r.msg;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-rain]'); if (!b) return;
  rainPick = b.dataset.rain;
  document.querySelectorAll('[data-rain]').forEach(x => x.setAttribute('aria-checked', x === b));
  renderAlert();
});
$('#rainMsg').addEventListener('input', () => { rainEdited = true; });
function confirmRain() {
  const r = RAIN[rainPick], texted = $('#rainText').checked;
  $('#alertDoneT').textContent = r.done;
  if (rainPick === 'tent' && !EV.extras.some(x => x.k === 'canopy')) { EV.extras.push({ k: 'canopy', t: 'Canopy for the roof', v: 180 }); renderEvent(); }
  $('#alertDoneList').innerHTML = [...r.list, ...(typeof capNote === 'function' ? capNote(r) : []), texted ? `${textN()} guests got your text. The other ${rsvp().yes - textN()} see it on Luma.` : 'Guests see it on Luma. No texts went out.']
    .map(x => `<li>${x}</li>`).join('');
  $('#alertAsk').hidden = true; $('#alertDone').hidden = false; $('#alertNeeds').hidden = true; $('#alertDock').hidden = true;
  $('#alertSay').textContent = "Done. I'll keep watching the weather and tell you if anything changes.";
  rainDone = true; if (typeof afterRain === 'function') afterRain(r, texted);
  const m = $('#main-alert'); if (m) m.scrollTop = 0; window.scrollTo(0, 0);
  toast(texted ? `Done. ${textN()} guests got your text.` : 'Done. Luma is updated.');
}
$('#alertGo').addEventListener('click', confirmRain); $('#alertDock').addEventListener('click', confirmRain);
renderAlert();

// ---------- 18 · party night: live check-in ----------
const NIGHT = SAVED.NIGHT || {
  here: [['Ana', '7:02', 'QR'], ['Ben', '7:05', 'link', 1], ['Chloe', '7:09', 'app'], ['Maya', '7:11', 'QR'], ['Sam', '7:15', 'link'], ['Leo', '7:18', 'QR'], ['Priya', '7:20', 'app'],
    ['Jon', '7:24', 'link'], ['Nina', '7:27', 'QR'], ['Omar', '7:31', 'app'], ['Tess', '7:35', 'link'], ['Kai', '7:38', 'QR'], ['Rosa', '7:41', 'QR']],
  yet: [['Dev', 'said maybe'], ['Lily', 'said yes'], ['Max', 'said yes · +1'], ['Zoe', 'said yes'], ['Ivy', 'said maybe'], ['Theo', 'said yes']],
};
let nightClock = 42;
function nHeadcount() { return NIGHT.here.reduce((n, g) => n + 1 + (g[3] || 0), 0); }
function renderNight() {
  const n = nHeadcount();
  $('#nHere').textContent = n; $('#doorN').textContent = n;
  $('#nHereN').textContent = NIGHT.here.length; $('#nYetN').textContent = NIGHT.yet.length;
  $('#nBar').style.width = Math.min(100, n / 22 * 100) + '%';
  $('#nLine').textContent = n < 16 ? `Forecast was ~16–20. ${16 - n} more and you're in it.` : n <= 20 ? 'Forecast was ~16–20. Right on track.' : `Forecast was ~16–20. ${n - 20} more than planned; drinks still cover it.`;
  $('#nHereList').innerHTML = NIGHT.here.slice().reverse().map(([nm, t, how, plus]) =>
    `<li><span class="av">${nm[0]}</span>${nm}${plus ? ' <span class="plus">+1</span>' : ''}<span class="st">${t} · ${how}</span></li>`).join('');
  $('#nYetList').innerHTML = NIGHT.yet.map(([nm, st], i) =>
    `<li><span class="av">${nm[0]}</span>${nm}<span class="st">${st} <button class="mini-in" data-checkin="${i}">check in</button></span></li>`).join('') || '<li class="empty">Everyone who said yes is here.</li>';
  $('#nSay').textContent = n < 16 ? `${n} here so far. It's early; most people come in the first hour.` : `${n} here, right on the forecast. Drinks are holding up fine. Enjoy it, I've got the door.`;
}
function checkIn(i, how) {
  const g = NIGHT.yet.splice(i, 1)[0]; if (!g) return;
  nightClock = Math.min(59, nightClock + 2);
  NIGHT.here.push([g[0], `7:${String(nightClock).padStart(2, '0')}`, how, /\+1/.test(g[1]) ? 1 : 0]);
  renderNight(); toast(`${g[0]} is here.`);
}
document.addEventListener('click', e => {
  const c = e.target.closest('[data-checkin]'); if (c) { checkIn(+c.dataset.checkin, 'by you'); return; }
  if (e.target.closest('[data-door]')) { $('#door').hidden = false; $('#door .door-x').focus(); return; }
  if (e.target.closest('[data-door-close]')) { $('#door').hidden = true; return; }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#door').hidden) $('#door').hidden = true; });
$('#doorDemo').addEventListener('click', () => { if (NIGHT.yet.length) checkIn(0, 'QR'); else toast('Everyone who said yes is here.'); });
// a QR-looking grid (a stand-in for the real code)
(function drawQR() {
  const N = 25, cells = []; let seed = 7;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const finder = (x, y) => [[0, 0], [N - 7, 0], [0, N - 7]].some(([fx, fy]) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7);
  const fon = (x, y) => { for (const [fx, fy] of [[0, 0], [N - 7, 0], [0, N - 7]]) { const dx = x - fx, dy = y - fy; if (dx >= 0 && dx < 7 && dy >= 0 && dy < 7) return dx === 0 || dy === 0 || dx === 6 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4); } return false; };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (finder(x, y) ? fon(x, y) : rnd() > .52) cells.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);
  $('#qr').innerHTML = `<svg viewBox="-2 -2 ${N + 4} ${N + 4}" shape-rendering="crispEdges"><rect x="-2" y="-2" width="${N + 4}" height="${N + 4}" fill="#fff"/>${cells.join('')}</svg>`;
})();
renderNight();

// ---------- 19 · the day after ----------
const DA = { came: 18, food: null, sent: new Set(), touched: false, saved: false };
if (SAVED.DA) { Object.assign(DA, SAVED.DA, { sent: new Set(SAVED.DA.sent || []) }); }
function daMood() {
  const held = DA.came >= 16 && DA.came <= 20;
  if (!held || DA.food === 'out' || DA.food === 'left') return 'sad';
  return DA.food === 'right' ? 'proud' : 'happy';
}
function renderDayAfter() {
  const c = DA.came, held = c >= 16 && c <= 20, mood = daMood(), rate = Math.round(Math.min(c, 22) / 22 * 100);
  $('#daCame').style.left = Math.min(100, c / 30 * 100) + '%';
  $('#daKey').textContent = `${c} came`;
  $('#daHead').textContent = `${c} came. The forecast said ~16–20.`;
  $('#daSub').textContent = held ? `It held. ${Math.max(0, c - 1)} checked in and 1 told Pip the next morning.` : c < 16 ? `${16 - c} fewer than the low end. I'll plan lower for this crowd next time.` : `${c - 20} more than the high end. Your friends show up; I'll plan higher next time.`;
  const pip = nfPip({ color: PIPME.color, shape: PIPME.shape, emotion: mood, size: 96 });
  $('#daFace').innerHTML = nfPip({ color: PIPME.color, shape: PIPME.shape, emotion: mood, size: 56 });
  $('#daSay').textContent = {
    proud: `The forecast held and the food was about right. That's the plan working.`,
    happy: `The forecast held! ${c} came, right inside ~16–20.`,
    sad: DA.food === 'out' ? `Sorry the food ran out. I'll size up for this crowd next time.` : DA.food === 'left' ? `Lots left over, so I sized too big. I'll trim the next order.` : `I was off this time: ${c} came, the forecast said ~16–20. I'll learn from it.`,
  }[mood];
  $('#daRate').textContent = rate + '%';
  $('#daRateTxt').textContent = `of your yeses came (${Math.min(c, 22)} of 22). Small free events usually get about 6 in 10, so ${rate >= 63 ? 'your friends show up. Next time I plan a bit higher.' : 'next time I plan a bit lower for this crowd.'}`;
  const thanks = $('#daThanks b'); if (!DA.sent.has('daThanks')) thanks.textContent = `A thank-you to the ${c} who came`;
  const left = 2 - DA.sent.size; $('#daOkN').textContent = left;
}
function daSet(n) { DA.came = Math.max(0, Math.min(30, n || 0)); $('#daCount').value = DA.came; renderDayAfter(); }
$('#daMinus').addEventListener('click', () => daSet(DA.came - 1));
$('#daPlus').addEventListener('click', () => daSet(DA.came + 1));
$('#daCount').addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, ''); if (e.target.value) daSet(+e.target.value); });
document.addEventListener('click', e => {
  const f = e.target.closest('[data-dafood]');
  if (f) { DA.food = f.dataset.dafood; document.querySelectorAll('[data-dafood]').forEach(x => x.setAttribute('aria-checked', x === f)); renderDayAfter(); return; }
  const snd = e.target.closest('[data-dasend]');
  if (snd) { const id = snd.dataset.dasend; DA.sent.add(id); const box = $('#' + id); box.classList.add('sent'); snd.outerHTML = '<span class="sent-tag">✓ sent</span>'; renderDayAfter(); toast(id === 'daThanks' ? 'Thank-you sent.' : 'Sent to the 4 who didn\'t check in. Only once.'); }
});
function daSave() {
  const note = $('#daNote').value.trim();
  $('#daDoneTxt').textContent = `Show rate ${Math.round(Math.min(DA.came, 22) / 22 * 100)}%${DA.food ? ', food ' + { out: 'ran out', right: 'about right', left: 'too much' }[DA.food] : ''}${note ? ', and “' + note + '”' : ''}. It all goes into your next forecast and order.`;
  $('#daAsk').hidden = true; $('#daDone').hidden = false; $('#daDock').hidden = true;
  const m = $('#main-dayafter'); if (m) m.scrollTop = 0; window.scrollTo(0, 0);
}
$('#daSave').addEventListener('click', daSave); $('#daDock').addEventListener('click', daSave);
renderDayAfter();

// ---------- 26 · your events: "you might like", 3 at a time; swipe one away and the next slides in ----------
const RECS = [
  { src: 'friends going', from: 'Luma', t: 'Natural wine night', m: 'sat 11/28 · 7pm · Ruffian, East Village', why: 'Ana and 3 friends are going.', c: 'yellow' },
  { src: 'nearby', from: '0.4 mi', t: 'Rooftop film: Paris, Texas', m: 'sun 11/29 · 6pm · Lower East Side', why: "Five minutes from you, and it's free.", c: 'olive' },
  { src: "Pip's pick", from: 'from your events', t: 'Cocktail class for two', m: 'wed 12/2 · 7:30pm · Dutch Kills', why: 'You throw cocktail parties. This one teaches the kit you ordered.', c: 'white' },
  { src: 'friends going', from: 'Partiful', t: 'Zine fair after-party', m: 'sat 12/5 · 9pm · Bushwick', why: 'Maya and Leo are going.', c: 'yellow' },
  { src: 'nearby', from: '0.8 mi', t: 'Holiday market opening', m: 'thu 12/3 · 5pm · Seward Park', why: 'On your way home from work.', c: 'olive' },
  { src: "Pip's pick", from: 'from your events', t: 'Supper club: winter menu', m: 'fri 12/11 · 8pm · Greenpoint', why: 'Your dinners fill up, so you might like being a guest at one.', c: 'white' },
  { src: 'friends going', from: 'Luma', t: 'Design book club', m: 'tue 12/8 · 7pm · Book Club Bar, East Village', why: 'Ana and Ben are going.', c: 'yellow' },
  { src: 'nearby', from: '1.2 mi', t: 'Night market', m: 'fri 12/18 · 5pm · Essex Market', why: 'Close by, and your calendar is free.', c: 'olive' },
  { src: "Pip's pick", from: 'from your events', t: 'Dinner for strangers', m: 'thu 12/17 · 8pm · Carroll Gardens', why: 'You host dinners. This is a good one to steal ideas from.', c: 'white' },
];
let recNext = 3;
const RSAVED = new Set(); try { JSON.parse(localStorage.getItem('nf.v2.saved') || '[]').forEach(i => RSAVED.add(i)); } catch {}
const MON = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
function renderSaved() {
  const el = $('#savedRecs'); if (!el) return;
  el.innerHTML = [...RSAVED].map(i => RECS[i]).map(r => { const [mo, dy] = r.m.split(' · ')[0].split(' ')[1].split('/');
    return `<div class="go-row saved-row"><span class="go-date"><b>${dy}</b>${MON[mo - 1]}</span><div><b>${r.t}</b><span class="muted">${r.m} · you're interested</span><span class="go-pip"><span class="gp-face" data-pipface-small></span>I'll remind you the day before.</span></div></div>`; }).join('');
  paintPips();
}
const recShown = [0, 1, 2];
function recCard(i, slot) {
  const r = RECS[i];
  return `<article class="rec rc-${r.c}" data-rec-slot="${slot}" aria-label="${r.t}">
    <span class="rec-src"><i></i>${r.src} · ${r.from}</span>
    <b>${r.t}</b><span class="rec-m">${r.m}</span>
    <span class="rec-why">${r.why}</span>
    <span class="rec-btns"><button class="ghost" data-rec-no="${slot}">not for me</button><button class="mini-in${RSAVED.has(i) ? ' saved' : ''}" data-rec-in="${i}" aria-pressed="${RSAVED.has(i)}">${RSAVED.has(i) ? 'interested ✓' : "I'm interested"}</button></span>
  </article>`;
}
function renderRecs() {
  $('#recs').innerHTML = recShown.map((i, slot) => i == null ? `<article class="rec rec-empty" data-rec-slot="${slot}"><b>that's all for today</b><span class="rec-m">Pip finds more tomorrow.</span><button class="textlink" data-goto="recs">see more</button></article>` : recCard(i, slot)).join('');
}
function swipeAway(slot) {
  const el = document.querySelector(`[data-rec-slot="${slot}"]`); if (!el || el.classList.contains('gone')) return;
  el.classList.add('gone');
  setTimeout(() => {
    recShown[slot] = recNext < RECS.length ? recNext++ : null;
    const tmp = document.createElement('div'); tmp.innerHTML = recShown[slot] == null
      ? `<article class="rec rec-empty" data-rec-slot="${slot}"><b>that's all for today</b><span class="rec-m">Pip finds more tomorrow.</span></article>` : recCard(recShown[slot], slot);
    const n = tmp.firstElementChild; n.classList.add('enter'); el.replaceWith(n);
    requestAnimationFrame(() => requestAnimationFrame(() => n.classList.remove('enter')));
  }, reduce ? 0 : 280);
}
document.addEventListener('click', e => { const b = e.target.closest('[data-rec-no]'); if (b) swipeAway(+b.dataset.recNo); });
document.addEventListener('click', e => {
  const b = e.target.closest('[data-rec-in]'); if (!b) return;
  const i = +b.dataset.recIn, on = !RSAVED.has(i);
  on ? RSAVED.add(i) : RSAVED.delete(i);
  try { localStorage.setItem('nf.v2.saved', JSON.stringify([...RSAVED])); } catch {}
  b.classList.toggle('saved', on); b.setAttribute('aria-pressed', on); b.textContent = on ? 'interested ✓' : "I'm interested";
  renderSaved(); toast(on ? `Saved: ${RECS[i].t}. I'll remind you the day before.` : `Dropped ${RECS[i].t}.`);
});
// drag a card left to swipe it away
(function () {
  let el = null, x0 = 0, dx = 0;
  document.addEventListener('pointerdown', e => { const c = e.target.closest('.rec:not(.rec-empty)'); if (!c || e.target.closest('button')) return; el = c; x0 = e.clientX; dx = 0; el.setPointerCapture?.(e.pointerId); el.style.transition = 'none'; });
  document.addEventListener('pointermove', e => { if (!el) return; dx = Math.min(0, e.clientX - x0); el.style.transform = `translateX(${dx}px) rotate(${dx / 30}deg)`; });
  document.addEventListener('pointerup', () => { if (!el) return; const c = el; el = null; c.style.transition = ''; if (dx < -90) { c.style.transform = ''; swipeAway(+c.dataset.recSlot); } else c.style.transform = ''; });
})();
renderRecs(); renderSaved();

// ---------- 25 · settings: make Pip yours (color, then shape; name, voice, how it talks) ----------
const PIP_DEFAULT = { color: 'yellow', shape: 'circle', name: 'Pip', voice: 'warm', talk: 'playful' };
function savePip() { try { localStorage.setItem('nf.v2.pip', JSON.stringify(PIPME)); } catch (e) {} }
function repaintPip() {
  document.querySelectorAll('[data-pipface]').forEach(el => { el.innerHTML = nfPip({ color: PIPME.color, shape: PIPME.shape, size: 52 }); });
  paintPips();
  document.querySelectorAll('[data-pipname]').forEach(el => { el.textContent = PIPME.name; });
  document.querySelectorAll('.l-lbl').forEach(el => { el.textContent = `tell ${PIPME.name} what you need`; });
  document.querySelectorAll('.launcher').forEach(el => el.setAttribute('aria-label', `Tell ${PIPME.name} what you need`));
  if (typeof renderDayAfter === 'function') renderDayAfter();
  if (typeof renderRecs === 'function') renderRecs();
}
function renderPipSet() {
  const P = (o = {}) => nfPip({ color: PIPME.color, shape: PIPME.shape, ...o });
  $('#pBig').innerHTML = P({ size: 150 });
  $('#pSmall').innerHTML = P({ size: 30 });
  $('#pTiny1').innerHTML = P({ size: 24 }); $('#pTiny2').innerHTML = P({ size: 32 }); $('#pTiny3').innerHTML = P({ size: 40 });
  $('#pStage').dataset.on = ['yellow', 'orange', 'pink'].includes(PIPME.color) ? 'olive' : 'yellow';
  $('#pAsk').textContent = `tell ${PIPME.name} what you need`;
  $('#pLine').textContent = PIPME.talk === 'facts' ? `Hi, I'm ${PIPME.name}. 22 of 30 said yes. The order covers ~20.` : `Hi, I'm ${PIPME.name}! 22 yeses already. Drinks are sorted; go pick an outfit.`;
  document.querySelectorAll('[data-pcolor]').forEach(b => b.setAttribute('aria-checked', b.dataset.pcolor === PIPME.color));
  document.querySelectorAll('[data-pshape]').forEach(b => { b.setAttribute('aria-checked', b.dataset.pshape === PIPME.shape); b.querySelector('.sh-pip').innerHTML = nfPip({ color: PIPME.color, shape: b.dataset.pshape, size: 56 }); });
  document.querySelectorAll('[data-pvoice]').forEach(b => b.setAttribute('aria-checked', b.dataset.pvoice === PIPME.voice));
  document.querySelectorAll('[data-ptalk]').forEach(b => b.setAttribute('aria-checked', b.dataset.ptalk === PIPME.talk));
  if (document.activeElement !== $('#pName')) $('#pName').value = PIPME.name;
}
function setPip(k, v) { PIPME[k] = v; savePip(); renderPipSet(); repaintPip(); }
document.addEventListener('click', e => {
  const c = e.target.closest('[data-pcolor]'); if (c) { setPip('color', c.dataset.pcolor); $('#pSay').textContent = `${c.dataset.pcolor[0].toUpperCase() + c.dataset.pcolor.slice(1)}. Nice. Now a shape?`; return; }
  const sh = e.target.closest('[data-pshape]'); if (sh) { setPip('shape', sh.dataset.pshape); $('#pSay').textContent = `That's me now. Saved.`; return; }
  const v = e.target.closest('[data-pvoice]'); if (v) { setPip('voice', v.dataset.pvoice); return; }
  const t = e.target.closest('[data-ptalk]'); if (t) { setPip('talk', t.dataset.ptalk); return; }
  const pl = e.target.closest('[data-play]');
  if (pl) {
    const k = pl.dataset.play, line = `Hi, I'm ${PIPME.name}. Twenty-two people said yes.`;
    if ('speechSynthesis' in window) { const u = new SpeechSynthesisUtterance(line); u.rate = { warm: .9, bright: 1.15, calm: 1 }[k]; u.pitch = { warm: .8, bright: 1.3, calm: 1 }[k]; speechSynthesis.cancel(); speechSynthesis.speak(u); }
    else toast(`“${line}” (the ${k} voice)`);
  }
});
$('#pName').addEventListener('input', e => { PIPME.name = e.target.value.trim() || 'Pip'; savePip(); renderPipSet(); repaintPip(); });
$('#pReset').addEventListener('click', () => { Object.assign(PIPME, PIP_DEFAULT); savePip(); renderPipSet(); repaintPip(); $('#pSay').textContent = 'Back to the default. Yellow and round.'; });
renderPipSet(); repaintPip();

// ---------- 19 · settings: alerts (live: what would have reached you for Drinks on the roof) ----------
const AL = { rain: 50, cold: 35, subway: 15, traffic: 20 };
const AL_IDS = ['alW', 'alS', 'alT', 'alH', 'alApp', 'alText', 'alMail', 'alQuiet', 'alGuests'];
// the alert settings are remembered on this device (no account in the prototype)
function saveAlerts() {
  const moms = {}; document.querySelectorAll('[data-mom]').forEach(b => { moms[b.dataset.mom] = b.getAttribute('aria-checked') === 'true'; });
  const sw = {}; AL_IDS.forEach(id => { sw[id] = $('#' + id).checked; });
  try { localStorage.setItem('nf.v2.alerts', JSON.stringify({ AL, moms, sw })); } catch {}
}
function loadAlerts() {
  let d = null; try { d = JSON.parse(localStorage.getItem('nf.v2.alerts') || 'null'); } catch {}
  if (!d) return;
  Object.assign(AL, d.AL || {});
  $('#alRain').value = AL.rain;
  document.querySelectorAll('[data-al]').forEach(x => x.setAttribute('aria-checked', AL[x.dataset.al] === +x.dataset.v));
  document.querySelectorAll('[data-mom]').forEach(b => { if (d.moms && b.dataset.mom in d.moms) b.setAttribute('aria-checked', d.moms[b.dataset.mom]); });
  AL_IDS.forEach(id => { if (d.sw && id in d.sw) { $('#' + id).checked = d.sw[id]; const row = $('#' + id).closest('.al-row'); if (row) row.classList.toggle('off', !d.sw[id]); } });
}
// what actually happened around Drinks on the roof (demo data)
const AL_EVENTS = [
  { k: 'weather', t: 'Rain ~70% fri 7–10pm', hit: () => $('#alW').checked && 70 > AL.rain },
  { k: 'weather', t: 'Down to 38°F by 10pm', hit: () => $('#alW').checked && 38 < AL.cold },
  { k: 'subway', t: 'F train 12 min late fri evening', hit: () => $('#alS').checked && 12 > AL.subway },
  { k: 'traffic', t: '+25 min on the FDR at 6:30pm', hit: () => $('#alT').checked && 25 > AL.traffic },
  { k: 'holidays', t: 'Tree lighting nearby, streets close at 6pm', hit: () => $('#alH').checked },
];
function renderAlerts() {
  $('#alRainV').textContent = AL.rain + '%';
  const hits = AL_EVENTS.filter(e => e.hit());
  const moms = [...document.querySelectorAll('[data-mom]')].filter(b => b.getAttribute('aria-checked') === 'true').length;
  $('#alCount').textContent = hits.length === 1 ? '1 heads-up' : `${hits.length} heads-ups`;
  $('#alList').innerHTML = AL_EVENTS.map(e => `<li class="${e.hit() ? 'on' : 'off'} k-${e.k}"><i></i>${e.t}<span>${e.hit() ? 'you hear' : 'I just watch'}</span></li>`).join('');
  const how = [['alApp', 'the app'], ['alText', 'a text'], ['alMail', 'email']].filter(([id]) => $('#' + id).checked).map(x => x[1]);
  saveAlerts();
  $('#alFoot').textContent = `for Drinks on the roof, checked at ${moms} of 5 moments, by ${how.length ? how.join(' and ') : 'the app only'}.`;
  $('#alSay').textContent = hits.length === 0 ? "That's very quiet. I'd still tell you if something needs your OK." : hits.length >= 4 ? "That's a lot of heads-ups. Raise a line if it feels like nagging." : 'Looks balanced. I only speak up above your lines.';
}
document.addEventListener('click', e => {
  const p = e.target.closest('[data-al]');
  if (p) { AL[p.dataset.al] = +p.dataset.v; p.parentElement.querySelectorAll('[data-al]').forEach(x => x.setAttribute('aria-checked', x === p)); renderAlerts(); return; }
  const m = e.target.closest('[data-mom]');
  if (m) { m.setAttribute('aria-checked', m.getAttribute('aria-checked') !== 'true'); renderAlerts(); }
});
$('#alRain').addEventListener('input', e => { AL.rain = +e.target.value; renderAlerts(); });
AL_IDS.forEach(id => $('#' + id).addEventListener('change', e => {
  if (id === 'alApp' && !e.target.checked) { e.target.checked = true; toast('The app notification stays on: it is how things that need your OK reach you.'); }
  const row = e.target.closest('.al-row'); if (row) row.classList.toggle('off', !e.target.checked);
  renderAlerts();
}));
loadAlerts(); renderAlerts();





// ---------- 17 · events for you: all of RECS, grouped; "not for me" teaches Pip; "I'm interested" is shared with the home ----------
const RGONE = new Set(); let recFilter = 'all';
const RGROUPS = [['friends going', 'friends going', 'From Luma and Partiful, if they share their RSVPs.'], ['nearby', 'events nearby', 'Within about 20 minutes of you.'], ["Pip's pick", "Pip thinks you might like it", 'From the events you host and the ones you liked.']];
function renderRecPage() {
  $('#recGroups').innerHTML = RGROUPS.filter(([k]) => recFilter === 'all' || recFilter === k).map(([k, h, sub]) => {
    const items = RECS.map((r, i) => [r, i]).filter(([r, i]) => r.src === k && !RGONE.has(i));
    return `<h2 class="h-sec">${h}</h2><p class="muted rg-sub">${sub}</p><div class="recs rec-grid">${items.length ? items.map(([r, i]) => `<article class="rec rc-${r.c}" aria-label="${r.t}">
      <span class="rec-src"><i></i>${r.src} · ${r.from}</span><b>${r.t}</b><span class="rec-m">${r.m}</span><span class="rec-why">${r.why}</span>
      <span class="rec-btns"><button class="ghost" data-rpno="${i}">not for me</button><button class="mini-in${RSAVED.has(i) ? ' saved' : ''}" data-rec-in="${i}" aria-pressed="${RSAVED.has(i)}">${RSAVED.has(i) ? 'interested ✓' : "I'm interested"}</button></span></article>`).join('')
      : '<article class="rec rec-empty"><b>nothing left here</b><span class="rec-m">Pip finds more tomorrow.</span></article>'}</div>`;
  }).join('');
}
document.addEventListener('click', e => {
  const f = e.target.closest('[data-rf]');
  if (f) { recFilter = f.dataset.rf; f.parentElement.querySelectorAll('[data-rf]').forEach(x => x.setAttribute('aria-checked', x === f)); renderRecPage(); return; }
  const no = e.target.closest('[data-rpno]'); if (!no) return;
  const i = +no.dataset.rpno, r = RECS[i], card = no.closest('.rec');
  const L = {
    'friends going': [`Friends going isn't always enough (${r.t})`, 'Got it. A friend going won\'t be enough on its own.'],
    nearby: [`Close by isn't enough on its own (${r.t})`, 'Got it. Being close by won\'t be enough on its own.'],
    "Pip's pick": [`Less like ${r.t}`, `Got it. Fewer things like ${r.t}.`] }[r.src];
  card.classList.add('gone');
  setTimeout(() => { RGONE.add(i); renderRecPage(); }, reduce ? 0 : 280);
  document.querySelectorAll('#recLearn li.now').forEach(li => li.classList.remove('now'));
  $('#recLearn').insertAdjacentHTML('afterbegin', `<li class="now"><span>now</span>${L[0]}.</li>`);
  $('#recSay').textContent = L[1];
});
// the interested button keeps the page in step
document.addEventListener('click', e => { if (e.target.closest('[data-rec-in]') && current === 'recs') setTimeout(renderRecPage, 0); });
const _goR = go; go = function (id) { _goR(id); if (id === 'recs') renderRecPage(); };


// ---------- 22–23 · guest views. A guest's tap checks them in on the host's party night (NIGHT), so the two screens agree. ----------
document.querySelectorAll('[data-pip-plain]').forEach(el => { el.innerHTML = nfPip({ color: 'yellow', shape: 'circle', size: 40 }); });
function guestTap(name, v, how) {
  const i = NIGHT.yet.findIndex(g => g[0] === name);
  if (v === 'here') { if (i >= 0) checkIn(i, how); }
  else if (v === 'way' && i >= 0) { NIGHT.yet[i][1] = 'on my way'; renderNight(); }
  else if (v === 'undo') {   // back to not checked in (the prototype puts them back on the list)
    const j = NIGHT.here.findIndex(g => g[0] === name);
    if (j >= 0) { NIGHT.here.splice(j, 1); NIGHT.yet.push([name, 'said yes']); }
    else if (i >= 0) NIGHT.yet[i][1] = 'said yes';
    renderNight();
  }
  $('#glMirrorN').textContent = `${nHeadcount()} here`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-gl]');
  if (b) { const v = b.dataset.gl;
    $('#glStep').hidden = v !== 'undo'; $('#glDone').hidden = v === 'undo';
    if (v !== 'undo') $('#glDoneTxt').textContent = v === 'here' ? "You're checked in. Alex knows you got here. Have fun!" : "Thanks! Alex knows you're on your way. Tap the link again when you arrive.";
    guestTap('Lily', v, 'link'); return; }
  const a = e.target.closest('[data-ga]');
  if (a) { const v = a.dataset.ga;
    $('#gaTxt').textContent = v === 'here' ? "You're checked in. Alex knows you got here." : "Alex knows you're on your way.";
    $('#gaActs').hidden = true;
    $('#gaNudge').classList.toggle('skip', v === 'here'); $('#gaText').classList.add('skip');
    $('#gaNote').textContent = v === 'here' ? 'Theo is checked in, so the 8:30 nudge and the day-after text never go out.' : 'Theo is on his way. If he still isn\'t checked in at 8:30, he gets the one nudge.';
    guestTap('Theo', v, 'app'); }
});
const _goG = go; go = function (id) { _goG(id); if (id === 'guestlink') { const r = typeof rainPick === 'string' ? rainPick : 'inside'; $('#glWhere').textContent = r === 'inside' ? 'The bar room downstairs, 120 Grand St' : 'The roof, 120 Grand St' + (r === 'tent' ? ' (under the canopy)' : ''); $('#glMirrorN').textContent = `${nHeadcount()} here`; } };

// ---------- 27 · vendors & places (both paths). Sample shortlists; adding one waits for your OK, then lands in the budget like the canopy. ----------
const VSHORT = {
  food: { say: 'Three that fit ~20 people and your cap.', items: [
    { n: 'Grand St. Kitchen, party trays', src: 'caterer', d: 'Bites for 25 · delivered 6pm', v: 220 },
    { n: 'Pizza for the last hour', src: 'Uber Eats', d: '6 pies around 9pm · ordered on the night', v: 95 },
    { n: 'Dumpling platter', src: 'caterer', d: '60 pieces · pick up on the way', v: 140 } ] },
  drinks: { say: 'You already have the Instacart order. These are top-ups.', items: [
    { n: 'Wine and beer top-up', src: 'Instacart', d: 'Adds ~30% if the yeses jump · same delivery', v: 85 },
    { n: 'Corner wine shop', src: 'local shop', d: 'Delivers by 5pm · they take back unopened bottles', v: 120 },
    { n: 'No-alcohol spritz kit', src: 'Instacart', d: 'For 15 · fits the signature cocktail', v: 40 } ] },
  help: { say: 'For the roof: shelter, seats and hands for setup.', items: [
    { n: 'Canopy, 10×20 ft', src: 'rental', d: 'Set up by 6pm · the rain backup', v: 180, k: 'canopy' },
    { n: 'Folding chairs ×20', src: 'rental', d: 'Dropped off fri 3pm, picked up sat', v: 60 },
    { n: '2 helpers for setup and cleanup', src: 'TaskRabbit', d: '~$46/hr · you book and pay on TaskRabbit', v: 0, link: 1 } ] },
};
const VPEND = []; let vCat = null, vSwap = 'wait';
function renderVendors() {
  const rows = [];
  const placeName = EV.place || (EV.venue === 'free' ? 'A free spot' : EV.venue === 'booked' ? 'Your place (already paid for)' : EV.venue === 'paid' ? 'Your venue' : null);
  if (placeName) rows.push({ d: 'pl', t: 'the place', n: placeName, s: venueCost() ? `deposit ${money(venueCost())} · ${OKS.paid ? 'paid' : 'waiting for your OK at checkout'}` : 'nothing to book', st: venueCost() && !OKS.paid ? 'wait' : 'on' });
  else rows.push({ d: 'pl', t: 'the place', n: 'No place yet', s: 'Pip can shortlist three', st: 'none', go: 1 });
  if (orderLines().length) rows.push({ d: 'dr', t: 'drinks and bites', n: 'Instacart', s: `${money(orderTotal())} · arrives fri, 4–6pm${vSwap === 'ok' ? ' · Merlot instead of Pinot ✓' : ''} · ${OKS.paid ? 'ordered' : 'waiting for your OK at checkout'}`, st: OKS.paid ? 'on' : 'wait' });
  EV.extras.forEach(x => rows.push({ d: 'ex', t: x.src || (x.k === 'canopy' ? 'rain plan' : 'booked'), n: x.t, s: `${money(x.v)} · paid`, st: 'on' }));
  VPEND.forEach((x, i) => rows.push({ d: 'pe', t: x.src, n: x.n, s: x.link ? 'You book and pay on TaskRabbit. I only show you the link.' : `${money(x.v)} · waiting for your OK`, st: 'wait', i, link: x.link }));
  $('#vMine').innerHTML = rows.map(r => `<div class="go-row v-row st-${r.st}"><span class="v-dot" aria-hidden="true"></span><div><span class="v-k">${r.t}</span><b>${r.n}</b><span class="muted">${r.s}</span></div>
    ${r.go ? '<button class="ghost sm" data-goto="place" data-place-from="vendors">find a place</button>' : r.d === 'pe' ? (r.link ? `<button class="ghost sm" data-todo="Opens TaskRabbit's booking page in the real app. Pip never opens it or books for you.">open TaskRabbit</button>` : `<button class="btn sm v-ok" data-vapprove="${r.i}">approve · ${money(VPEND[r.i].v)}</button>`) : `<span class="v-st">${r.st === 'on' ? 'booked ✓' : 'needs your OK'}</span>`}</div>`).join('');
  if (vCat) {
    const c = VSHORT[vCat];
    $('#vShort').hidden = false;
    $('#vShort').innerHTML = `<div class="pipsay"><span class="gp-face" data-pipface-small></span><p class="bubble">${c.say}</p></div><div class="v-picks">${c.items.map((x, i) => {
      const have = VPEND.some(p => p.n === x.n) || (x.k && EV.extras.some(e => e.k === x.k));
      return `<article class="v-pick"><span class="src">${x.src}</span><b>${x.n}</b><span>${x.d}</span><span class="v-price">${x.v ? money(x.v) : 'price on TaskRabbit'}</span><button class="${have ? 'ghost' : 'mini'}" data-vadd="${vCat}:${i}" ${have ? 'disabled' : ''}>${have ? 'in your vendors ✓' : 'add to my plan'}</button></article>`; }).join('')}</div>`;
    paintPips();
  } else $('#vShort').hidden = true;
  document.querySelectorAll('[data-vcat]').forEach(b => b.setAttribute('aria-selected', b.dataset.vcat === vCat));
  const done = vSwap !== 'wait';
  $('#vChange').classList.toggle('done', done);
  $('#vDock').hidden = done;
}
document.addEventListener('click', e => {
  const c = e.target.closest('[data-vcat]');
  if (c) { vCat = vCat === c.dataset.vcat ? null : c.dataset.vcat; renderVendors(); return; }
  const a = e.target.closest('[data-vadd]');
  if (a) { const [k, i] = a.dataset.vadd.split(':'), x = VSHORT[k].items[+i]; VPEND.push({ ...x });
    $('#vSay').textContent = x.link ? 'Added. TaskRabbit books and takes payment on its own site, so I just keep the link here for you.' : `Added ${x.n}. Nothing is booked until you approve it in your vendors.`;
    renderVendors(); return; }
  const ok = e.target.closest('[data-vapprove]');
  if (ok) { const x = VPEND.splice(+ok.dataset.vapprove, 1)[0];
    const spent = EV.extras.reduce((t, y) => t + y.v, 0) + (OKS.paid ? orderTotal() + venueCost() : 0);
    EV.extras.push({ k: x.k || x.n, t: x.n, v: x.v, src: x.src });
    $('#vSay').textContent = spent + x.v > EV.cap ? `Booked ${x.n}. Heads up: that puts you ${money(spent + x.v - EV.cap)} over your cap.` : `Booked ${x.n} · ${money(x.v)}. It's in your budget folder now.`;
    $('#vLog').insertAdjacentHTML('afterbegin', `<li>You approved ${x.n} · ${money(x.v)}.</li>`);
    renderVendors(); renderEvent(); return; }
  const sw = e.target.closest('[data-vswap]');
  if (sw) {
    if (sw.dataset.vswap === 'other') { openChat(); return; }
    vSwap = 'ok';
    $('#vChange').innerHTML = '<div class="v-change-head"><b>swap approved ✓</b></div><span>Merlot instead of the Pinot Noir. Pip told Instacart. Nothing else changed.</span>';
    $('#vSay').textContent = "Done. I told Instacart. Nothing else changed in the order.";
    $('#vLog').insertAdjacentHTML('afterbegin', '<li>You approved: Merlot instead of Pinot Noir (Instacart).</li>');
    renderVendors();
  }
});
const _goV = go; go = function (id) { _goV(id); if (id === 'vendors') renderVendors(); };


// ---------- 25b · settings: how hands-on (same choice as the last question), action by action ----------
// level per setting: [all, mid, money]. lock = a rule from decisions.md (10/26, 11/13): asks whatever the host picks.
let HANDS = SAVED.HANDS || 'mid';
document.addEventListener('click', e => { const r = e.target.closest('[data-id="q5"] .opt-row'); if (r) HANDS = r.dataset.key; });
const HACTS = [
  { t: 'the first invite to your guests', lv: ['ask', 'ask', 'ask'], lock: 1 },
  { t: 'the one reminder, to people who haven\'t replied', lv: ['ask', 'can', 'can'] },
  { t: 'answering a guest\'s question (where, dress code)', lv: ['ask', 'can', 'can'] },
  { t: 'a vendor swap at the same price (Merlot for Pinot)', lv: ['ask', 'ask', 'can'] },
  { t: 'a rain plan that costs nothing (move inside)', lv: ['ask', 'ask', 'can'] },
  { t: 'the drinks order and any payment', lv: ['ask', 'ask', 'ask'], lock: 1 },
  { t: 'changing the date, time or place', lv: ['ask', 'ask', 'ask'], lock: 1 },
  { t: 'messaging guests between 10pm and 8am', lv: ['never', 'never', 'never'], lock: 1 },
];
const HSAY = { all: "You'll see everything before it happens. I'll still do the checking, so it's quick to say yes.", mid: 'The usual: I ask about big things and money, and quietly do the small stuff. You can see all of it in the log.', money: "I'll handle the day-to-day and come to you for money, plus the few things that always need you." };
function renderHands() {
  const k = ['all', 'mid', 'money'].indexOf(HANDS);
  document.querySelectorAll('[data-hands]').forEach(b => b.setAttribute('aria-checked', b.dataset.hands === HANDS));
  $('#handsActs').innerHTML = HACTS.map(a => `<li><span>${a.t}</span><span class="lv lv-${a.lv[k]}">${LV_TXT[a.lv[k]]}${a.lock ? '<i class="rule">rule</i>' : ''}</span></li>`).join('');
  $('#handsSay').textContent = HSAY[HANDS];
}
document.addEventListener('click', e => { const b = e.target.closest('[data-hands]'); if (b) { HANDS = b.dataset.hands; renderHands(); toast('Saved. This applies to all your events.'); } });

// ---------- 25c · settings: account ----------
document.addEventListener('click', e => {
  const w = e.target.closest('[data-acct-who]');
  if (w) { w.parentElement.querySelectorAll('[data-acct-who]').forEach(x => x.setAttribute('aria-checked', x === w)); $('#acctWhoNote').hidden = w.dataset.acctWho !== 'org'; return; }
  if (e.target.closest('#acctDel')) { $('#acctConfirm').hidden = false; $('#acctSay').textContent = 'Before you go: your events on Luma stay. Only what NoFuss keeps is deleted.'; return; }
  if (e.target.closest('#acctDelNo')) { $('#acctConfirm').hidden = true; $('#acctSay').textContent = 'Glad you stayed.'; return; }
  if (e.target.closest('#acctDelYes')) { $('#acctConfirm').hidden = true; toast('Prototype: nothing was deleted. In the real app this deletes your NoFuss account.'); }
});
const _goH = go; go = function (id) { _goH(id); if (id === 'handson') renderHands(); };

// ---------- 28 · connected apps (both paths). Levels follow prototype/connectors/registry.js; the host can only tighten them. ----------
// base: what the rule allows (read → can, send/money → ask, blocked → never). lock: a rule NoFuss sets that can't be loosened.
const A = (t, base, lock) => ({ t, base, lv: base, lock: !!lock });
const APPS = [
  { g: 'your events', apps: [
    { id: 'luma', tile: 'Lu', n: 'Luma', what: 'Your events, invites and RSVPs', st: 'on', acts: [
      A('read your events and guest list', 'can'), A('invite guests', 'ask', 1), A('change the date, time or place', 'ask', 1),
      A('approve, decline or waitlist a guest', 'ask', 1), A('change ticket prices', 'ask', 1), A('message every guest at once', 'never', 1), A('create or cancel an event', 'never', 1)] },
    { id: 'eventbrite', tile: 'Eb', n: 'Eventbrite', what: 'Ticketed events and attendees', st: 'soon' },
    { id: 'partiful', tile: 'Pa', n: 'Partiful', what: 'Party invites and RSVPs', st: 'soon' } ] },
  { g: 'places and tables', apps: [
    { id: 'opentable', tile: 'OT', n: 'OpenTable', what: 'Search and hold dinner reservations', st: 'soon' },
    { id: 'resy', tile: 'Re', n: 'Resy', what: 'Restaurants and bar back rooms', st: 'soon' },
    { id: 'peerspace', tile: 'Ps', n: 'Peerspace', what: 'Event spaces by size, date and price', st: 'soon' } ] },
  { g: 'getting there and weather', apps: [
    { id: 'gmaps', tile: 'GM', n: 'Google Maps', what: 'Travel times, places nearby, traffic', st: 'demo', acts: [A('check travel times and traffic', 'can')] },
    { id: 'amaps', tile: 'AM', n: 'Apple Maps', what: 'Travel times for iPhone users', st: 'soon' },
    { id: 'mta', tile: 'MTA', n: 'MTA', what: 'Subway delays and planned work', st: 'demo', acts: [A('check delays near the venue', 'can')] },
    { id: 'weather', tile: 'Wx', n: 'Weather', what: 'Forecast and rain for the place and time', st: 'demo', acts: [A('check the forecast', 'can')] } ] },
  { g: 'orders and help', apps: [
    { id: 'instacart', tile: 'IC', n: 'Instacart', what: 'Food and drinks orders', st: 'demo', acts: [A('build a cart under your cap', 'can'), A('place the order', 'ask', 1), A('accept a swap from the store', 'ask', 1)] },
    { id: 'taskrabbit', tile: 'TR', n: 'TaskRabbit', what: 'Help on the day: setup and cleanup', st: 'on', acts: [
      A('see services and hourly prices', 'can'), A('draft a booking link for you', 'can'), A('book, pay or tip', 'never', 1), A('message a Tasker', 'never', 1)] },
    { id: 'ubereats', tile: 'UE', n: 'Uber Eats', what: 'Fast deliveries on the night', st: 'soon' } ] },
  { g: 'messages and calendar', apps: [
    { id: 'gmail', tile: 'Gm', n: 'Gmail', what: 'Invites and replies from your own account', st: 'on', acts: [
      A('read replies about your event', 'can'), A('send invites and reminders from you', 'ask', 1), A('delete or forward your email', 'never', 1)] },
    { id: 'gcal', tile: 'GC', n: 'Google Calendar', what: 'Your free evenings and events you go to', st: 'soon' },
    { id: 'texts', tile: 'Tx', n: 'Texting', what: 'Alerts and check-in links (guests opt in)', st: 'soon' } ] },
];
const LV_TXT = { can: 'can', ask: 'asks you first', never: 'never' };
const LV_ORDER = ['can', 'ask', 'never'];
const ST_TXT = { on: 'connected ✓', demo: 'demo data', soon: 'coming soon' };
const appOpen = new Set(['luma']);
function renderApps() {
  const all = APPS.flatMap(x => x.apps), on = all.filter(a => a.st === 'on').length, demo = all.filter(a => a.st === 'demo').length;
  $('#appsOn').textContent = `${on} connected · ${demo} on demo data`;
  $('#appGroups').innerHTML = APPS.map(grp => `<h2 class="h-sec">${grp.g}</h2><div class="app-list">${grp.apps.map(a => {
    const open = appOpen.has(a.id) && a.acts && a.st !== 'off';
    const btn = a.st === 'on' ? `<button class="ghost sm" data-app-off="${a.id}">disconnect</button>`
      : a.st === 'off' ? `<button class="btn sm" data-app-on="${a.id}">connect</button>`
      : a.st === 'demo' ? `<button class="ghost sm" data-todo="${a.n} uses sample data in the prototype. Ethan builds the real connector (context/ui-ux/connectors-needed.md).">connect for real</button>`
      : `<button class="ghost sm" data-todo="${a.n} is coming soon: the connector isn't built yet (context/ui-ux/connectors-needed.md).">notify me</button>`;
    return `<div class="app-row st-${a.st}${open ? ' open' : ''}">
      <div class="app-top-row"><span class="logo-tile">${a.tile}</span><div class="app-name"><b>${a.n}</b><span class="muted">${a.what}</span></div>
        <span class="app-st">${ST_TXT[a.st] || 'not connected'}</span>${btn}</div>
      ${a.acts && a.st !== 'off' && a.st !== 'soon' ? `<button class="textlink sm app-more" data-app-more="${a.id}" aria-expanded="${open}">what Pip can do ${open ? '▴' : '▾'}</button>` : ''}
      ${open ? `<ul class="acts">${a.acts.map((x, i) => `<li><span>${x.t}</span><button class="lv lv-${x.lv}" data-lv="${a.id}:${i}" aria-label="${x.t}: ${LV_TXT[x.lv]}. Tap to make it stricter.">${LV_TXT[x.lv]}${x.lock && x.lv === x.base ? '<i class="rule">rule</i>' : ''}</button></li>`).join('')}</ul>` : ''}
    </div>`; }).join('')}</div>`).join('');
}
const findApp = id => APPS.flatMap(x => x.apps).find(a => a.id === id);
document.addEventListener('click', e => {
  const m = e.target.closest('[data-app-more]');
  if (m) { const id = m.dataset.appMore; appOpen.has(id) ? appOpen.delete(id) : appOpen.add(id); renderApps(); return; }
  const l = e.target.closest('[data-lv]');
  if (l) {
    const [id, i] = l.dataset.lv.split(':'), x = findApp(id).acts[+i];
    const from = LV_ORDER.indexOf(x.base), cur = LV_ORDER.indexOf(x.lv);
    if (x.base === 'never') { toast('This one is always blocked. It\'s a rule in the harness, not a setting.'); return; }
    x.lv = LV_ORDER[cur + 1] || x.base;   // stricter each tap; after "never" it goes back to the rule's level
    if (x.lv === x.base && x.lock) toast(`Back to the rule: ${LV_TXT[x.base]}. It can't be looser than that.`);
    $('#appsSay').textContent = x.lv === 'never' ? `OK: I'll never ${x.t} in ${findApp(id).n}.` : x.lv === 'ask' ? `OK: I'll ask you first before I ${x.t}.` : `OK: I'll ${x.t} without asking.`;
    renderApps(); return;
  }
  const off = e.target.closest('[data-app-off]');
  if (off) { const a = findApp(off.dataset.appOff); a.st = 'off'; appOpen.delete(a.id);
    $('#appsSay').textContent = a.id === 'luma' ? 'Disconnected. I stop reading your RSVPs, so the forecast freezes at the last numbers I saw.' : `Disconnected ${a.n}. I won't touch it until you connect it again.`;
    renderApps(); return; }
  const on = e.target.closest('[data-app-on]');
  if (on) { const a = findApp(on.dataset.appOn); a.st = 'on'; $('#appsSay').textContent = `${a.n} is back. Same levels as before.`; renderApps(); }
});
renderApps();

// ---------- 29–33 · the organization side (flow.md rows 29–33; Ilteris's screen 2). Demo data, like the rest of v2. ----------
// pills that are a plain pick-one (set up your team, guests filter)
document.addEventListener('click', e => {
  const p = e.target.closest('[data-org], [data-gf]'); if (!p) return;
  p.parentElement.querySelectorAll('[role="radio"]').forEach(x => x.setAttribute('aria-checked', x === p));
  if (p.dataset.gf) { GF.filter = p.dataset.gf; renderGuests(); }
});
// the organization name shows wherever [data-orgname] is
$('#orgName').addEventListener('input', e => document.querySelectorAll('[data-orgname]').forEach(el => { el.textContent = e.target.value.trim() || 'Your organization'; }));
// invite a teammate (nothing is sent in the prototype)
$('#teamAdd').addEventListener('click', () => {
  const v = $('#teamEmail').value.trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { toast('Type a work email first.'); return; }
  const role = document.querySelector('[data-org="role"][aria-checked="true"]').dataset.val;
  const li = document.createElement('li');
  li.innerHTML = `<span class="ri-you"></span><b></b><span class="role-tag"></span>`;
  li.querySelector('.ri-you').textContent = v[0].toUpperCase(); li.querySelector('b').textContent = v; li.querySelector('.role-tag').textContent = role + ' · invite waits';
  $('#teamList').append(li); $('#teamEmail').value = '';
  toast('Added. The invite goes out when you finish setting up.');
});

// the dashboard: approvals grouped by event, each showing who it waits on
const ORG = { left: { inv: 2, off: 2, hol: 1 } };
function syncOrg() {
  const n = Object.values(ORG.left).reduce((a, b) => a + b, 0);
  $('#orgOkCount').textContent = n;
  document.querySelectorAll('[data-left]').forEach(el => { const k = ORG.left[el.dataset.left]; el.textContent = k ? `${k} need${k === 1 ? 's' : ''} you` : 'nothing for you'; el.classList.toggle('clear', !k); });
  document.querySelectorAll('[data-left-n]').forEach(el => { const k = ORG.left[el.dataset.leftN]; el.textContent = k || '✓'; el.classList.toggle('clear', !k); });
  $('#weekSum').textContent = `4 events · ${n ? n + ' need' + (n === 1 ? 's' : '') + ' you' : 'nothing needs you'}`;
  document.querySelectorAll('.org-ok-badge').forEach(b => { b.textContent = n; b.hidden = n === 0; });
  document.querySelectorAll('.screen[data-id="orgdash"] .dock-ok').forEach(b => { b.textContent = n ? `${n} need${n === 1 ? 's' : ''} your OK` : 'all caught up'; b.disabled = !n; });
  const evs = Object.values(ORG.left).filter(Boolean).length;
  $('#orgSay').textContent = n ? `${n} thing${n === 1 ? '' : 's'} need${n === 1 ? 's' : ''} you across ${evs} event${evs === 1 ? '' : 's'}. The mixer is on track.` : 'Nothing needs you right now. The rest is waiting on other people, and I\'ll tell you when they answer.';
}
document.addEventListener('click', e => {
  const a = e.target.closest('[data-org-approve]'); if (!a) return;
  const g = a.closest('.ok-group'), k = a.dataset.orgApprove; ORG.left[k] = 0;
  if (k === 'off') { g.querySelector('.chain').innerHTML = '<i class="done">you ✓</i><em>→</em><i class="wait">Morgan, your manager · waiting</i>'; a.replaceWith(Object.assign(document.createElement('span'), { className: 'sent', textContent: 'sent to Morgan' })); }
  if (k === 'hol') { g.querySelector('.chain').innerHTML = '<i class="done">you ✓</i>'; a.replaceWith(Object.assign(document.createElement('span'), { className: 'sent', textContent: 'reminder goes out at 10am · Pip is looking for places' })); }
  g.classList.add('cleared'); syncOrg();
});
document.addEventListener('click', e => { if (e.target.closest('[data-jump-ok]')) setTimeout(() => $('#orgNeeds').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }), 30); });

// the sign-off link: what the client sees
document.addEventListener('click', e => {
  const b = e.target.closest('[data-so]'); if (!b) return;
  if (b.dataset.so === 'ask') { $('#soAsk').hidden = false; $('#soActions').hidden = true; $('#soQ').focus(); return; }
  if (b.dataset.so === 'send' && !$('#soQ').value.trim()) { toast('Write your question first.'); return; }
  $('#soCard').hidden = true; $('#soDone').hidden = false;
  const inv = document.querySelector('[data-grp="inv"]');
  if (b.dataset.so === 'ok') {
    $('#soDoneH').textContent = 'approved'; $('#soDoneT').textContent = 'Sam and Pip take it from here. Nothing else needs you for this dinner.';
    ORG.left.inv = 0; inv.querySelector('.chain').innerHTML = '<i class="done">you ✓</i><em>→</em><i class="done">Dana ✓</i>'; inv.classList.add('cleared');
  } else {
    $('#soDoneH').textContent = 'sent to Sam'; $('#soDoneT').textContent = 'Sam gets your question now. The change waits until you approve it.';
    inv.querySelector('.chain').innerHTML = '<i class="done">you ✓</i><em>→</em><i class="wait">Dana asked a question</i>';
  }
  syncOrg();
});

// reports: forecast range vs who came (real check-ins), and the simulated year
const FVC = [
  { n: 'Fall product launch', d: '11/10', lo: 70, hi: 80, came: 76 },
  { n: 'Board dinner', d: '11/5', lo: 11, hi: 12, came: 12 },
  { n: 'Design talk night', d: '10/28', lo: 45, hi: 55, came: 41, why: 'rain' },
  { n: 'Founders breakfast', d: '10/21', lo: 18, hi: 22, came: 20 },
  { n: 'Client preview', d: '10/14', lo: 28, hi: 34, came: 31 },
];
$('#fvc').innerHTML = FVC.map(r => {
  const max = Math.max(r.hi, r.came) * 1.2, pct = v => (v / max * 100).toFixed(1) + '%', hit = r.came >= r.lo && r.came <= r.hi;
  return `<div class="fvc-row ${hit ? 'hit' : 'miss'}"><span class="fvc-n"><b>${r.n}</b><span class="muted">${r.d}</span></span>
    <span class="fvc-track"><i class="fvc-range" style="left:${pct(r.lo)};width:calc(${pct(r.hi - r.lo)} + 4px)"></i><i class="fvc-dot" style="left:${pct(r.came)}"></i></span>
    <span class="fvc-v">~${r.lo}–${r.hi} · came ${r.came} ${hit ? '✓ inside' : '✗ outside' + (r.why ? ' (' + r.why + ')' : '')}</span></div>`;
}).join('');
$('#simRun').addEventListener('click', () => {
  const b = $('#simRun'); b.disabled = true; let i = 0;
  const tick = () => { i++; b.textContent = `running ${i} of 30`; if (i < 30) setTimeout(tick, reduce ? 0 : 45); else {
    b.textContent = 'run again'; b.disabled = false;
    $('#simTxt').textContent = '30 simulated events done. These are sample numbers for now, so they stay dashed.';
    $('#repSay').textContent = 'Done: 30 simulated events. Those numbers stay dashed so nobody mistakes them for real ones.';
  } };
  tick();
});
document.addEventListener('click', e => { if (e.target.closest('[data-share]')) toast('Read-only link copied (demo). The client sees the numbers, not your guest notes.'); });

// guests: each guest's history across events, which feeds the forecast
const GUESTS = [
  { n: 'Avery K.', inv: 10, came: 9, note: 'Counts almost as a sure yes' },
  { n: 'Jordan P.', inv: 8, came: 6, note: 'Usually brings a +1' },
  { n: 'Sam R.', inv: 9, came: 3, note: 'Says yes, often doesn\'t come' },
  { n: 'Priya M.', inv: 2, came: 2, note: 'New: too early to tell' },
  { n: 'Leo T.', inv: 12, came: 11, note: 'Comes to every dinner' },
  { n: 'Mina C.', inv: 7, came: 2, note: 'Socials only, rarely on Mondays' },
  { n: 'Noah B.', inv: 1, came: 1, note: 'New: first event was the mixer' },
];
const GF = { filter: 'all', q: '' };
const gKind = g => g.inv < 3 ? 'new' : g.came / g.inv >= .8 ? 'sure' : g.came / g.inv < .5 ? 'flaky' : 'mid';
function renderGuests() {
  const rows = GUESTS.filter(g => (GF.filter === 'all' || gKind(g) === GF.filter) && g.n.toLowerCase().includes(GF.q));
  $('#gList').innerHTML = rows.length ? rows.map(g => {
    const r = Math.round(g.came / g.inv * 100), k = gKind(g);
    const tag = { sure: 'sure thing', flaky: 'often doesn\'t come', new: 'new', mid: '' }[k];
    return `<div class="g-row"><span class="ri-you">${g.n[0]}</span><div class="g-main"><b>${g.n}${tag ? ` <span class="g-tag k-${k}">${tag}</span>` : ''}</b><span class="muted">${g.note}</span></div>
      <div class="g-rate"><span><b>${k === 'new' ? '—' : r + '%'}</b> came ${g.came} of ${g.inv}</span><span class="g-bar${k === 'new' ? ' g-new' : ''}" aria-hidden="true"><i style="width:${k === 'new' ? 0 : r}%"></i></span></div></div>`;
  }).join('') : '<p class="muted">No guests match.</p>';
}
$('#gSearch').addEventListener('input', e => { GF.q = e.target.value.trim().toLowerCase(); renderGuests(); });
renderGuests(); syncOrg();


// ---------- one run, start to finish (11/23): moments in time, one "needs your OK" count, and screens that follow your answers ----------
// The demo moves through the event's moments with "skip ahead" in Pip's column. Every in-app screen reads the same run.
const ORDER = ['setup', 'sent', 'week', 'three', 'night', 'after', 'done'];
const at = k => ORDER.indexOf(STK) >= ORDER.indexOf(k);
const evISO = () => Q.custDay || Q.day || '2026-12-04';
const weekday = iso => dOf(iso).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
function stageList() {
  const e = evISO(), L = [{ k: 'setup', iso: TODAY }, { k: 'sent', iso: TODAY }];
  if (dayDiff(TODAY, addDays(e, -7)) > 0) L.push({ k: 'week', iso: addDays(e, -7) });
  if (dayDiff(TODAY, addDays(e, -3)) > 0) L.push({ k: 'three', iso: addDays(e, -3) });
  return [...L, { k: 'night', iso: e }, { k: 'after', iso: addDays(e, 1) }, { k: 'done', iso: addDays(e, 1) }];
}
const nowISO = () => (stageList().find(x => x.k === STK) || { iso: TODAY }).iso;
const fcRange = () => [Math.round(Q.invites * .53), Math.round(Q.invites * .67)];
function rsvp() {
  const n = Q.invites, f = { setup: [0, 0, 0], sent: [.1, .04, 0], week: [.5, .1, .07] }[STK] || [.73, .13, .07];
  const yes = Math.round(n * f[0]), maybe = Math.round(n * f[1]), no = Math.round(n * f[2]);
  return { yes, maybe, no, none: Math.max(0, n - yes - maybe - no) };
}
const textN = () => Math.round(rsvp().yes * .82);   // the yeses who said texts are OK
function evName() { return Q.name || $('#evName').value.trim() || EVENT_NAMES[Q.type] || 'Our get-together'; }
const slug = t => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const isRoof = () => /roof/i.test(EV.place || '') || (!EV.place && /roof/i.test(evName()));
const outside = () => isRoof() ? 'the roof' : 'outside';
const insideName = () => isRoof() ? 'the bar room downstairs' : 'a covered spot nearby';
const spentNow = () => (OKS.paid ? orderTotal() + venueCost() : 0) + EV.extras.reduce((t, x) => t + x.v, 0);
function capNote(r) { if (r !== RAIN.tent) return []; const over = spentNow() - EV.cap; return over > 0 ? [`That puts you ${money(over)} over your ${money(EV.cap)} cap. You approved it; nothing else gets added without asking.`] : []; }

// everything that waits for the host, across screens: the rail badge, home and the event page all count from here
function pending() {
  const P = [];
  if (!OKS.paid) {
    const left = okItems().filter(i => !OKS.approved[i.id]).length;
    P.push({ t: left ? `Your plan · ${left} thing${left === 1 ? '' : 's'} to approve` : 'Your plan · ready to pay', s: 'The invite and the order wait for you. Nothing goes out until you say so.', go: 'ok', n: left || 1, btn: left ? `review ${left} thing${left === 1 ? '' : 's'}` : 'pay' });
  }
  if (at('three') && !at('night') && !rainDone) P.push({ t: `Rain plan · ${evName()}`, s: `~70% rain ${weekday(evISO())} night. Move inside, add a canopy, or keep it.`, go: 'alert', btn: 'see the rain plan' });
  THREAD.filter(m => m.card && m.status === 'waiting').forEach(m => P.push({ t: `Pip's change · ${m.card.title}`, s: 'It\'s in Pip\'s column. Nothing changes until you approve it.', go: current && document.querySelector(`.screen[data-id="${current}"]`)?.classList.contains('inapp') ? current : 'event', btn: 'see it' }));
  if (at('after') && DA.sent.size < 2) P.push({ t: 'Two messages after the party', s: 'A thank-you and one check-in. Each waits for your OK.', go: 'dayafter', n: 2 - DA.sent.size, btn: 'see them' });
  return P;
}
const okN = P => P.reduce((t, p) => t + (p.n || 1), 0);   // how many things wait, counted the same way everywhere
const needsHTML = (P, btn = true) => P.length
  ? `<div class="needs-head"><b>needs your OK</b><span class="count">${okN(P)}</span></div>${P.map(p => `<div class="ok-item"><span class="circle"></span><div><b>${p.t}</b><span>${p.s}</span></div></div>`).join('')}${btn ? `<button class="btn btn-light wide" data-goto="${P[0].go}">${P[0].btn}</button>` : ''}`
  : `<div class="needs-head"><b>needs your OK</b><span class="count light">0</span></div><div class="ok-item light"><span class="circle on"></span><div><b>Nothing right now</b><span>I'll tell you when something needs you.</span></div></div>`;

// the time control: a demo tool, so it lives at the top of Pip's column, in the prototype's own plain styles
document.querySelectorAll('.screen.inapp .pip-side').forEach(side => {
  if (side.closest('[data-id="orgdash"], [data-id="reports"], [data-id="guests"]')) return;
  side.insertAdjacentHTML('afterbegin', `<div class="timebar" aria-label="Demo time"><span class="tb-now"></span><span class="tb-btns"><button class="ghost tb-skip" data-skip></button><button class="textlink tb-reset" data-restart>start over</button></span></div>`);
});
function nextKey() { const L = stageList().map(x => x.k); return L[L.indexOf(STK) + 1]; }
function skipAhead() {
  if (STK === 'setup') { go('ok'); toast('Approve your plan first. Nothing goes out until you do.'); return; }
  if (STK === 'three' && !rainDone) { go('alert'); toast('The rain plan needs your OK before party night.'); return; }
  if (STK === 'after' && !DA.saved) { go('dayafter'); toast('Answer the three quick ones first. Saving moves you on.'); return; }
  const k = nextKey(); if (!k) return;
  STK = k;
  const d = labelOf(nowISO()), r = rsvp(), [lo, hi] = fcRange();
  if (k === 'week') LOG.push([d, `${r.yes} yes and ${r.maybe} maybe so far. Still planning for ~${lo}–${hi}.`]);
  if (k === 'three') { LOG.push([d, `One reminder went to the ${r.none} who hadn't replied. Nobody gets more than one.`]); LOG.push([d, 'RAIN']); }
  if (k === 'night') LOG.push([d, 'Party night. Check-in opened at the door.']);
  if (k === 'after') LOG.push([d, `The party's over. ${finalCount() - 1} checked in.`]);
  refresh();
  go({ week: 'event', three: 'alert', night: 'night', after: 'dayafter' }[k] || 'event');
  toast(`It's ${d} now.`);
}
document.addEventListener('click', e => {
  if (e.target.closest('[data-skip]')) { skipAhead(); return; }
  if (e.target.closest('[data-restart]')) { RESETTING = true; try { localStorage.removeItem('nf.v2.run'); } catch {} location.replace(location.pathname + location.search + '#who'); location.reload(); }
});
function afterRain(r) { LOG.push([labelOf(nowISO()), `Rain plan: ${r.t.toLowerCase()}. Guests were told.`]); refresh(); }

// the rain alert follows the event: its day, the place, the cap
function alertTexts() {
  const e = evISO(), wd = weekday(e), spent = spentNow(), over = spent + 180 - EV.cap, r = rsvp(), [lo, hi] = fcRange();
  const set = (sel, t) => { const el = document.querySelector(sel); if (el) el.textContent = t; };
  set('[data-id="alert"] .page-head h1', `rain is likely on ${wd} night`);
  if (!rainDone) set('#alertSay', `Rain looks likely on ${wd} night. I already have a backup lined up; you just pick.`);
  set('[data-id="alert"] .n-top span', `${labelOf(addDays(e, -3))} · 9:02am · also sent as a text`);
  set('[data-id="alert"] .notif p', `Rain likely ${wd.slice(0, 3)} 7–10pm for ${evName()}. I've got a backup ready. Tap to pick.`);
  set('[data-id="alert"] .wx-top > div > span', `${labelOf(e)} · ${Q.area || 'your area'} · light rain, 48°F, wind 9 mph`);
  set('[data-rain="inside"] .sub', isRoof() ? 'The bar room downstairs holds ~25. Free, and the venue is holding it for you.' : 'A covered spot nearby that fits the group. Free, and I can hold it for you.');
  set('[data-rain="tent"] b', `add a canopy${isRoof() ? ' on the roof' : ''}`);
  set('[data-rain="tent"] .sub', over > 0 ? `A 10×20 ft tent, set up by 6pm. $180, which puts you ${money(over)} over your ${money(EV.cap)} cap.` : `A 10×20 ft tent, set up by 6pm. $180, still inside your ${money(EV.cap)} cap.`);
  set('[data-rain="keep"] b', `keep it ${outside() === 'the roof' ? 'on the roof' : 'outside'}`);
  set('#rainText + .sw + span b', `Text the ${textN()} guests who said texts are OK`);
  set('#rainText + .sw + span .muted', `The other ${r.yes - textN()} yeses see it on Luma. People who said no don't hear anything.`);
  const ck = document.querySelectorAll('[data-id="alert"] .checked li');
  if (ck[1]) ck[1].innerHTML = `<b>The venue</b> · ${isRoof() ? 'the bar room is free that night and fits ~25' : 'a covered spot nearby is free that night'}`;
  if (ck[2]) ck[2].innerHTML = `<b>Luma</b> · ${r.yes} yes, ${r.maybe} maybe. ~${lo}–${hi} likely to come either way`;
  RAIN.inside.s = `$0 · ${insideName()}`;
  RAIN.inside.msg = `Rain's likely ${wd}, so we're moving inside: ${insideName()}, same time. See you there!`;
  RAIN.inside.list = [`${isRoof() ? 'The venue booked the bar room downstairs' : 'A covered spot nearby is booked'} for ${labelOf(e)}. $0.`, `Luma now says: inside, ${insideName()}.`];
  RAIN.tent.s = over > 0 ? `$180 · set up by 6pm · ${money(over)} over your cap` : '$180 · set up by 6pm · inside your cap';
  RAIN.tent.go = over > 0 ? 'OK, go over my cap · $180' : 'OK, add the canopy · $180';
  RAIN.tent.msg = `Rain's possible ${wd}, so there'll be a canopy. Same place, same time, you'll stay dry. See you there!`;
  RAIN.tent.list = [`A 10×20 ft canopy is booked, set up by 6pm ${wd.slice(0, 3)}. $180, paid. It shows in your budget folder.`, 'The venue knows it is coming.'];
  RAIN.keep.t = `Keep it ${outside() === 'the roof' ? 'on the roof' : 'outside'}`;
  RAIN.keep.msg = `Heads up: rain is possible ${wd} night. We're still ${outside() === 'the roof' ? 'on the roof' : 'outside'}, so bring a jacket. I'll text if anything changes.`;
  renderAlert();
}
document.addEventListener('click', e => { if (e.target.closest('[data-rain]')) alertTexts(); });

// party night follows the run: the order, the rain plan, who's here
function nightTexts() {
  const n = nHeadcount(), where = !rainDone ? '' : rainPick === 'inside' ? ` It's in ${insideName()}.` : rainPick === 'tent' ? ' The canopy is up, so stay dry.' : ' Bring a jacket.';
  const sms = document.querySelector('[data-id="night"] .g-sms');
  if (sms) sms.innerHTML = `${evName()} starts now!${where} Tap when you arrive: <u>nofuss.app/in/${slug(evName()).split('-')[0] || 'party'}</u>`;
  const L = orderLines(), run = document.querySelectorAll('[data-id="night"] .run li');
  if (run[0]) run[0].innerHTML = `<span>5:12</span>${L.length ? 'The order arrived: ' + L.map(l => l[0].toLowerCase()).join(', ') + '.' : 'Nothing to deliver tonight.'}`;
  if (run[2]) run[2].innerHTML = `<span>7:${String(nightClock).padStart(2, '0')}</span>Now · ${n} here`;
  $('#nHereN').textContent = n;
}
const _renderNight = renderNight; renderNight = function () { _renderNight(); nightTexts(); };

// one event name, one area, one Luma link everywhere
function namesAndLinks() {
  const name = evName();
  document.querySelectorAll('[data-evname]').forEach(el => { el.textContent = name; });
  document.querySelectorAll('.rail-item[data-goto="event"]').forEach(el => { el.title = name; });
  document.querySelectorAll('a.luma').forEach(a => { a.firstChild.textContent = `luma.com/${slug(name)} `; });
  const ml = document.querySelector('#evMeta a'); if (ml) ml.textContent = `luma.com/${slug(name)}`;
  $('#evName').placeholder = EVENT_NAMES[Q.type] || 'Our get-together';
}

// the sample text that names the event or its days follows the run (name, the day, the day after, 3 days before)
const TPL = [], TPL_RE = /Drinks on the roof|fri 12\/4|sat 12\/5|tue 12\/1|fri 11\/27/g;
(function collect() { const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) if (/Drinks on the roof|fri 12\/4|sat 12\/5|tue 12\/1|fri 11\/27/.test(n.nodeValue) && !n.parentElement.closest('#pickEvent, #fromApp, script, style')) TPL.push([n, n.nodeValue]); })();
function fillTemplates() {
  const e = evISO(), m = { 'Drinks on the roof': evName(), 'fri 12/4': labelOf(e), 'sat 12/5': labelOf(addDays(e, 1)), 'tue 12/1': labelOf(addDays(e, -3)), 'fri 11/27': labelOf(addDays(e, -7)) };
  TPL.forEach(([n, t]) => { if (!n.isConnected) return; const v = t.replace(TPL_RE, k => m[k]); if (n.nodeValue !== v) n.nodeValue = v; });
}
// the event page, home and the rail, from the run
function renderStage() {
  if (!READY) return;
  fillTemplates();
  if (OKS.paid && STK === 'setup') { STK = 'sent'; LOG.push([labelOf(TODAY), `You approved and paid ${money(orderTotal() + venueCost())}. Nothing else was charged.`], [labelOf(TODAY), `The invite went out to ${Q.invites} people at 6pm.`]); }
  namesAndLinks(); alertTexts(); nightTexts();
  const e = evISO(), now = nowISO(), left = dayDiff(now, e), r = rsvp(), [lo, hi] = fcRange(), n = Q.invites, P = pending();
  const pct = v => Math.round(v / n * 100) + '%';
  const span = Math.max(1, dayDiff(TODAY, e)), elapsed = Math.min(100, Math.max(4, Math.round(dayDiff(TODAY, now) / span * 100)));
  const live = STK === 'night', done = at('after');
  // event page
  const ev = document.querySelector('[data-id="event"]');
  ev.querySelector('.ev-title .state').innerHTML = done ? '<span aria-hidden="true">✓</span> done' : live ? '<span aria-hidden="true">●</span> live tonight' : STK === 'setup' ? '<span aria-hidden="true">○</span> waiting for your OK' : '<span aria-hidden="true">◷</span> upcoming';
  $('#evDays').textContent = done ? 'it happened' : live ? "it's tonight" : `${left} day${left === 1 ? '' : 's'} to go`;
  ev.querySelector('.bar .time').style.width = (done || live ? 100 : elapsed) + '%';
  ev.querySelector('.bar-card.solid-yellow > .muted').textContent = `Planning started ${labelOf(TODAY)}`;
  $('#evYes').textContent = STK === 'setup' ? 'no replies yet' : `${r.yes} of ${n} said yes`;
  const st = ev.querySelectorAll('.bar.stack i'); st[0].style.width = pct(r.yes); st[1].style.width = pct(r.maybe); st[2].style.width = pct(r.no);
  ev.querySelector('.legend').innerHTML = `<span><i class="yes"></i>${r.yes} yes</span><span><i class="maybe"></i>${r.maybe} maybe</span><span><i class="no"></i>${r.no} no</span><span><i></i>${r.none} no reply</span>`;
  $('#evInvited').textContent = `${r.yes} yes · ${r.maybe} maybe · ${n} invited`;
  $('#evDayofTag').textContent = live ? 'check-in and the run of the night · on now' : done ? 'check-in and the run of the night · done' : `check-in and the run of the night · switches on ${labelOf(e)}`;
  $('#evSay').textContent = STK === 'setup' ? 'Your plan is ready. Nothing goes out until you approve it.'
    : STK === 'sent' ? `The invite is out. ${r.yes} yes already. I'm planning for ~${lo}–${hi}.`
    : done ? `${DA.saved ? 'All wrapped up.' : 'The party is over. Three quick questions and I learn from it.'}`
    : live ? `It's party night. ${nHeadcount()} here so far.`
    : `${r.yes} said yes and ${r.maybe} maybe. I'm still planning for ~${lo}–${hi}, so the order stays as it is.`;
  const evNeeds = ev.querySelector('.pip-side > section[aria-label="Needs your OK"]');
  evNeeds.className = P.length ? 'needs' : 'calm-card'; evNeeds.innerHTML = needsHTML(P);
  const nx = ev.querySelector('.next-up');
  const NEXT = { setup: ['Approve your plan', 'The invite and the order wait for your OK.'], sent: ['RSVPs come in', 'I update the forecast as people reply.'],
    week: [`One reminder · ${labelOf(addDays(e, -3))}, 10am`, "Only to people who haven't replied."], three: ['Party night', `${labelOf(e)} · check-in opens at the door.`],
    night: ['The day after', 'Three quick questions, and two messages that wait for your OK.'], after: ['Three quick questions', 'They make your next forecast sharper.'], done: ['Nothing left', 'This one is done. It feeds your next forecast.'] }[STK];
  nx.innerHTML = `<b>${NEXT[0]}</b><span>${NEXT[1]}</span>`;
  ev.querySelector('.log').innerHTML = LOG.length ? LOG.slice().reverse().map(([d, t]) => t === 'RAIN'
    ? `<li><span>${d.split(' ')[1] || d}</span><span>Rain is likely ${weekday(e)} night. I have a backup ready.${rainDone ? '' : ' <button class="textlink" data-goto="alert">see the alert</button>'}</span></li>`
    : `<li><span>${d.split(' ')[1] || d}</span>${t}</li>`).join('') : '<li><span>now</span>Nothing yet. It starts when you approve your plan.</li>';
  // home
  const home = document.querySelector('[data-id="yourevents"]'), card = home.querySelector('.host-card.hc-yellow');
  home.querySelector('.home-head .muted').textContent = `good morning, Alex · ${labelOf(now)}`;
  card.hidden = done;
  card.querySelector('.hc-state').innerHTML = live ? '<span aria-hidden="true">●</span> live tonight' : STK === 'setup' ? '<span aria-hidden="true">○</span> waiting for your OK' : `<span aria-hidden="true">◷</span> upcoming · ${left} day${left === 1 ? '' : 's'} to go`;
  card.querySelector('.hc-meta').textContent = `${$('#pWhen').textContent} · ${EV.place || 'the venue'}, ${Q.area || 'your area'}`;
  card.querySelector('.hc-bar i').style.width = pct(r.yes);
  const foot = card.querySelectorAll('.hc-foot span');
  foot[0].textContent = STK === 'setup' ? `${n} to invite · forecast ~${lo}–${hi}` : `${r.yes} of ${n} said yes · forecast ~${lo}–${hi}`;
  foot[1].textContent = `${okN(P)} need${okN(P) === 1 ? 's' : ''} you`; foot[1].hidden = !P.length;
  const past = home.querySelector('details.past');
  let pr = $('#pastThis');
  if (done && !pr) { past.querySelector('summary').insertAdjacentHTML('afterend', '<div class="past-row" id="pastThis"><b></b><span class="muted"></span></div>'); pr = $('#pastThis'); }
  if (pr) { pr.hidden = !done; pr.querySelector('b').textContent = evName(); pr.querySelector('.muted').textContent = `${labelOf(e)} · ${DA.came} came · forecast was ~${lo}–${hi}${DA.came >= lo && DA.came <= hi ? ' ✓' : ''}`; }
  past.querySelector('summary .muted').textContent = `${done ? 3 : 2} · folded away`;
  const N = okN(P);
  home.querySelector('.pip-side .bubble').textContent = P.length ? `Morning! ${N === 1 ? 'One thing needs' : N + ' things need'} you; everything else is on track.` : done ? `Morning! ${evName()} is done and filed away. Nothing needs you.` : 'Morning! Nothing needs you; everything is on track.';
  const hn = home.querySelector('.pip-side > section[aria-label^="Needs your OK"]');
  hn.className = P.length ? 'needs' : 'calm-card'; hn.innerHTML = needsHTML(P);
  const soon = stageList().filter(x => ORDER.indexOf(x.k) > ORDER.indexOf(STK) && x.k !== 'done' && x.k !== 'sent').slice(0, 3);
  const SOON = { week: 'A week before: I check the weather, subway and traffic', three: "One reminder to people who haven't replied", night: `${evName()} · party night`, after: 'Three quick questions about how it went' };
  home.querySelector('.pip-side .run').innerHTML = `<li class="now"><span>today</span>${P.length ? P[0].t : 'All quiet.'}</li>` + soon.map(x => `<li><span>${labelOf(x.iso).split(' ')[0]}</span>${SOON[x.k]}</li>`).join('');
  const hd = home.querySelector('.dock-ok'); hd.hidden = !P.length; if (P.length) { hd.textContent = `${N} need${N === 1 ? 's' : ''} your OK · ${P[0].btn}`; hd.dataset.goto = P[0].go; }
  // the rail: one count, and "needs your OK" goes to the first thing waiting
  document.querySelectorAll('.ok-badge').forEach(b => { b.textContent = okN(P); b.hidden = !P.length; });
  const rem = document.querySelectorAll('[data-id="plan"] .also li')[1]; if (rem) rem.textContent = `Send one reminder on ${labelOf(addDays(e, -3))}, only to people who haven't replied`;
  document.querySelectorAll('.rail-item[title="Needs your OK"]:not([data-jump-ok])').forEach(b => { b.dataset.goto = P.length ? P[0].go : 'ok'; });
  // the time control
  const nk = nextKey(), nxt = stageList().find(x => x.k === nk);
  const lbl = STK === 'setup' ? 'approve your plan to start' : STK === 'three' && !rainDone ? 'pick a rain plan first' : STK === 'after' && !DA.saved ? 'answer the day after first'
    : !nk || nk === 'done' ? '' : nk === 'night' ? 'skip to party night ▸' : nk === 'after' ? 'skip to the day after ▸' : `skip to ${labelOf(nxt.iso)} ▸`;
  document.querySelectorAll('.timebar').forEach(tb => {
    tb.querySelector('.tb-now').textContent = `demo · it's ${labelOf(now)}${live ? ', party night' : ''}`;
    const b = tb.querySelector('.tb-skip'); b.textContent = lbl; b.hidden = !lbl;
  });
  saveRun();
}
let RESETTING = false;
function saveRun() { if (RESETTING) return; try { localStorage.setItem('nf.v2.run', JSON.stringify({ Q, EV, OKS, rainPick, rainDone, NIGHT, HANDS, STK, LOG, DA: { came: DA.came, food: DA.food, sent: [...DA.sent], touched: DA.touched, saved: DA.saved } })); } catch {} }
document.addEventListener('click', () => setTimeout(() => { if (READY) saveRun(); }, 0));

// onboarding inputs: the event's name, where it is, and how many events a year
$('#evName').value = Q.name; $('#evArea').value = Q.area;
$('#evName').addEventListener('input', e => { Q.name = e.target.value.trim(); refresh(); });
$('#evArea').addEventListener('input', e => { Q.area = e.target.value.trim(); refresh(); });
document.querySelectorAll('[data-id="q1"] .tile').forEach(t => t.addEventListener('click', () => namesAndLinks()));
document.addEventListener('click', e => {
  const c = e.target.closest('[data-id="who"] .choice'); if (c) $('#whoHow').hidden = c.dataset.path !== 'start';
  const p = e.target.closest('[data-pro]'); if (!p) return;
  Q.pro = p.dataset.pro; p.parentElement.querySelectorAll('[data-pro]').forEach(x => x.setAttribute('aria-checked', x === p));
  document.querySelector('[data-id="who"] .bubble').textContent = { few: "A few a year. I'll keep it simple and walk you through each one.", monthly: "About one a month. I'll learn your crowd fast, so each forecast gets sharper.", pro: "30 or more? Then the forecast really pays off. I'll track how it does across all of them." }[Q.pro];
});
// bring my event: the event you pick is the one Pip plans
const LUMA_EVENTS = [{ name: 'Drinks on the roof', type: 'cocktail party', day: '2026-12-04', time: '7pm', invites: 30 }, { name: 'Book club holiday party', type: 'something else', other: 'holiday party', day: '2026-12-12', time: '6pm', invites: 14 }];
$('#useEvent').addEventListener('click', () => {
  if (window.lumaPicking && window.lumaPicking()) return;   // real Luma events: luma-v2.js handles it
  const i = [...document.querySelectorAll('#pickEvent [role="radio"]')].findIndex(x => x.getAttribute('aria-checked') === 'true'), ev = LUMA_EVENTS[i]; if (!ev) return;
  Object.assign(Q, { name: ev.name, type: ev.type, day: ev.day, custDay: null, time: ev.time, custTime: null }); setInvites(ev.invites);
  if (ev.other) $('#otherType').value = ev.other;
  $('#fromApp b').textContent = `From Luma: ${ev.name} · ${labelOf(ev.day)} · ${ev.time} · ${ev.invites} invited ✓`;
  renderQ2(); refresh();
});
// the hands-on question: Pip's suggestion is pre-picked, like the others
(function () { const row = document.querySelector(`[data-id="q5"] .opt-row[data-key="${HANDS}"]`); if (row) { row.setAttribute('aria-checked', 'true'); $('#q5Next').disabled = false; $('#q5Next').dataset.goto = 'building'; } })();
// the day after starts from who checked in on party night, plus the one who told Pip the next morning
['#daMinus', '#daPlus', '#daCount'].forEach(id => $(id).addEventListener('input', () => { DA.touched = true; }));
['#daMinus', '#daPlus'].forEach(id => $(id).addEventListener('click', () => { DA.touched = true; }));
['#daSave', '#daDock'].forEach(id => $(id).addEventListener('click', () => {
  DA.saved = true; if (at('after')) { STK = 'done'; LOG.push([labelOf(nowISO()), `You told Pip how it went: ${DA.came} came. It's in your next forecast.`]); } refresh();
}));
function restoreScreens() {
  if (rainDone) { const r = RAIN[rainPick]; $('#alertDoneT').textContent = r.done; $('#alertDoneList').innerHTML = r.list.map(x => `<li>${x}</li>`).join(''); $('#alertAsk').hidden = true; $('#alertDone').hidden = false; $('#alertNeeds').hidden = true; $('#alertDock').hidden = true; $('#alertSay').textContent = "Done. I'll keep watching the weather and tell you if anything changes."; }
  document.querySelectorAll('[data-rain]').forEach(x => x.setAttribute('aria-checked', x.dataset.rain === rainPick));
  if (DA.saved) { $('#daAsk').hidden = true; $('#daDone').hidden = false; $('#daDock').hidden = true; }
  DA.sent.forEach(id => { const box = $('#' + id); if (box) { box.classList.add('sent'); const b = box.querySelector('[data-dasend]'); if (b) b.outerHTML = '<span class="sent-tag">✓ sent</span>'; } });
  document.querySelectorAll('[data-cover]').forEach(b => b.setAttribute('aria-checked', EV[b.dataset.cover] === b.dataset.val));
  document.querySelectorAll('[data-id="q1"] .tile').forEach(t => t.setAttribute('aria-checked', !!SAVED.Q && t.dataset.type === Q.type));
  if (SAVED.Q) { $('#q1Next').disabled = false; $('#q1Next').dataset.goto = 'q2'; }
  setInvites(Q.invites); renderNight(); renderDayAfter();
}
// "One way in" for each folder: the page stays put when a folder opens
let FOLD_CLICK = false;
document.addEventListener('click', e => { if (e.target.closest('[data-fold]')) FOLD_CLICK = true; }, true);
const _openFolder = openFolder; openFolder = function (f, open) {
  const anchor = FOLD_CLICK; FOLD_CLICK = false;
  const main = $('#main-event'), sc = main && getComputedStyle(main).overflowY === 'auto' ? main : document.scrollingElement, t0 = f.getBoundingClientRect().top;
  _openFolder(f, open);
  if (!anchor) return;
  const end = performance.now() + 520;
  (function keep() { const dt = f.getBoundingClientRect().top - t0; if (Math.abs(dt) > .5) sc.scrollTop += dt; if (performance.now() < end) requestAnimationFrame(keep); })();
};
// going to the day after for the first time: start from tonight's check-ins
// by the end of the night, the yeses still on their way came too (the prototype's stand-in for the rest of the night)
const finalCount = () => nHeadcount() + NIGHT.yet.filter(g => /yes/.test(g[1])).reduce((t, g) => t + 1 + (/\+1/.test(g[1]) ? 1 : 0), 0);
const _goS = go; go = function (id) { if (id === 'dayafter' && !DA.touched && !DA.saved) { DA.came = finalCount(); $('#daCount').value = DA.came; } _goS(id); if (id === 'dayafter') renderDayAfter(); renderStage(); };
READY = true; restoreScreens(); refresh();
// ---------- first-time tour (Ilteris's review, 11/23): 4 short pointers the first time someone lands in the app; skip any time; ?tour replays ----------
const TOUR = [
  { sel: ['.rail', '.menu-btn'], t: 'your menu', d: 'Your events, approvals, vendors, connected apps and settings live here.' },
  { sel: ['.app-main'], t: 'your event, at a glance', d: 'Real numbers are solid. Pip\'s forecasts are dashed, with a ~.' },
  { sel: ['.pip-side', '.dock-ok'], t: 'what Pip is doing', d: 'Pip works here. Anything that needs your OK shows up in black.' },
  { sel: ['.dock .dock-ask', '.dock .launcher'], t: 'tell Pip what you need', d: 'Say it in your own words, like "move it to Saturday". Pip does the work and asks before anything big.' },
];
let tourI = -1;
function tourTarget(step) {
  const scr = document.querySelector('.screen.on');
  for (const q of step.sel) { const el = scr && scr.querySelector(q); if (el && el.getBoundingClientRect().width > 0) return el; }
  return null;
}
function tourShow() {
  let box = $('#tour'); if (!box) { box = document.createElement('div'); box.id = 'tour'; box.innerHTML = '<div class="tour-spot"></div><div class="tour-card" role="dialog" aria-live="polite"><span class="tour-n"></span><b></b><p></p><div class="tour-acts"><button class="textlink sm" data-tour="skip">skip the tour</button><button class="btn sm" data-tour="next">next</button></div></div>'; document.body.append(box); }
  const step = TOUR[tourI], el = tourTarget(step);
  if (!el) { tourNext(); return; }
  const r = el.getBoundingClientRect(), pad = 8, spot = box.querySelector('.tour-spot'), card = box.querySelector('.tour-card');
  Object.assign(spot.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
  box.querySelector('.tour-n').textContent = `${tourI + 1} of ${TOUR.length}`;
  box.querySelector('b').textContent = step.t; box.querySelector('p').textContent = step.d;
  box.querySelector('[data-tour="next"]').textContent = tourI === TOUR.length - 1 ? 'got it' : 'next';
  box.hidden = false;
  const cw = Math.min(320, innerWidth - 32), right = r.right + 16 + cw < innerWidth, below = r.bottom + 190 < innerHeight;
  let left = right ? r.right + 16 : Math.max(16, Math.min(innerWidth - cw - 16, r.left));
  let top = right ? Math.max(16, Math.min(innerHeight - 200, r.top)) : below ? r.bottom + 16 : Math.max(16, r.top - 230);
  if (!right && r.width > innerWidth * .6) { left = (innerWidth - cw) / 2; top = Math.max(16, Math.min(innerHeight - 220, r.top + 40)); }
  Object.assign(card.style, { left: left + 'px', top: top + 'px', width: cw + 'px' });
}
function tourNext() { tourI++; if (tourI >= TOUR.length) tourEnd(); else tourShow(); }
function tourEnd() { const b = $('#tour'); if (b) b.hidden = true; tourI = -1; try { localStorage.setItem('nf.v2.tour', 'done'); } catch {} }
function tourMaybe(id) {
  const scr = document.querySelector(`.screen[data-id="${id}"]`); if (!scr || !scr.classList.contains('inapp')) return;
  let seen = false; try { seen = localStorage.getItem('nf.v2.tour') === 'done'; } catch {}
  if (seen && !/[?&]tour\b/.test(location.search)) return;
  if (tourI >= 0) return;
  setTimeout(() => { tourI = 0; tourShow(); }, 400);
}
document.addEventListener('click', e => { const t = e.target.closest('[data-tour]'); if (!t) return; t.dataset.tour === 'skip' ? tourEnd() : tourNext(); });
addEventListener('resize', () => { if (tourI >= 0) tourShow(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && tourI >= 0) tourEnd(); });
const _goT = go; go = function (id) { _goT(id); tourMaybe(id); };


// ---------- Pip's column is the chat (Ethan, 11/24): talk to Pip in place, resize the column, hide it ----------
// On a computer: the bar at the bottom of Pip's column is the chat box, and the conversation lives in the column,
// under what Pip is doing (so it doubles as the activity feed). Drag the column's left edge to resize it (it snaps back
// to the usual width near it), or hide it. On a phone, the launcher still opens the chat sheet.
const DESK = () => matchMedia('(min-width: 901px)').matches;
document.querySelectorAll('.screen.inapp .pip-side').forEach(side => side.insertAdjacentHTML('beforeend', '<section class="thread" aria-label="Your chat with Pip" aria-live="polite"></section>'));
document.querySelectorAll('.screen.inapp .dock').forEach(d => d.insertAdjacentHTML('afterbegin',
  `<form class="dock-ask"><div class="composer"><span class="l-face" data-pipface-small></span><input aria-label="Tell Pip what you need" placeholder="tell Pip what you need" autocomplete="off"><button type="button" class="c-mic" aria-label="Talk to Pip" data-ri="mic"></button><button type="submit" class="c-send" aria-label="Send" hidden>↑</button></div></form>`));
document.querySelectorAll('.dock-ask [data-ri]').forEach(el => { el.innerHTML = nfIcon(el.dataset.ri, { color: 'var(--p-ink)', size: 24 }); });
paintPips();
const REPLY = { t: 'Got it. Anything that changes the plan comes back to you as a before-and-after for your OK.', why: { why: 'A change can touch the invite, the order and the forecast, so you see the before and after first.', checked: 'Nothing has changed yet.', decided: 'A rule in code: every change waits for your OK.' } };
const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
function cardHTML(m, i) {   // a change Pip proposed: a black "needs your OK" card (brand: black = needs your OK)
  const p = m.card;
  if (m.status !== 'waiting') return `<div class="msg pip pc-done">${m.status === 'approved' ? 'Approved' : 'Not now'}: ${esc(p.title)}.</div>`;
  return `<section class="needs pip-card" aria-label="Pip's change, needs your OK"><div class="needs-head"><b>needs your OK</b></div>
    <div class="ok-item"><span class="circle"></span><div><b>${esc(p.title[0].toUpperCase() + p.title.slice(1))}</b><span>${esc(p.before)} → ${esc(p.after)}${p.note ? '. ' + esc(p.note) : ''}</span></div></div>
    <div class="pc-acts"><button class="btn btn-light" data-pc-ok="${i}">approve</button><button class="ghost" data-pc-no="${i}">not now</button></div></section>`;
}
function renderThreads() {
  const html = THREAD.map((m, i) => m.card ? cardHTML(m, i) : m.me ? `<div class="msg me">${esc(m.t)}</div>` : `<div class="msg pip${m.thinking ? ' thinking' : ''}">${m.thinking ? 'thinking…' : esc(m.t)}${whyHTML(m.why)}</div>`).join('');
  document.querySelectorAll('.thread').forEach(t => { t.innerHTML = html; t.hidden = !THREAD.length; });
}
function sideToBottom() { const s = document.querySelector('.screen.on .pip-side'); if (s) s.scrollTop = s.scrollHeight; }
document.addEventListener('submit', e => {
  const f = e.target.closest('.dock-ask'); if (!f) return;
  e.preventDefault();
  const inp = f.querySelector('input'), t = inp.value.trim(); if (!t) return;
  inp.value = ''; f.querySelector('.c-send').hidden = true;
  askPip(t);
});
let asking = false;
async function askPip(t) {
  if (asking) return; asking = true;
  const history = THREAD.slice();
  THREAD.push({ me: 1, t }); const thinking = { thinking: 1 }; THREAD.push(thinking);
  renderThreads(); setTimeout(sideToBottom, 0);
  let r = { source: 'scripted' };
  try { if (window.pipBrain) r = await window.pipBrain.think(t, history); } catch (e) { r = { source: 'scripted' }; }
  THREAD.splice(THREAD.indexOf(thinking), 1);
  if (r.source === 'scripted') THREAD.push({ t: REPLY.t, why: REPLY.why });
  else {
    if (r.say) THREAD.push({ t: r.say, model: r.model });
    if (r.proposal) THREAD.push({ card: r.proposal, status: 'waiting' });
    if (!r.say && !r.proposal) THREAD.push({ t: "I didn't catch that. Try saying it another way." });
  }
  asking = false; renderThreads(); refresh(); saveRun(); setTimeout(sideToBottom, 0);
  if (r.open && r.open !== current) setTimeout(() => go(r.open), 600);
}
// approve or decline a change Pip proposed: the only way a model's idea changes anything
document.addEventListener('click', e => {
  const ok = e.target.closest('[data-pc-ok]'), no = e.target.closest('[data-pc-no]'); if (!ok && !no) return;
  const i = +((ok || no).dataset.pcOk ?? (ok || no).dataset.pcNo), msg = THREAD[i];
  if (!msg || msg.status !== 'waiting') return;
  msg.status = ok ? 'approved' : 'declined';
  if (ok && window.pipBrain) window.pipBrain.apply(msg.card);
  renderThreads(); refresh(); saveRun();
  toast(ok ? `Done: ${msg.card.title}.` : 'OK, nothing changed.');
});
document.addEventListener('input', e => { const f = e.target.closest('.dock-ask'); if (f) f.querySelector('.c-send').hidden = !e.target.value.trim(); });
// "see why" opens Pip's reasoning right there in the column
document.addEventListener('click', e => { const w = e.target.closest('.thread [data-seewhy]'); if (!w) return; e.stopImmediatePropagation(); w.nextElementSibling.classList.toggle('open'); w.textContent = w.nextElementSibling.classList.contains('open') ? 'hide why' : 'see why'; }, true);
// on a computer, Pip's face and "tell Pip" go to the column's chat box instead of a pop-up
const _openChat = openChat; openChat = function () {
  if (!DESK() || !document.querySelector('.screen.on.inapp')) return _openChat();
  setSide(true);
  const inp = document.querySelector('.screen.on .dock-ask input'); if (inp) inp.focus({ preventScroll: true });
  sideToBottom();
};

// the column's width: drag the edge, snap to the usual 340px near it, drag past ~200px (or tap hide) to hide it
const SIDE = { w: 340, open: true };
try { Object.assign(SIDE, JSON.parse(localStorage.getItem('nf.v2.side') || '{}')); } catch {}
const root = document.documentElement;
// the column keeps your chosen width, but never squeezes the page under 420px (narrow windows, the menu opened)
const railW = () => { const r = document.querySelector('.screen.on .rail'); return r ? (r.classList.contains('expanded') ? 252 : 76) : 76; };
const sideFits = () => Math.max(280, Math.min(SIDE.w, innerWidth - railW() - 420));
function applySide() { root.style.setProperty('--side-w', sideFits() + 'px'); root.classList.toggle('pip-closed', !SIDE.open);
  document.querySelectorAll('.side-toggle').forEach(b => { b.textContent = SIDE.open ? 'hide Pip' : 'show Pip'; b.setAttribute('aria-expanded', SIDE.open); }); }
function setSide(open) { SIDE.open = open; applySide(); try { localStorage.setItem('nf.v2.side', JSON.stringify(SIDE)); } catch {} }
document.querySelectorAll('.screen.inapp .app').forEach(app => { if (!app.querySelector('.pip-side')) return;
  app.insertAdjacentHTML('beforeend', '<div class="side-guide" aria-hidden="true"></div><div class="side-grip" role="separator" aria-orientation="vertical" aria-label="Drag to resize Pip\'s column" tabindex="0"><button class="side-toggle" type="button"></button></div>'); });
applySide();
addEventListener('resize', applySide);
document.addEventListener('click', e => { if (e.target.closest('[data-rail]')) applySide(); });
const _goSide = go; go = function (id) { _goSide(id); applySide(); };
(function () {
  let drag = null;
  const maxW = app => Math.max(300, Math.min(640, app.getBoundingClientRect().width - (app.querySelector('.rail')?.getBoundingClientRect().width || 0) - 420));
  document.addEventListener('pointerdown', e => {
    const g = e.target.closest('.side-grip'); if (!g || e.target.closest('.side-toggle') || !SIDE.open) return;
    drag = { app: g.closest('.app') }; g.setPointerCapture?.(e.pointerId); root.classList.add('side-dragging'); e.preventDefault();
  });
  document.addEventListener('pointermove', e => {
    if (!drag) return;
    let w = drag.app.getBoundingClientRect().right - e.clientX;
    drag.hide = w < 200;
    w = Math.max(280, Math.min(maxW(drag.app), w));
    if (Math.abs(w - 340) < 18) w = 340;          // the usual width is a soft stop
    SIDE.w = Math.round(w); applySide();
  });
  document.addEventListener('pointerup', () => {
    if (!drag) return; root.classList.remove('side-dragging');
    if (drag.hide) { SIDE.w = 340; setSide(false); } else setSide(true);
    drag = null;
  });
  document.addEventListener('dblclick', e => { if (e.target.closest('.side-grip') && !e.target.closest('.side-toggle')) { SIDE.w = 340; setSide(true); } });
  document.addEventListener('keydown', e => {
    const g = e.target.closest?.('.side-grip'); if (!g) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { SIDE.w = Math.max(280, Math.min(maxW(g.closest('.app')), SIDE.w + (e.key === 'ArrowLeft' ? 20 : -20))); setSide(true); e.preventDefault(); }
  });
  document.addEventListener('click', e => { if (e.target.closest('.side-toggle')) setSide(!SIDE.open); });
})();
// the launcher brings a hidden column back
document.addEventListener('click', e => { if (DESK() && !SIDE.open && e.target.closest('.dock .launcher')) { e.stopImmediatePropagation(); setSide(true); } }, true);

// a small happy Pip where you approve something (solo events; a stand-in for the confetti idea, inside the brand: Pips may show emotion when animated)
function pipPop(x, y) {
  if (reduce || document.querySelector('.screen.on[data-id^="org"], .screen.on[data-id="reports"], .screen.on[data-id="guests"]')) return;
  const el = document.createElement('span'); el.className = 'pip-pop'; el.setAttribute('aria-hidden', 'true');
  el.innerHTML = nfPip({ color: PIPME.color, shape: PIPME.shape, emotion: 'happy', size: 40 });
  el.style.left = x - 20 + 'px'; el.style.top = y - 44 + 'px'; document.body.append(el);
  el.animate([{ transform: 'translateY(8px) scale(.6)', opacity: 0 }, { transform: 'translateY(-10px) scale(1.05)', opacity: 1, offset: .35 }, { transform: 'translateY(-16px) scale(1)', opacity: 1, offset: .7 }, { transform: 'translateY(-22px) scale(.95)', opacity: 0 }],
    { duration: 900, easing: 'cubic-bezier(.2,.8,.3,1)' }).onfinish = () => el.remove();
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-approve], [data-vapprove], [data-vswap="ok"], #alertGo, #alertDock, [data-dasend], #payBtn, #payDock, [data-org-approve]');
  if (b && !b.disabled) pipPop(e.clientX, e.clientY);
}, true);

renderThreads();
const _saveRun = saveRun; saveRun = function () { _saveRun(); try { const r = JSON.parse(localStorage.getItem('nf.v2.run') || '{}'); if (!RESETTING) { r.THREAD = THREAD; localStorage.setItem('nf.v2.run', JSON.stringify(r)); } } catch {} };


// UI audit (11/24): every clickable thing does something
// the mic: voice comes with the real agent; for now it puts you in the text box
document.addEventListener('click', e => { const m = e.target.closest('.c-mic'); if (!m) return;
  const inp = m.closest('.composer')?.querySelector('input'); if (inp) inp.focus();
  toast('Talking to Pip comes with the real agent. Type it for now.'); });
// Luma links: in the real app they open the event on Luma
document.addEventListener('click', e => { if (e.target.closest('a.luma, #evMeta a')) toast('In the real app this opens your event on Luma.'); });
// the phone previews on party night open the guest screen they show
document.addEventListener('click', e => { const ph = e.target.closest('.gphone .gscreen'); if (!ph) return; const go2 = ph.closest('.gphone').querySelector('figcaption [data-goto]'); if (go2) go2.click(); });

go(location.hash.slice(1) || 'landing');
