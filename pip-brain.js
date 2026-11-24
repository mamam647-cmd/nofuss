// Pip's brain for prototype v2 (11/24): Pip's chat answers come from the model, Opus 5.5 (the 11/6 default).
// On Railway the page gets window.claude.use('sample') from /claude-shim.js, which calls the server's /api/messages
// (the server holds the API key, asks for the demo passcode, and caps calls). On claude.ai it's the real capability.
// Anywhere else, or with no passcode, Pip uses its scripted line, so the prototype always works.
//
// What stays in code (the harness), whatever the model says (context/decisions.md):
// - The model can only PROPOSE a change. It shows up as a black "needs your OK" card in Pip's column, and nothing
//   changes until the host approves it. Paying is never something the model can do.
// - Every proposed value is checked here (dates, times, numbers, the spending cap) before the host even sees it.
// - No guest names go to the model: it gets counts only.
(function () {
  const MODEL = 'claude-opus-5-5';
  let samplePromise = null, off = false;
  const getSample = () => samplePromise || (samplePromise = (window.claude && typeof window.claude.use === 'function')
    ? window.claude.use('sample').catch(() => null) : Promise.resolve(null));

  // ---------- what the model reads: the event as the host sees it right now (no names) ----------
  function record() {
    const r = rsvp(), [lo, hi] = fcRange(), e = evISO();
    return {
      today: labelOf(nowISO()),
      moment: { setup: 'planning, nothing sent yet', sent: 'the invite just went out', week: 'a week before', three: '3 days before', night: 'party night', after: 'the day after', done: 'the event is over' }[STK],
      event: { name: evName(), type: Q.type, when: `${labelOf(e)}, ${Q.custTime || Q.time || '7pm'}`, area: Q.area, place: EV.place || ({ free: 'a free spot', booked: 'already booked', paid: 'a paid venue', find: 'not picked yet' }[EV.venue]) },
      guests: { invited: Q.invites, saidYes: r.yes, maybe: r.maybe, no: r.no, noReply: r.none, forecast: `~${lo}–${hi} likely to come (worked out by the app's code, not you)` },
      money: { spendingCap: EV.cap, spentSoFar: spentNow(), orderTotal: orderTotal(), orderSize: EV.size, orderLines: orderLines().map(l => `${l[0]}: $${l[1]}`), venueDeposit: venueCost(), paid: OKS.paid },
      waitingForHostOK: pending().map(p => p.t),
      rainPlan: rainDone ? `set: ${RAIN[rainPick].t.toLowerCase()}` : at('three') ? 'waiting for the host' : 'not needed yet',
      howHandsOn: HANDS,
    };
  }

  function instructions() {
    return [
      'You are Pip, the planning helper inside NoFuss, an app that plans and runs events for a host. You are chatting with the host in the app.',
      'Voice: friendly, plain and short. One to three sentences. Lowercase is fine. No lists unless asked. No fake urgency, no hype, no exclamation marks.',
      '',
      'What you can do:',
      '- Answer questions using only the event record below. If something is not in it, say you don\'t know yet.',
      '- Propose a change with propose_change: the date, the start time, inviting more people, the drinks order size, or the spending cap. You never apply anything: the host sees a "needs your OK" card and nothing changes until they approve.',
      '- Point the host to a screen with open_screen when they ask about something there.',
      '- After using a tool, say in one sentence what you proposed and that it needs their OK.',
      '',
      'Rules the app enforces in code (follow them in what you say):',
      '- Nothing is sent, booked or paid without the host\'s OK. Paying always needs the host\'s own tap.',
      '- Never go over the spending cap without asking. If a change would, say so.',
      '- One reminder per guest, never between 10pm and 8am.',
      '- Guests are counts here; never ask for or guess names.',
      '- The forecast comes from the app\'s code; explain it, don\'t recalculate it.',
      '',
      'Event record (JSON):',
      JSON.stringify(record()),
    ].join('\n');
  }

  // ---------- the tools: they only prepare a proposal, checked here ----------
  const SIZES = { lean: 'lean', right: 'just right', every: 'every yes' };
  function costIf(change) {   // the order total if the change went through (nothing is changed)
    const keep = { inv: Q.invites, size: EV.size };
    if (change.kind === 'guests') Q.invites = keep.inv + change.value;
    if (change.kind === 'drinks') EV.size = change.value;
    const t = orderTotal(); Q.invites = keep.inv; EV.size = keep.size; return t;
  }
  function tools(out) {
    return [
      {
        name: 'propose_change',
        description: 'Prepare a change for the host to approve. kind "date": value YYYY-MM-DD. kind "time": value like "8pm" or "7:30pm". kind "guests": how many MORE people to invite (1-50). kind "drinks": the order size, one of lean, right, every. kind "cap": the new spending cap in dollars. Returns the before and after the host will see. Nothing changes until the host approves.',
        inputSchema: { type: 'object', properties: { kind: { type: 'string', enum: ['date', 'time', 'guests', 'drinks', 'cap'] }, value: { type: 'string' } }, required: ['kind', 'value'] },
        execute(input) {
          const kind = String(input.kind); let v = String(input.value ?? '').trim();
          if (at('night') && kind !== 'cap') throw new Error('the event is today or over; only the cap can change now');
          let before, after, title;
          if (kind === 'date') {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || isNaN(dOf(v))) throw new Error('date must be YYYY-MM-DD');
            if (v <= nowISO()) throw new Error('the new date must be after today');
            if (v > '2027-12-31') throw new Error('that date is too far out');
            before = labelOf(evISO()); after = labelOf(v); title = `move it to ${after}`;
          } else if (kind === 'time') {
            const m = v.toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/); if (!m || +m[1] < 1 || +m[1] > 12 || (m[2] && +m[2] > 59)) throw new Error('time must look like 8pm or 7:30pm');
            v = m[1] + (m[2] && m[2] !== '00' ? ':' + m[2] : '') + m[3]; before = Q.custTime || Q.time || '7pm'; after = v; title = `start at ${v}`;
          } else if (kind === 'guests') {
            const n = parseInt(v, 10); if (!(n >= 1 && n <= 50)) throw new Error('guests must be a number from 1 to 50'); v = n;
            before = `${Q.invites} invited`; after = `${Q.invites + n} invited`; title = `invite ${n} more`;
          } else if (kind === 'drinks') {
            v = v.toLowerCase().replace('just right', 'right').replace('every yes', 'every'); if (!SIZES[v]) throw new Error('drinks must be lean, right or every');
            before = SIZES[EV.size]; after = SIZES[v]; title = `make the order ${SIZES[v]}`;
          } else if (kind === 'cap') {
            const n = parseInt(v.replace(/\D/g, ''), 10); if (!(n >= 100 && n <= 5000)) throw new Error('the cap must be between $100 and $5000'); v = n;
            before = money(EV.cap); after = money(n); title = `set the cap to ${money(n)}`;
          } else throw new Error('kind must be date, time, guests, drinks or cap');
          const diff = (kind === 'guests' || kind === 'drinks') ? costIf({ kind, value: v }) - orderTotal() : 0;
          const capAfter = kind === 'cap' ? v : EV.cap, spentAfter = spentNow() + (OKS.paid ? Math.max(0, diff) : 0), planned = OKS.paid ? spentAfter : orderTotal() + diff + venueCost();
          const over = planned - capAfter;
          const p = { kind, value: v, title, before, after, cost: diff, note: (diff ? `${diff > 0 ? '+' : '−'}${money(Math.abs(diff))} on the order${OKS.paid && diff > 0 ? ', paid when you approve' : ''}. ` : '') + (over > 0 ? `That puts you ${money(over)} over your ${money(capAfter)} cap.` : '') };
          out.proposal = p;
          return { proposed: title, before, after, orderChange: diff, overCapBy: over > 0 ? over : 0, needs: 'the host\'s OK' };
        },
      },
      {
        name: 'open_screen',
        description: 'Show the host a screen: "checkout" (what needs their OK and paying), "event" (the event page), "rain_plan", "vendors", "when_pip_checks", "settings".',
        inputSchema: { type: 'object', properties: { screen: { type: 'string', enum: ['checkout', 'event', 'rain_plan', 'vendors', 'when_pip_checks', 'settings'] } }, required: ['screen'] },
        execute(input) {
          const map = { checkout: 'ok', event: 'event', rain_plan: 'alert', vendors: 'vendors', when_pip_checks: 'moments', settings: 'pipset' };
          const id = map[String(input.screen)]; if (!id) throw new Error('unknown screen');
          out.open = id; return { shown: input.screen };
        },
      },
    ];
  }

  // ---------- ask: returns { say, proposal?, open?, source } ----------
  async function think(text, history) {
    if (off) return { source: 'scripted' };
    const sample = await getSample();
    if (!sample) { off = true; return { source: 'scripted' }; }
    const turns = history.filter(m => !m.card && !m.thinking && m.t).slice(-8).map(m => ({ role: m.me ? 'user' : 'assistant', content: m.t.replace(/<[^>]+>/g, '') }));
    const input = [{ role: 'user', content: instructions() }, ...turns, { role: 'user', content: text }];
    const out = {};
    try {
      const res = await sample(input, { model: MODEL, modelTier: 'complex', cache: false, tools: tools(out) });
      return { say: (res.text || '').trim(), ...out, source: 'model', model: res.modelApplied };
    } catch (e) {
      const code = e && e.code;
      if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'tools_unavailable'].includes(code)) off = true;
      if (code === 'rate_limited') return { say: 'I\'ve hit my limit for a few minutes. Try again shortly.', source: 'limit' };
      return { source: 'scripted' };
    }
  }

  // apply an approved proposal: the only place a change happens
  function apply(p) {
    const before = orderTotal();
    if (p.kind === 'date') { Q.custDay = p.value; Q.day = null; }
    if (p.kind === 'time') { Q.custTime = p.value; Q.time = null; }
    if (p.kind === 'guests') setInvites(Q.invites + p.value);
    if (p.kind === 'drinks') EV.size = p.value;
    if (p.kind === 'cap') { EV.cap = p.value; BUDGET_TOUCHED = true; }
    const diff = orderTotal() - before;
    if (OKS.paid && diff > 0) EV.extras.push({ k: 'topup-' + Date.now(), t: 'Order top-up', v: diff });
    LOG.push([labelOf(nowISO()), `You approved Pip's change: ${p.title}.`]);
    refresh();
  }

  window.pipBrain = { think, apply, ready: async () => !!(await getSample()) };
})();
