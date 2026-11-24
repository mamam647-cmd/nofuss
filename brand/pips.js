/*
  Pip characters and emotions, v0.1 draft (Mari, 11/22).

  Rules (Mari):
  - Standard Pips have two dot eyes at a standard size. Nothing else.
  - Emotions are only for animated moments. Then eyes may get white surfaces,
    change size, and Pips may get eyebrows and a blush. Never a mouth.
  - Happy: smaller eyes, set closer together.
  - Blush comes from the color's own shade range.
  - Butter Pips only sit on a dark disc, never on white.

  Usage:
    nfPip({ color: "yellow" })                      // standard Pip
    nfPip({ color: "blue", emotion: "curious" })    // emotion
    nfPip({ color: "pink", emotion: "happy", blush: "pink" })
    nfPip({ color: "blue", shape: "circle" })        // any shape in any color (Mari 11/23: hosts pick color, then shape)
*/
(function () {
  // Each color has its own shape (from the reference), and where its eyes sit.
  const SHAPES = {
    yellow:   { d: '<circle cx="60" cy="62" r="46"/>', ey: 60 },
    burgundy: { d: '<path d="M14 100V60a46 46 0 0 1 92 0v40a8 8 0 0 1-8 8H22a8 8 0 0 1-8-8Z"/>', ey: 62 },
    blue:     { d: '<rect x="22" y="12" width="76" height="98" rx="38"/>', ey: 56 },
    pink:     { d: '<rect x="14" y="22" width="92" height="86" rx="26"/>', ey: 62 },
    olive:    { d: '<path d="M8 100a52 52 0 0 1 104 0v2a6 6 0 0 1-6 6H14a6 6 0 0 1-6-6Z"/>', ey: 80 },
    orange:   { d: '<path d="M14 100V62a46 46 0 0 1 92 0v38a8 8 0 0 1-8 8H22a8 8 0 0 1-8-8Z"/>', ey: 64 },
    butter:   { d: '<rect x="14" y="22" width="92" height="86" rx="26"/>', ey: 62 },
  };
  // Shapes by name, so a host can pick a shape separately from the color (Mari 11/23).
  // Each color still has its default shape above.
  const SHAPE_NAMES = { circle: "yellow", arch: "burgundy", pill: "blue", square: "pink", dome: "olive" };
  const DARK = new Set(["burgundy", "blue"]); // white dot eyes on these
  const v = c => `var(--p-${c})`;
  const INK = "var(--p-ink)", WHITE = "var(--p-white)";

  const EMOTIONS = {
    standard:   { label: "Standard", note: "Dots only, standard size" },
    happy:      { label: "Happy", note: "Joyful, excited", blush: true },
    sad:        { label: "Sad", note: "Downcast, gloomy" },
    confused:   { label: "Confused", note: "Unsure, puzzled" },
    curious:    { label: "Curious", note: "Intrigued, attentive" },
    tired:      { label: "Tired", note: "Sleepy, drained" },
    frustrated: { label: "Frustrated", note: "Stuck, annoyed", blush: true },
    proud:      { label: "Proud", note: "Confident, a cool wink", blush: 0.35 }, // just a hint of blush
  };

  const line = (d, col, w = 5) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

  function eyes(emotion, color, y) {
    const dot = DARK.has(color) ? WHITE : INK;
    const L = 46, R = 74; // standard eye positions
    switch (emotion) {
      case "happy": { // smaller, closer
        const l = 50, r = 70;
        return line(`M${l - 6} ${y + 2}q6-8 12 0`, dot, 5) + line(`M${r - 6} ${y + 2}q6-8 12 0`, dot, 5);
      }
      case "sad": { // round eyes looking down, worried brows (inner ends up), one small tear
        const ty = y + 13, tx = R + 5;
        return `<circle cx="${L}" cy="${y + 4}" r="5.5" fill="${dot}"/><circle cx="${R}" cy="${y + 4}" r="5.5" fill="${dot}"/>`
          + line(`M${L - 9} ${y - 3}L${L + 5} ${y - 11}`, dot, 4.5) + line(`M${R - 5} ${y - 11}L${R + 9} ${y - 3}`, dot, 4.5)
          + `<path d="M${tx} ${ty}c2.5 4 4.5 6.5 4.5 8.5a4.5 4.5 0 0 1-9 0c0-2 2-4.5 4.5-8.5Z" fill="color-mix(in srgb, ${WHITE} 80%, var(--p-blue))"/>`;
      }
      case "confused":
        return `<circle cx="${L}" cy="${y + 1}" r="9" fill="${WHITE}"/><circle cx="${L + 2}" cy="${y + 2}" r="4.5" fill="${INK}"/>`
          + `<circle cx="${R}" cy="${y - 1}" r="7" fill="${WHITE}"/><circle cx="${R + 2}" cy="${y - 3}" r="4" fill="${INK}"/>`
          + line(`M${R - 6} ${y - 14}q6-5 12-1`, dot, 4);
      case "curious": { // bigger eyes, set closer, with a twinkle
        const l = 48, r = 72;
        const eye = x => `<circle cx="${x}" cy="${y}" r="11.5" fill="${WHITE}"/><circle cx="${x + 1.5}" cy="${y - 1}" r="7.5" fill="${INK}"/>`
          + `<circle cx="${x + 4}" cy="${y - 4}" r="2.6" fill="${WHITE}"/><circle cx="${x - 1}" cy="${y + 2.5}" r="1.2" fill="${WHITE}"/>`;
        return eye(l) + eye(r);
      }
      case "tired":
        return line(`M${L - 6} ${y}h12`, dot, 4.5) + line(`M${R - 6} ${y}h12`, dot, 4.5);
      case "frustrated":
        return line(`M${L - 5} ${y - 6}l9 6-9 6`, dot, 4.5) + line(`M${R + 5} ${y - 6}l-9 6 9 6`, dot, 4.5);
      case "proud": // a cute wink (Mari's reference): one eye a stretched ">" with a long top stroke,
                    // the other a big white eye with a big pupil. No brows.
        return line(`M${L - 9} ${y - 5}L${L + 6} ${y + 1}L${L - 4} ${y + 6}`, dot, 4.5)
          + `<circle cx="${R}" cy="${y}" r="11" fill="${WHITE}"/><circle cx="${R - 1}" cy="${y + 1}" r="7.5" fill="${INK}"/>`;
      default: // standard: dots
        return `<circle cx="${L}" cy="${y}" r="5.5" fill="${dot}"/><circle cx="${R}" cy="${y}" r="5.5" fill="${dot}"/>`;
    }
  }

  // Little marks around the Pip: in the Pip's own darker shade (a sparkle is yellow).
  function marks(emotion, color) {
    const shade = `color-mix(in srgb, ${v(color)} 70%, ${INK})`;
    const lines3 = (x, y) => line(`M${x} ${y + 12}l-7-5`, shade, 4) + line(`M${x + 6} ${y + 6}l-3-8`, shade, 4) + line(`M${x + 14} ${y + 4}l1-8`, shade, 4);
    switch (emotion) {
      case "happy": return lines3(10, 4);
      case "curious": return lines3(10, 8);
      case "frustrated": return lines3(96, 4).replace(/l-7-5/, "l7-5");
      case "confused": return `<text x="100" y="26" font-family="DM Sans, sans-serif" font-weight="800" font-size="24" fill="${shade}">?</text>`;
      case "proud": return `<path d="M104 4c1.5 7 4 9.5 11 11-7 1.5-9.5 4-11 11-1.5-7-4-9.5-11-11 7-1.5 9.5-4 11-11Z" fill="var(--p-yellow)" stroke="color-mix(in srgb, var(--p-yellow) 70%, ${INK})" stroke-width="1.5"/>`;
      default: return "";
    }
  }

  let uid = 0;
  function nfPip({ color = "yellow", emotion = "standard", size = 96, blush = "shade", shape } = {}) {
    const s = (shape && SHAPES[SHAPE_NAMES[shape]]) || SHAPES[color] || SHAPES.yellow;
    const e = EMOTIONS[emotion] || EMOTIONS.standard;
    const id = `pb${++uid}`;
    // Blush from the color's own range: darker on light Pips, lighter on dark ones (or the pink option).
    const blushCol = blush === "pink" ? `color-mix(in srgb, var(--p-pink) 65%, ${v(color)})`
      : DARK.has(color) ? `color-mix(in srgb, ${v(color)} 45%, ${WHITE})`
      : `color-mix(in srgb, ${v(color)} 72%, var(--p-burgundy))`;
    const bo = typeof e.blush === "number" ? e.blush : 0.85; // blush strength per emotion
    const blushSvg = e.blush
      ? `<ellipse cx="34" cy="${s.ey + 12}" rx="10" ry="6" fill="${blushCol}" filter="url(#${id})" opacity="${bo}"/><ellipse cx="86" cy="${s.ey + 12}" rx="10" ry="6" fill="${blushCol}" filter="url(#${id})" opacity="${bo}"/>`
      : "";
    return `<svg viewBox="0 0 120 120" width="${size}" height="${size}" role="img" aria-label="${color} Pip, ${e.label.toLowerCase()}" style="overflow:visible">
      <defs><filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
        <clipPath id="c${id}">${s.d}</clipPath></defs>
      <g fill="${v(color)}">${s.d}</g>
      <g clip-path="url(#c${id})">${blushSvg}</g>
      ${eyes(emotion, color, s.ey)}
      ${marks(emotion, color)}
    </svg>`;
  }

  window.NF_PIP_SHAPES = Object.keys(SHAPES);
  window.NF_PIP_SHAPE_NAMES = Object.keys(SHAPE_NAMES);
  window.NF_PIP_EMOTIONS = EMOTIONS;
  window.nfPip = nfPip;
})();
