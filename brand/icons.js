/*
  No Fuss icon set, v0.1 draft (Mari, 11/22).
  Style: flat, chunky geometric shapes on a 48 grid, after Mari's references
  (flat two-tone and block icons). No thin lines, no gradients, no shadows.

  Each icon has up to three parts:
    .p  primary   the icon's color
    .s  secondary a lighter tint of the same color (two-tone) or the same color (block)
    .c  cut-out   the surface behind the icon (white by default), for holes and marks
  Strokes (.ps / .ss / .cs) are always thick (5–6 units) with round ends.

  Usage:
    nfIcon("guests", { color: "var(--blue)", size: 32 })            // two-tone
    nfIcon("guests", { color: "var(--blue)", style: "block" })       // one color
    nfIcon("back", { ui: true })                                     // interface icon, black
*/
(function () {
  const I = {
    // ---- Parts of the event ----
    home: `<path class="p" d="M24 5 L44 21 V40 a4 4 0 0 1-4 4 H8 a4 4 0 0 1-4-4 V21 Z"/><rect class="s" x="18" y="27" width="12" height="17" rx="6"/>`,
    guests: `<circle class="s" cx="33" cy="14" r="7"/><path class="s" d="M21 42a12 12 0 0 1 24 0Z"/><circle class="p" cx="18" cy="16" r="8.5"/><path class="p" d="M3 43a15 15 0 0 1 30 0Z"/>`,
    food: `<path class="p" d="M7 5h5v13h3V5h5v13h3V5h5v16a9 9 0 0 1-7 8.8V43h-7V29.8A9 9 0 0 1 7 21Z"/><path class="s" d="M33 5c7 1 10 8 10 19h-4v19h-6Z"/>`,
    drinks: `<path class="p" d="M5 7 H43 L24 28 Z"/><rect class="p" x="21.5" y="26" width="5" height="13"/><rect class="p" x="13" y="38" width="22" height="6" rx="3"/><circle class="s" cx="33" cy="9" r="6"/>`,
    dayof: `<rect class="p" x="4" y="9" width="40" height="35" rx="7"/><path class="s" d="M4 16a7 7 0 0 1 7-7h26a7 7 0 0 1 7 7v4H4Z"/><rect class="s" x="12" y="3" width="6" height="12" rx="3"/><rect class="s" x="30" y="3" width="6" height="12" rx="3"/><rect class="c" x="12" y="27" width="9" height="9" rx="3"/>`,
    countdown: `<path class="p" d="M9 4h30v5c0 8-9 11-9 15s9 7 9 15v5H9v-5c0-8 9-11 9-15S9 17 9 9Z"/><path class="s" d="M15 41c1-5 9-9 9-9s8 4 9 9Z"/><path class="s" d="M16 10h16c-1 4-8 8-8 8s-7-4-8-8Z"/>`,
    debrief: `<path class="p" d="M8 4h22l10 10v26a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4Z"/><path class="s" d="M30 4l10 10H34a4 4 0 0 1-4-4Z"/><rect class="c" x="11" y="22" width="20" height="5" rx="2.5"/><rect class="c" x="11" y="31" width="14" height="5" rx="2.5"/>`,

    // ---- Event types ----
    cocktail: `<path class="p" d="M5 7 H43 L24 28 Z"/><rect class="p" x="21.5" y="26" width="5" height="13"/><rect class="p" x="13" y="38" width="22" height="6" rx="3"/><circle class="s" cx="33" cy="9" r="6"/>`,
    talk: `<rect class="p" x="15" y="3" width="18" height="27" rx="9"/><path class="ss" d="M9 21a15 15 0 0 0 30 0"/><rect class="s" x="21.5" y="35" width="5" height="9" rx="2.5"/>`,
    networking: `<path class="p" d="M3 10a7 7 0 0 1 7-7h18a7 7 0 0 1 7 7v9a7 7 0 0 1-7 7H14l-8 6v-7A7 7 0 0 1 3 19Z"/><path class="s" d="M19 25h19a7 7 0 0 1 7 7v7a7 7 0 0 1-3 5.7V46l-7-3H26a7 7 0 0 1-7-7Z"/>`,
    party: `<ellipse class="p" cx="21" cy="18" rx="14" ry="15"/><path class="p" d="M18 32h6l-3 5Z"/><path class="ps" d="M21 37c-3 3 3 5 0 8"/><circle class="s" cx="40" cy="9" r="4"/><circle class="s" cx="41" cy="26" r="3"/><rect class="s" x="35" y="38" width="8" height="5" rx="2.5" transform="rotate(-30 39 40)"/>`,
    dinner: `<circle class="s" cx="27.2" cy="24" r="11"/><circle class="p" cx="27.2" cy="24" r="6"/><path class="p" d="M2 5h3.2v10h1.9V5h3.2v10h1.9V5h3.2v11.5a5.4 5.4 0 0 1-3.4 5V43a2.6 2.6 0 0 1-5.2 0V21.5A5.4 5.4 0 0 1 2 16.5Z"/><path class="p" d="M41 5c4.5 1.5 6.5 7.5 6.5 16H45v22a2.4 2.4 0 0 1-4.8 0Z"/>`,   // a plate with a fork and a knife (Ethan, 11/24; Mari to confirm)

    // ---- Pip's work ----
    approve: `<circle class="p" cx="24" cy="24" r="20"/><path class="cs" d="M15 24.5l6 6 12-13"/>`,
    forecast: `<rect class="p" x="5" y="26" width="10" height="17" rx="4"/><rect class="p" x="19" y="17" width="10" height="26" rx="4"/><rect class="s" x="33" y="6" width="10" height="37" rx="4"/>`,
    weather: `<path class="p" d="M14 33a10 10 0 0 1-1.5-19.9A13 13 0 0 1 37.5 15 9 9 0 0 1 37 33Z"/><rect class="s" x="13" y="37" width="5" height="9" rx="2.5" transform="rotate(20 15.5 41.5)"/><rect class="s" x="22" y="37" width="5" height="9" rx="2.5" transform="rotate(20 24.5 41.5)"/><rect class="s" x="31" y="37" width="5" height="9" rx="2.5" transform="rotate(20 33.5 41.5)"/>`,
    location: `<path class="p" d="M24 3a16 16 0 0 1 16 16c0 12-16 26-16 26S8 31 8 19A16 16 0 0 1 24 3Z"/><circle class="c" cx="24" cy="19" r="6.5"/>`,
    invite: `<rect class="p" x="4" y="9" width="40" height="31" rx="7"/><path class="s" d="M4 16a7 7 0 0 1 7-7h26a7 7 0 0 1 7 7v1L24 31 4 17Z"/>`,
    order: `<path class="ss" d="M16 19v-5a8 8 0 0 1 16 0v5"/><path class="p" d="M7 17h34l-3 23a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4Z"/>`,
    ticket: `<path class="p" d="M4 11a3 3 0 0 1 3-3h34a3 3 0 0 1 3 3v8a5 5 0 0 0 0 10v8a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-8a5 5 0 0 0 0-10Z"/><rect class="c" x="29" y="13" width="5" height="6" rx="2.5"/><rect class="c" x="29" y="21" width="5" height="6" rx="2.5"/><rect class="c" x="29" y="29" width="5" height="6" rx="2.5"/>`,
    checkin: `<rect class="p" x="4" y="4" width="17" height="17" rx="5"/><rect class="p" x="27" y="4" width="17" height="17" rx="5"/><rect class="p" x="4" y="27" width="17" height="17" rx="5"/><rect class="c" x="10" y="10" width="5" height="5" rx="1.5"/><rect class="c" x="33" y="10" width="5" height="5" rx="1.5"/><rect class="c" x="10" y="33" width="5" height="5" rx="1.5"/><rect class="s" x="27" y="27" width="7" height="7" rx="2"/><rect class="s" x="37" y="37" width="7" height="7" rx="2"/><rect class="s" x="37" y="27" width="7" height="7" rx="2"/><rect class="s" x="27" y="37" width="7" height="7" rx="2"/>`,
    reminder: `<path class="p" d="M24 4a13 13 0 0 1 13 13v11l5 7H6l5-7V17A13 13 0 0 1 24 4Z"/><circle class="s" cx="24" cy="41" r="5"/>`,
    magic: `<path class="p" d="M22 5c2 11 6 15 17 17-11 2-15 6-17 17-2-11-6-15-17-17 11-2 15-6 17-17Z"/><path class="s" d="M39 30c1 5 3 7 7 8-4 1-6 3-7 8-1-5-3-7-8-8 5-1 7-3 8-8Z"/>`,
    why: `<circle class="p" cx="24" cy="24" r="20"/><path class="cs" d="M18.5 18.5a5.5 5.5 0 1 1 7.5 5.1c-1.4.6-2 1.5-2 3.4"/><circle class="c" cx="24" cy="34.5" r="3.2"/>`,
    connectors: `<rect class="ps" x="5" y="15" width="22" height="18" rx="9"/><rect class="ss" x="21" y="15" width="22" height="18" rx="9"/>`,
    settings: `<rect class="s" x="3" y="5" width="42" height="16" rx="8"/><circle class="p" cx="35" cy="13" r="6"/><rect class="s" x="3" y="27" width="42" height="16" rx="8"/><circle class="p" cx="13" cy="35" r="6"/>`,
    music: `<path class="p" d="M17 9 42 4v27h-6V12l-13 2.6V36h-6Z"/><circle class="p" cx="13" cy="37" r="7"/><circle class="s" cx="38" cy="32" r="6"/>`,

    // ---- Interface (always black, never colored) ----
    back: `<path class="ps" d="M29 10 15 24l14 14"/>`,
    open: `<path class="ps" d="M15 33 33 15M18 15h15v15"/>`,
    add: `<path class="ps" d="M24 10v28M10 24h28"/>`,
    search: `<circle class="ps" cx="21" cy="21" r="12"/><path class="ps" d="m30 30 10 10"/>`,
    close: `<path class="ps" d="m13 13 22 22M35 13 13 35"/>`,
    more: `<circle class="p" cx="11" cy="24" r="4"/><circle class="p" cx="24" cy="24" r="4"/><circle class="p" cx="37" cy="24" r="4"/>`,
    mic: `<rect class="p" x="16" y="4" width="16" height="25" rx="8"/><path class="ps" d="M10 22a14 14 0 0 0 28 0M24 36v7"/>`,
  };

  const GROUPS = {
    "Parts of the event": ["home", "guests", "food", "drinks", "dayof", "countdown", "debrief"],
    "Event types": ["cocktail", "talk", "networking", "party", "dinner", "music"],
    "Pip's work": ["approve", "forecast", "weather", "location", "invite", "order", "ticket", "checkin", "reminder", "magic", "why", "connectors", "settings"],
    "Interface (black only)": ["back", "open", "add", "search", "close", "more", "mic"],
  };
  const UI = new Set(GROUPS["Interface (black only)"]);

  function nfIcon(name, opts = {}) {
    const ui = opts.ui ?? (UI.has(name) && !opts.color); // interface icons are black unless a color (e.g. white on a dark surface) is given
    const color = ui ? "var(--p-ink, var(--ink))" : (opts.color || "var(--p-ink, var(--ink))");
    const second = ui ? color
      : opts.style === "block" ? color
      : (opts.second || `color-mix(in srgb, ${color} 45%, var(--p-white, #fff))`);
    const cut = opts.cut || "var(--p-white, #fff)";
    const size = opts.size || 32;
    const label = opts.label ? `role="img" aria-label="${opts.label}"` : `aria-hidden="true"`;
    return `<svg class="nf-icon" viewBox="0 0 48 48" width="${size}" height="${size}" ${label}
      style="--ic-p:${color};--ic-s:${second};--ic-c:${cut}">${I[name] || ""}</svg>`;
  }

  // Shared styles for the parts, injected once.
  const css = `.nf-icon{flex:none;overflow:visible}
    .nf-icon .p{fill:var(--ic-p)}.nf-icon .s{fill:var(--ic-s)}.nf-icon .c{fill:var(--ic-c)}
    .nf-icon .ps,.nf-icon .ss,.nf-icon .cs{fill:none;stroke-width:5.5;stroke-linecap:round;stroke-linejoin:round}
    .nf-icon .ps{stroke:var(--ic-p)}.nf-icon .ss{stroke:var(--ic-s)}.nf-icon .cs{stroke:var(--ic-c)}`;
  const st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  window.NF_ICONS = I;
  window.NF_ICON_GROUPS = GROUPS;
  window.nfIcon = nfIcon;
})();
