/**
 * Phenomenon UI — theme engine.
 *
 * Responsibility: read settings off `frappe.boot.phenomenon_ui` and write them
 * onto <html> as data attributes. That is all. It does not patch, wrap, extend
 * or observe any Frappe component — every visual decision lives in SCSS keyed
 * off those attributes, so an upgrade to Frappe can never break this file.
 *
 * Console API: window.phenomenon.apply(settings) / window.phenomenon.refresh()
 */

import { derive, HEX_RE } from "./palette.js";

const ROOT_FLAG = "data-ph";
const STYLE_ID = "phenomenon-custom-css";

// Frappe owns the data-theme attribute. We only write it when a site has
// explicitly asked us to force an appearance, and we record whatever was there
// first so that disabling the theme puts it back exactly as found.
const ORIGINAL_THEME = (function () {
	try {
		return document.documentElement.getAttribute("data-theme");
	} catch (e) {
		return null;
	}
})();

const DEFAULTS = {
	enabled: 1,
	appearance: "Follow User Preference",
	accent_color: "",
	chrome_color: "",
	canvas_color: "",
	density: "Comfortable",
	custom_css: "",
};

const APPEARANCE = {
	"follow user preference": null,
	"always light": "light",
	"always dark": "dark",
};

// Radius, navbar and sidebar are NOT settings: the spec fixes them because
// each encodes meaning (distance from the page; the chrome frame). The one
// deviation offered is light chrome, for a client who rejects a dark frame.
const ALLOWED = {
	density: ["compact", "comfortable", "spacious"],
};

// Every custom property this engine may write. Listed once so that clearing
// them is exhaustive: a token left behind after a colour is cleared is the
// kind of residue that makes "reset to default" a lie.
const DERIVED_VARS = [
	"--ph-surface-primary",
	"--ph-surface-secondary",
	"--ph-surface-raised",
	"--ph-surface-base",
	"--ph-text-primary",
	"--ph-text-secondary",
	"--ph-text-muted",
	"--ph-border-subtle",
	"--ph-border-strong",
	"--ph-primary",
	"--ph-primary-hover",
	"--ph-primary-soft",
	"--ph-primary-contrast",
	"--ph-button-tint",
	"--ph-button-tint-hover",
	"--ph-button-tint-ink",
	"--ph-surface-chrome",
	"--ph-surface-chrome-hover",
	"--ph-surface-chrome-selected",
	"--ph-chrome-edge",
	"--ph-text-on-chrome",
	"--ph-text-on-chrome-muted",
];

function normalise(raw) {
	const settings = Object.assign({}, DEFAULTS, raw || {});
	const clean = { enabled: settings.enabled ? 1 : 0 };

	for (const [key, options] of Object.entries(ALLOWED)) {
		const value = String(settings[key] || "").toLowerCase();
		clean[key] = options.indexOf(value) !== -1 ? value : String(DEFAULTS[key]).toLowerCase();
	}

	const appearance = String(settings.appearance || "").toLowerCase();
	clean.forced_theme = Object.prototype.hasOwnProperty.call(APPEARANCE, appearance)
		? APPEARANCE[appearance]
		: null;

	const accent = String(settings.accent_color || "").trim();
	clean.accent_color = HEX_RE.test(accent) ? accent : "";
	const chromeColor = String(settings.chrome_color || "").trim();
	clean.chrome_color = HEX_RE.test(chromeColor) ? chromeColor : "";
	const canvasColor = String(settings.canvas_color || "").trim();
	clean.canvas_color = HEX_RE.test(canvasColor) ? canvasColor : "";
	clean.custom_css = typeof settings.custom_css === "string" ? settings.custom_css : "";

	return clean;
}

function apply(raw) {
	const html = document.documentElement;
	if (!html) return;

	const s = normalise(raw);

	if (!s.enabled) {
		// Full rollback. Every Phenomenon rule is scoped under html[data-ph="on"],
		// so removing this one attribute returns the desk to stock appearance.
		html.removeAttribute(ROOT_FLAG);
		html.removeAttribute("data-ph-density");
		html.removeAttribute("data-ph-chrome");
		// Attributes written by pre-0.3 builds, stripped so an upgrade leaves
		// no residue either.
		html.removeAttribute("data-ph-preset");
		html.removeAttribute("data-ph-radius");
		html.removeAttribute("data-ph-sidebar");
		html.removeAttribute("data-ph-navbar");
		clearDerived();
		restoreTheme();
		removeCustomCSS();
		return;
	}

	// Forcing an appearance overrides each user's own light/dark choice, which
	// is why "Follow User Preference" is the default and the only mode that
	// leaves data-theme alone.
	if (s.forced_theme) {
		html.setAttribute("data-theme", s.forced_theme);
	} else {
		restoreTheme();
	}

	html.setAttribute(ROOT_FLAG, "on");
	html.setAttribute("data-ph-density", s.density);
	// data-ph-chrome is deliberately removed rather than set. See the note in
	// tokens/_scope.scss: a CSS attribute selector cannot beat the inline
	// custom properties this engine writes, so the old Dark/Light switch did
	// nothing once a chrome colour existed. Chrome Colour replaced it.
	html.removeAttribute("data-ph-chrome");
	html.removeAttribute("data-ph-preset");
	html.removeAttribute("data-ph-radius");
	html.removeAttribute("data-ph-sidebar");
	html.removeAttribute("data-ph-navbar");

	paintPalette(s);
	injectCustomCSS(s.custom_css);
}

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------
//
// A site picks one or two colours; palette.js derives the ten tokens that
// depend on them and this writes the result inline on <html>, above the
// stylesheet's own declarations.
//
// Inline rather than a generated stylesheet because it is the only way the
// values can change with the mode without a round trip: dark mode needs a
// different accent to stay legible against a dark page, and the mode can
// change at any moment from Frappe's own switcher.
//
// Setting nothing is the correct outcome when nothing is chosen. The
// specification palette lives in SCSS, and an engine that wrote it back out
// inline would make every future palette change a two-file edit.

let LAST_SETTINGS = null;

function isDarkNow() {
	return document.documentElement.getAttribute("data-theme") === "dark";
}

function clearDerived() {
	const html = document.documentElement;
	DERIVED_VARS.forEach((v) => html.style.removeProperty(v));
}

function paintPalette(s) {
	const html = document.documentElement;
	LAST_SETTINGS = s;

	if (!s.accent_color && !s.chrome_color && !s.canvas_color) {
		clearDerived();
		return;
	}

	const vars = derive(s.accent_color, s.chrome_color, s.canvas_color, isDarkNow());
	clearDerived();
	Object.keys(vars).forEach((k) => html.style.setProperty(k, vars[k]));
}

// The mode can change without a reload, and the derived palette depends on it.
// This observes one attribute on <html> that this app already reads, not any
// Frappe component, so it cannot break when a component is rewritten.
if (typeof MutationObserver !== "undefined") {
	new MutationObserver(() => {
		if (LAST_SETTINGS && LAST_SETTINGS.enabled) paintPalette(LAST_SETTINGS);
	}).observe(document.documentElement, {
		attributes: true,
		attributeFilter: ["data-theme"],
	});
}

// Put data-theme back exactly as it was found at load — including absent, if
// that is how we found it. Anything less is residue.
function restoreTheme() {
	const html = document.documentElement;
	if (ORIGINAL_THEME === null) {
		html.removeAttribute("data-theme");
	} else if (html.getAttribute("data-theme") !== ORIGINAL_THEME) {
		html.setAttribute("data-theme", ORIGINAL_THEME);
	}
}

function injectCustomCSS(css) {
	if (!css) return removeCustomCSS();

	let tag = document.getElementById(STYLE_ID);
	if (!tag) {
		tag = document.createElement("style");
		tag.id = STYLE_ID;
		tag.setAttribute("type", "text/css");
		document.head.appendChild(tag);
	}
	// Idempotent: re-applying the same CSS must not churn the DOM.
	if (tag.textContent !== css) tag.textContent = css;
}

function removeCustomCSS() {
	const tag = document.getElementById(STYLE_ID);
	if (tag && tag.parentNode) tag.parentNode.removeChild(tag);
}

function readBoot() {
	try {
		if (window.frappe && frappe.boot && frappe.boot.phenomenon_ui) {
			return frappe.boot.phenomenon_ui;
		}
	} catch (e) {
		// fall through to defaults
	}
	return DEFAULTS;
}

function refresh() {
	apply(readBoot());
}

// Paint as early as possible. This bundle is loaded in <head> via
// app_include_js, so <html> already exists even though <body> may not — which
// is exactly why every attribute goes on the documentElement.
refresh();

if (window.frappe && frappe.router && frappe.router.on) {
	// Route changes never re-boot, but a Settings save followed by a soft
	// reload does — cheap enough to re-assert, and it keeps the DOM truthful
	// if anything else stripped an attribute.
	frappe.router.on("change", () => refresh());
}

// Diagnostics deliberately do NOT live here. They are support tooling used on
// exactly one form, and this bundle loads on every desk page — shipping ~7 KB
// of probes to every page load to serve an occasional button is the wrong
// trade. They live in the Phenomenon UI Settings form script instead.
window.phenomenon = { apply, refresh, defaults: DEFAULTS };

export { apply, refresh };
