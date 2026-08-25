// Phenomenon UI Settings — the control surface.
//
// Two jobs beyond the stock form:
//
// 1. Live preview. Every appearance field re-themes the desk as you change it,
//    before you save. Picking a theme from a dropdown and reloading to find out
//    what it looks like is a bad loop; this makes it immediate, and Reload
//    Saved puts it back.
//
// 2. Diagnostics. "Is the theme actually loaded?" and "does the class I styled
//    exist in this build?" are the two hardest things to establish about a
//    theme, and both are answerable from the live DOM. The app should answer
//    for itself rather than asking anyone to paste console commands.

const PREVIEW_FIELDS = [
	"enabled",
	"theme_preset",
	"appearance",
	"accent_color",
	"density",
	"corner_radius",
	"sidebar_style",
	"navbar_style",
	"custom_css",
];

function settings_from_form(frm) {
	return {
		enabled: frm.doc.enabled ? 1 : 0,
		theme_preset: frm.doc.theme_preset,
		appearance: frm.doc.appearance,
		accent_color: frm.doc.accent_color || "",
		density: frm.doc.density,
		corner_radius: frm.doc.corner_radius,
		sidebar_style: frm.doc.sidebar_style,
		navbar_style: frm.doc.navbar_style,
		custom_css: frm.doc.custom_css || "",
	};
}

function preview(frm) {
	if (!window.phenomenon) return;
	window.phenomenon.apply(settings_from_form(frm));
}

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------
// These live here rather than in the shipped bundle on purpose: they are
// support tooling used on exactly one form, and the bundle loads on every desk
// page. This file loads only when this form is open, so the probes cost
// nothing to everyone else.
//
// Read-only throughout. It measures; it changes nothing.

// Frappe variables the mapping layer re-points. "(not defined)" in the report
// means the variable does not exist in this build and the mapping is dead
// weight — an honest answer that source-grepping alone cannot give you.
const PROBE_VARS = [
	"--bg-color", "--fg-color", "--card-bg", "--control-bg", "--text-color",
	"--text-muted", "--border-color", "--primary", "--primary-color",
	"--navbar-bg", "--modal-bg", "--border-radius", "--shadow-base",
	"--padding-md", "--navbar-height",
];

// Every class this theme styles. Count 0 means the rule can never match.
const PROBE_SELECTORS = [
	".navbar", ".standard-sidebar-item", ".standard-sidebar-item.selected",
	".standard-sidebar-label", ".layout-side-section", ".list-row-container",
	".list-row-head", ".list-row", ".list-subject", ".page-head", ".form-page",
	".form-section", ".section-head", ".form-tabs-list", ".widget",
	".widget-head", ".number-card", ".modal-content", ".grid-heading-row",
	".grid-row", ".dt-row--header", ".dt-cell", ".indicator-pill",
	".form-control", ".control-label", ".btn-primary", ".awesomplete",
];

function build_report() {
	const html = document.documentElement;
	const cs = getComputedStyle(html);
	const L = [];
	const rule = "-".repeat(58);
	const get = (v) => cs.getPropertyValue(v).trim();

	L.push("PHENOMENON UI — DIAGNOSTIC REPORT");
	L.push(rule);
	L.push("Theme attribute present : " + (html.getAttribute("data-ph") === "on" ? "YES" : "NO"));
	// The decisive one: if --ph-primary resolves, the CSS bundle compiled and
	// loaded, whatever else is or is not happening.
	L.push("Stylesheet loaded       : " + (get("--ph-primary") ? "YES" : "NO — assets not built"));
	L.push("Theme engine loaded     : " + (window.phenomenon ? "YES" : "NO — JS bundle missing"));
	L.push("Boot data present       : " + (frappe.boot && frappe.boot.phenomenon_ui ? "YES" : "NO"));
	L.push("--ph-primary            : " + (get("--ph-primary") || "(not set)"));
	L.push("--ph-surface            : " + (get("--ph-surface") || "(not set)"));

	L.push("");
	L.push("APP VERSION");
	try {
		const v = (frappe.boot && frappe.boot.versions) || {};
		Object.keys(v).forEach((k) => L.push("  " + k + ": " + v[k]));
	} catch (e) {
		L.push("  (unavailable)");
	}

	L.push("");
	L.push("BOOT SETTINGS");
	try {
		const b = (frappe.boot && frappe.boot.phenomenon_ui) || {};
		Object.keys(b).forEach((k) => {
			if (k !== "custom_css") L.push("  " + k + ": " + b[k]);
		});
	} catch (e) {
		L.push("  (unavailable)");
	}

	L.push("");
	L.push("<html> ATTRIBUTES");
	["data-ph", "data-ph-preset", "data-ph-density", "data-ph-radius",
		"data-ph-sidebar", "data-ph-navbar", "data-theme"].forEach((a) => {
		L.push("  " + a + " = " + html.getAttribute(a));
	});

	L.push("");
	L.push("DARK MODE MECHANISM (which one is non-empty decides $ph-dark)");
	L.push("  html[data-theme]  = " + html.getAttribute("data-theme"));
	L.push("  body[data-theme]  = " + (document.body ? document.body.getAttribute("data-theme") : null));
	L.push("  html class        = " + (html.className || "(none)"));
	L.push("  body class        = " + (document.body ? document.body.className || "(none)" : "(none)"));
	L.push("  OS prefers dark   = " + (window.matchMedia
		? window.matchMedia("(prefers-color-scheme: dark)").matches : "(unknown)"));

	L.push("");
	L.push("FRAPPE VARIABLES ((not defined) = that mapping is dead weight)");
	PROBE_VARS.forEach((v) => L.push("  " + v + ": " + (get(v) || "(not defined)")));

	const found = [];
	const missing = [];
	PROBE_SELECTORS.forEach((sel) => {
		let n = 0;
		try {
			n = document.querySelectorAll(sel).length;
		} catch (e) {
			n = -1;
		}
		(n > 0 ? found : missing).push("  " + sel + (n > 0 ? "  x" + n : ""));
	});

	L.push("");
	L.push("SELECTORS PRESENT ON THIS PAGE");
	L.push(found.length ? found.join("\n") : "  (none)");
	L.push("");
	L.push("SELECTORS NOT ON THIS PAGE");
	L.push("  (expected for surfaces this page does not render — re-run from a");
	L.push("   list view, a form and a workspace to cover them all)");
	L.push(missing.join("\n"));
	L.push(rule);

	return L.join("\n");
}

function show_diagnostics() {
	const text = build_report();
	const d = new frappe.ui.Dialog({
		title: __("Phenomenon UI Diagnostics"),
		size: "large",
		fields: [
			{
				fieldtype: "HTML",
				fieldname: "intro",
				options: `<p class="text-muted small">${__(
					"Read-only. Run this from a list view, a form and a workspace to cover every surface — a selector only shows as present if the page you are on actually renders it."
				)}</p>`,
			},
			{
				fieldtype: "Code",
				fieldname: "report",
				label: __("Report"),
				options: "Text",
				read_only: 1,
				default: text,
			},
		],
		primary_action_label: __("Copy to Clipboard"),
		primary_action() {
			frappe.utils.copy_to_clipboard(text);
			d.hide();
		},
	});
	d.show();
}

frappe.ui.form.on("Phenomenon UI Settings", {
	refresh(frm) {
		frm.add_custom_button(__("Run Diagnostics"), show_diagnostics);

		frm.add_custom_button(__("Reload Saved"), () => {
			window.phenomenon && window.phenomenon.refresh();
			frappe.show_alert({ message: __("Preview reset to saved settings."), indicator: "blue" });
		});

		frm.dashboard.clear_comment();
		frm.dashboard.add_comment(
			__(
				"Appearance changes preview immediately as you edit. <b>Save</b> to apply them for everyone; other users pick them up on their next reload."
			),
			"blue",
			true
		);
	},

	// Live preview: one handler per appearance field.
	...Object.fromEntries(PREVIEW_FIELDS.map((f) => [f, preview])),

	after_save(frm) {
		// Re-assert from the form rather than from frappe.boot, which is still
		// the pre-save copy until the cache clear propagates.
		preview(frm);
	},
});
