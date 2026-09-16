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
function fitAccent(a, isDark) {
	const page = isDark ? PAGE_DARK : PAGE_LIGHT;
	const towards = isDark ? WHITE : BLACK;
	let out = a;
	for (let i = 0; i < 40 && contrast(page, out) < 4.55; i++) {
		out = mix(out, towards, 0.07);
	}
	return out;
}

// --- derivation ------------------------------------------------------------

/**
 * @param {string} accent  hex, or falsy for the specification accent
 * @param {string} chrome  hex, or falsy for the specification chrome
 * @param {boolean} isDark whether the desk is currently in dark mode
 * @returns {Object} map of --ph-* custom property to value
 */
export function derive(accent, chrome, isDark) {
	const out = {};
	const raw = toRgb(accent);
	const a = raw ? fitAccent(raw, isDark) : null;
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
		out["--ph-primary-soft"] = toHex(isDark ? mix(a, PAGE_DARK, 0.78) : tint(a, 0.86));

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
export function audit(accent, chrome, isDark) {
	const vars = derive(accent, chrome, isDark);
	const rows = [];
	const get = (k) => toRgb(vars[k]);

	if (vars["--ph-primary"]) {
		rows.push({
			label: "Button label on accent",
			ratio: contrast(get("--ph-primary"), get("--ph-primary-contrast")),
			floor: 4.5,
		});
		rows.push({
			label: "Accent text on page",
			ratio: contrast(get("--ph-primary"), isDark ? PAGE_DARK : PAGE_LIGHT),
			floor: 4.5,
		});
		rows.push({
			label: "Row text on selected wash",
			ratio: contrast(get("--ph-primary-soft"), toRgb(isDark ? "#e8edf2" : "#16202b")),
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

	return { vars, rows, pass: rows.every((r) => r.ratio >= r.floor) };
}

/**
 * Starting points, not a cage. Each is an accent plus a chrome that suits it;
 * both fields stay editable afterwards.
 */
export const PRESETS = {
	"Phenomenon Default": { accent: "#0b5f68", chrome: "#1e2a35" },
	"Indigo": { accent: "#3b4cb8", chrome: "#1c2340" },
	"Forest": { accent: "#1f6b44", chrome: "#1b2a24" },
	"Plum": { accent: "#7a3b73", chrome: "#2a1f2e" },
	"Copper": { accent: "#9a4f1c", chrome: "#2b2119" },
	"Steel": { accent: "#2b6ca3", chrome: "#222d38" },
	"Graphite": { accent: "#4a5a6b", chrome: "#242a30" },
	"Light Chrome": { accent: "#0b5f68", chrome: "#eef1f3" },
};
