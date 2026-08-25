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

const ROOT_FLAG = "data-ph";
const STYLE_ID = "phenomenon-custom-css";

const DEFAULTS = {
	enabled: 1,
	theme_preset: "Default",
	accent_color: "",
	density: "Comfortable",
	corner_radius: "Medium",
	sidebar_style: "Standard",
	navbar_style: "Standard",
	custom_css: "",
};

const ALLOWED = {
	theme_preset: ["default", "clinical"],
	density: ["compact", "comfortable", "spacious"],
	corner_radius: ["sharp", "small", "medium", "large"],
	sidebar_style: ["standard", "flat", "floating"],
	navbar_style: ["standard", "flat", "elevated", "contrast"],
};

// #abc, #aabbcc, #aabbccdd — anything else is ignored rather than written into
// an inline style, so a malformed value cannot inject a declaration.
const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

function normalise(raw) {
	const settings = Object.assign({}, DEFAULTS, raw || {});
	const clean = { enabled: settings.enabled ? 1 : 0 };

	for (const [key, options] of Object.entries(ALLOWED)) {
		const value = String(settings[key] || "").toLowerCase();
		clean[key] = options.indexOf(value) !== -1 ? value : String(DEFAULTS[key]).toLowerCase();
	}

	const accent = String(settings.accent_color || "").trim();
	clean.accent_color = HEX_RE.test(accent) ? accent : "";
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
		html.removeAttribute("data-ph-preset");
		html.removeAttribute("data-ph-density");
		html.removeAttribute("data-ph-radius");
		html.removeAttribute("data-ph-sidebar");
		html.removeAttribute("data-ph-navbar");
		html.style.removeProperty("--ph-primary");
		removeCustomCSS();
		return;
	}

	html.setAttribute(ROOT_FLAG, "on");
	html.setAttribute("data-ph-preset", s.theme_preset);
	html.setAttribute("data-ph-density", s.density);
	html.setAttribute("data-ph-radius", s.corner_radius);
	html.setAttribute("data-ph-sidebar", s.sidebar_style);
	html.setAttribute("data-ph-navbar", s.navbar_style);

	if (s.accent_color) {
		html.style.setProperty("--ph-primary", s.accent_color);
	} else {
		html.style.removeProperty("--ph-primary");
	}

	injectCustomCSS(s.custom_css);
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

window.phenomenon = { apply, refresh, defaults: DEFAULTS };

export { apply, refresh };
