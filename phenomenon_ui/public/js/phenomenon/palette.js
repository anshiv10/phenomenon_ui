/**
 * Phenomenon UI — palette derivation.
 *
 * Takes the one or two colours a site chooses and derives the full set of
 * tokens that depend on them, so a colour change reaches every surface that
 * uses it rather than only the handful of places that name it directly.
 *
 * Why derivation rather than more colour pickers: an accent is not one colour.
 * It is a resting value, a hover value, a soft wash behind a selected row, and
 * an ink that has to stay legible on top of the solid fill. A chrome colour is
 * a ground, a hover step, a selected step, a hard edge, and two text values.
 * Asking a site to pick eleven colours by hand guarantees an unreadable
 * combination sooner or later. Asking for two and computing the rest cannot.
 *
 * Contrast is enforced, not hoped for. Text derived here is pushed away from
 * its background until it clears the WCAG floor, so "pick any colour" stays
 * true without letting anyone ship a desk their staff cannot read.
 *
 * Pure functions, no DOM. theme_engine.js applies the result.
 */

// --- colour primitives -----------------------------------------------------

export const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

export function toRgb(hex) {
	if (!HEX_RE.test(String(hex || "").trim())) return null;
	let h = String(hex).trim().slice(1);
	if (h.length === 3) h = h.split("").map((c) => c + c).join("");
	if (h.length === 8) h = h.slice(0, 6);
	return {
		r: parseInt(h.slice(0, 2), 16),
		g: parseInt(h.slice(2, 4), 16),
		b: parseInt(h.slice(4, 6), 16),
	};
}

function clamp(n, lo, hi) {
	return Math.min(hi, Math.max(lo, n));
}

function toHex(c) {
	const p = (n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
	return "#" + p(c.r) + p(c.g) + p(c.b);
}

export function luminance(c) {
	const ch = (v) => {
		v /= 255;
		return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
	};
	return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
}

export function contrast(a, b) {
	const la = luminance(a);
	const lb = luminance(b);
	return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// Linear blend. Used for every "step" in the ramps below, because mixing
// toward a neighbouring surface keeps the hue family intact where blending
// toward pure black or white would wash it out.
function mix(a, b, amount) {
	return {
		r: a.r + (b.r - a.r) * amount,
		g: a.g + (b.g - a.g) * amount,
		b: a.b + (b.b - a.b) * amount,
	};
}

const WHITE = { r: 255, g: 255, b: 255 };
const BLACK = { r: 0, g: 0, b: 0 };

function shade(c, amount) {
	return mix(c, BLACK, amount);
}

function tint(c, amount) {
	return mix(c, WHITE, amount);
}

/**
 * The ink that stays readable on a given background: whichever of light or
 * dark ink has more contrast, then pushed further until it clears the floor.
 * This is what makes "pick any colour" safe. Pick a mid-grey chrome and the
 * labels turn dark on their own; pick navy and they turn near-white.
 */
function readableInk(bg, floor, lightInk, darkInk) {
	let ink = contrast(bg, lightInk) >= contrast(bg, darkInk) ? lightInk : darkInk;
	const towards = luminance(ink) > luminance(bg) ? WHITE : BLACK;
	for (let i = 0; i < 20 && contrast(bg, ink) < floor; i++) {
		ink = mix(ink, towards, 0.1);
	}
	return ink;
}

// The page the accent has to be legible against, per mode.
const PAGE_LIGHT = { r: 247, g: 249, b: 250 }; // --ph-surface-primary
const PAGE_DARK = { r: 24, g: 33, b: 43 };

/**
 * Fit a chosen accent to the mode it is being used in.
 *
 * A brand colour is chosen against white. Used unchanged on a dark desk it is
 * usually too dark to read, and a strong light colour used unchanged on a
 * light desk is too pale. The specification solves this by carrying two
 * accents, one per mode; derivation has to do the same or "pick any colour"
 * quietly means "pick any colour and hope nobody uses dark mode".
 *
 * The hue is kept. Only lightness moves, and only as far as the 4.5:1 floor
 * against that mode's page requires. A colour that already clears it is
 * returned untouched, so a deliberate choice is never overridden for taste.
 */
function fitAccent(a, page, isDark) {
	// Direction follows the PAGE, not the mode. Light mode with a dark canvas
	// is a real combination, and darkening the accent there drove it straight
	// into the background.
	const towards = luminance(page) < 0.4 ? WHITE : BLACK;
	const darkInk = { r: 22, g: 32, b: 43 };

	// Two conditions, not one. The accent has to be readable AS text on the
	// page, and it has to be able to carry a label ON TOP of it as a solid
	// button fill. An accent stranded mid-tone satisfies the first and fails
	// the second, which is how a primary button ends up with an unreadable
	// label on a very dark or very light canvas.
	//
	// Both improve in the same direction, so one loop serves both.
	const canCarryLabel = (c) => Math.max(contrast(c, WHITE), contrast(c, darkInk)) >= 4.55;

	let out = a;
	for (let i = 0; i < 40 && (contrast(page, out) < 4.55 || !canCarryLabel(out)); i++) {
		out = mix(out, towards, 0.07);
	}
	return out;
}

// --- derivation ------------------------------------------------------------

/**
 * Derive the content ramp from one canvas colour.
 *
 * A canvas is not one token either. It sits under the page, the card, the
 * control fill, the disabled fill, three text colours and two borders. Setting
 * only the page background would leave white cards floating on a coloured
 * page, so the whole ramp moves together or none of it does.
 *
 * Direction is decided by the canvas itself. A pale canvas steps DOWN for
 * controls and UP for cards; a dark canvas does the opposite, so a card stays
 * lighter than the page rather than disappearing into it.
 *
 * Text flips on its own. Every text and border value is then checked against
 * all four surfaces, not just the page, because the worst case is usually the
 * darkest surface in a light ramp and nobody notices it until a disabled field
 * is unreadable.
 *
 * Light mode only. Dark mode already has a designed plane, and one colour
 * cannot serve both.
 */
/**
 * Move a chosen canvas only as far as legibility requires.
 *
 * A mid-tone canvas is the one case the derivation cannot rescue from the
 * outside: around the middle of the range neither light nor dark ink reaches
 * 4.5:1, so no choice of text colour saves it. Every other token can be fitted
 * to the canvas; the canvas can only be fitted to itself.
 *
 * So it is pushed toward whichever end it is already nearer, keeping its hue,
 * until it can host readable text with enough headroom left for the darker
 * surfaces derived below it. A canvas that already works is returned
 * untouched, so an ordinary choice is never altered.
 */
function fitCanvas(c) {
	const goLight = luminance(c) >= 0.4;
	const ink = goLight ? { r: 22, g: 32, b: 43 } : WHITE;
	const towards = goLight ? WHITE : BLACK;

	let out = c;
	// 6.5 rather than 4.5: the control fill and disabled fill step away from
	// the page, and they need to clear the floor too.
	for (let i = 0; i < 40 && contrast(out, ink) < 6.5; i++) {
		out = mix(out, towards, 0.06);
	}
	return out;
}

function deriveCanvas(out, chosen) {
	const canvas = fitCanvas(chosen);
	const canvasIsDark = luminance(canvas) < 0.35;

	const primaryInk = readableInk(canvas, 7, WHITE, { r: 22, g: 32, b: 43 });
	const awayFromInk = luminance(primaryInk) > luminance(canvas) ? BLACK : WHITE;

	// Each surface steps away from the page for its own reason, then is pushed
	// back until the body ink clears 4.5:1 ON IT. The step is an aesthetic
	// preference; the floor is not, so the floor wins when they disagree.
	//
	// This is the guard that fixes disabled fields. The disabled fill is the
	// darkest surface in a light ramp, so it is always the first to fail and
	// the last place anyone looks.
	const settle = (surface) => {
		let s = surface;
		for (let i = 0; i < 24 && contrast(s, primaryInk) < 4.55; i++) {
			s = mix(s, awayFromInk, 0.06);
		}
		return s;
	};

	const raised = settle(canvasIsDark ? tint(canvas, 0.1) : tint(canvas, 0.55));
	const secondary = settle(canvasIsDark ? tint(canvas, 0.05) : shade(canvas, 0.06));
	const base = settle(canvasIsDark ? shade(canvas, 0.35) : shade(canvas, 0.13));

	out["--ph-surface-primary"] = toHex(canvas);
	out["--ph-surface-raised"] = toHex(raised);
	out["--ph-surface-secondary"] = toHex(secondary);
	out["--ph-surface-base"] = toHex(base);

	const surfaces = [canvas, raised, secondary, base];

	// The surface that is hardest for a given ink is the one closest to it in
	// luminance. Enforcing against that one covers the other three.
	const hardest = (ink) =>
		surfaces.reduce((worst, s) => (contrast(s, ink) < contrast(worst, ink) ? s : worst));

	out["--ph-text-primary"] = toHex(primaryInk);

	const pullBack = (amount, floor) => {
		let ink = mix(primaryInk, canvas, amount);
		for (let i = 0; i < 20 && contrast(hardest(ink), ink) < floor; i++) {
			ink = mix(ink, primaryInk, 0.12);
		}
		return ink;
	};

	out["--ph-text-secondary"] = toHex(pullBack(0.26, 4.55));
	out["--ph-text-muted"] = toHex(pullBack(0.4, 4.55));

	// A decorative rule needs no contrast floor; a control edge does, and 3:1
	// is what makes a field findable at all.
	out["--ph-border-subtle"] = toHex(mix(canvas, primaryInk, 0.18));

	let strong = mix(canvas, primaryInk, 0.45);
	for (let i = 0; i < 20 && contrast(hardest(strong), strong) < 3.05; i++) {
		strong = mix(strong, primaryInk, 0.08);
	}
	out["--ph-border-strong"] = toHex(strong);

	return { canvas, raised, secondary, base, primaryInk };
}

/**
 * @param {string} accent  hex, or falsy for the specification accent
 * @param {string} chrome  hex, or falsy for the specification chrome
 * @param {string} canvas  hex, or falsy for the specification content plane
 * @param {boolean} isDark whether the desk is currently in dark mode
 * @returns {Object} map of --ph-* custom property to value
 */
export function derive(accent, chrome, canvas, isDark) {
	const out = {};

	// Canvas is light mode only, so in dark mode the page stays the designed
	// dark plane and everything below fits itself to that instead.
	const canvasRgb = isDark ? null : toRgb(canvas);
	const content = canvasRgb ? deriveCanvas(out, canvasRgb) : null;
	const page = content ? content.canvas : isDark ? PAGE_DARK : PAGE_LIGHT;

	const raw = toRgb(accent);
	const a = raw ? fitAccent(raw, page, isDark) : null;
	const c = toRgb(chrome);

	if (a) {
		// Dark desks lift the accent on hover; light desks deepen it. Moving
		// the wrong way makes a hover read as a disabled state.
		out["--ph-primary"] = toHex(a);
		out["--ph-primary-hover"] = toHex(isDark ? tint(a, 0.16) : shade(a, 0.18));

		// The wash behind a selected row. It has to stay far enough from the
		// page for the row to read as selected, and close enough for the row
		// text to stay legible on it, which is why it is a mix toward the
		// surface rather than a fixed opacity.
		// The wash behind a selected row mixes toward the PAGE, not toward
		// white. Mixing toward white on a coloured canvas produced a pale
		// stripe that belonged to no surface in the ramp.
		let soft = isDark ? mix(a, page, 0.78) : mix(a, page, 0.86);
		// The row's own text sits on this wash, so it is checked against it.
		const rowInk = out["--ph-text-primary"]
			? toRgb(out["--ph-text-primary"])
			: isDark
				? { r: 232, g: 237, b: 242 }
				: { r: 22, g: 32, b: 43 };
		const awaySoft = luminance(rowInk) > luminance(soft) ? BLACK : WHITE;
		for (let i = 0; i < 20 && contrast(soft, rowInk) < 4.55; i++) {
			soft = mix(soft, awaySoft, 0.06);
		}
		out["--ph-primary-soft"] = toHex(soft);

		// The label on a solid accent button.
		out["--ph-primary-contrast"] = toHex(
			readableInk(a, 4.5, WHITE, isDark ? { r: 6, g: 34, b: 42 } : { r: 22, g: 32, b: 43 })
		);
	}

	if (c) {
		const chromeIsDark = luminance(c) < 0.35;

		out["--ph-surface-chrome"] = toHex(c);
		// Hover steps away from the ground, in whichever direction has room.
		out["--ph-surface-chrome-hover"] = toHex(chromeIsDark ? tint(c, 0.09) : shade(c, 0.06));
		out["--ph-chrome-edge"] = toHex(chromeIsDark ? shade(c, 0.55) : shade(c, 0.25));

		const onChrome = readableInk(c, 7, WHITE, { r: 22, g: 32, b: 43 });
		out["--ph-text-on-chrome"] = toHex(onChrome);

		// The selected item carries the accent, so the frame and the content
		// agree about what "selected" looks like. Without the accent mixed in,
		// a selected sidebar item would be the only selected thing in the desk
		// with no accent in it at all.
		//
		// But the label sits ON this colour, and the accent can drag it toward
		// the ink: a bright accent on a dark frame, or a dark accent on a pale
		// one, both close the gap until the selected item is the one row you
		// cannot read. So the mix is a starting point, and the result is then
		// pushed away from the ink until it clears the floor. The accent is
		// kept as far as legibility allows, never further.
		let selected = a ? mix(c, a, chromeIsDark ? 0.45 : 0.22) : shade(c, 0.2);
		const away = luminance(onChrome) > luminance(selected) ? BLACK : WHITE;
		for (let i = 0; i < 24 && contrast(selected, onChrome) < 4.55; i++) {
			selected = mix(selected, away, 0.07);
		}
		out["--ph-surface-chrome-selected"] = toHex(selected);
		// Muted is the same ink pulled back toward the ground, then checked.
		// A muted value that fails is not muted, it is invisible.
		let muted = mix(onChrome, c, 0.42);
		for (let i = 0; i < 10 && contrast(c, muted) < 4.5; i++) muted = mix(muted, onChrome, 0.15);
		out["--ph-text-on-chrome-muted"] = toHex(muted);
	}

	return out;
}

/**
 * What the Settings form reports back to the person choosing. Same numbers the
 * contrast audit gates on, measured on the values they just picked.
 */
export function audit(accent, chrome, canvas, isDark) {
	const vars = derive(accent, chrome, canvas, isDark);
	const rows = [];
	const get = (k) => toRgb(vars[k]);
	const page = vars["--ph-surface-primary"]
		? get("--ph-surface-primary")
		: isDark
			? PAGE_DARK
			: PAGE_LIGHT;

	if (vars["--ph-primary"]) {
		rows.push({
			label: "Button label on accent",
			ratio: contrast(get("--ph-primary"), get("--ph-primary-contrast")),
			floor: 4.5,
		});
		rows.push({
			label: "Accent text on page",
			ratio: contrast(get("--ph-primary"), page),
			floor: 4.5,
		});
		rows.push({
			label: "Row text on selected wash",
			ratio: contrast(
				get("--ph-primary-soft"),
				vars["--ph-text-primary"] ? get("--ph-text-primary") : toRgb(isDark ? "#e8edf2" : "#16202b")
			),
			floor: 4.5,
		});
	}

	if (vars["--ph-surface-chrome"]) {
		rows.push({
			label: "Sidebar label on chrome",
			ratio: contrast(get("--ph-surface-chrome"), get("--ph-text-on-chrome")),
			floor: 4.5,
		});
		rows.push({
			label: "Muted chrome text",
			ratio: contrast(get("--ph-surface-chrome"), get("--ph-text-on-chrome-muted")),
			floor: 4.5,
		});
		rows.push({
			label: "Selected item label",
			ratio: contrast(get("--ph-surface-chrome-selected"), get("--ph-text-on-chrome")),
			floor: 4.5,
		});
		rows.push({
			label: "Chrome hover step",
			ratio: contrast(get("--ph-surface-chrome"), get("--ph-surface-chrome-hover")),
			floor: 1.1,
		});
	}

	if (vars["--ph-surface-primary"]) {
		const ink = get("--ph-text-primary");
		[
			["Body text on page", "--ph-surface-primary", ink, 4.5],
			["Body text on card", "--ph-surface-raised", ink, 4.5],
			["Body text on control fill", "--ph-surface-secondary", ink, 4.5],
			["Body text on disabled fill", "--ph-surface-base", ink, 4.5],
			["Secondary text on page", "--ph-surface-primary", get("--ph-text-secondary"), 4.5],
			["Muted text on page", "--ph-surface-primary", get("--ph-text-muted"), 4.5],
			["Muted text on disabled fill", "--ph-surface-base", get("--ph-text-muted"), 4.5],
			["Control edge on page", "--ph-surface-primary", get("--ph-border-strong"), 3.0],
			["Control edge on control fill", "--ph-surface-secondary", get("--ph-border-strong"), 3.0],
		].forEach(([label, surface, fg, floor]) => {
			rows.push({ label, ratio: contrast(get(surface), fg), floor });
		});

		// Status pills carry their own fill, so they are checked against it
		// rather than against the canvas.
		[
			["Success pill", "#dff0e5", "#0f7a43"],
			["Warning pill", "#f7ebd2", "#8a5a00"],
			["Danger pill", "#f8e3e1", "#b3261e"],
			["Info pill", "#e1ecf8", "#1b5fa8"],
		].forEach(([label, bg, fg]) => {
			rows.push({ label, ratio: contrast(toRgb(bg), toRgb(fg)), floor: 4.5 });
		});
	}

	return { vars, rows, pass: rows.every((r) => r.ratio >= r.floor) };
}

// The standard palettes are NOT here. They live as Phenomenon UI Palette
// records, seeded by phenomenon_ui/install.py, so a site can add its own
// without editing the app and there is only one copy of the list.
