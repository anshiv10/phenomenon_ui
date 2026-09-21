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
	"appearance",
	"palette_preset",
	"accent_color",
	"chrome_color",
	"canvas_color",
	"density",
	"custom_css",
];

// Palettes are records (Phenomenon UI Palette), not a list in this file.
//
// The earlier version kept the eight presets here as a constant and mirrored
// them in palette.js. Two copies of the same table is one copy too many, and
// it also meant a site could not add a ninth without editing the app. As
// records, "create your own" is the Link field's own Create action and needs
// no code at all.

function settings_from_form(frm) {
	return {
		enabled: frm.doc.enabled ? 1 : 0,
		appearance: frm.doc.appearance,
		accent_color: frm.doc.accent_color || "",
		chrome_color: frm.doc.chrome_color || "",
		canvas_color: frm.doc.canvas_color || "",
		density: frm.doc.density,
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
	"--bg-color", "--fg-color", "--card-bg", "--control-bg", "--control-bg-on-gray",
	"--disabled-control-bg", "--text-color", "--text-muted", "--text-light",
	"--border-color", "--dark-border-color", "--primary", "--primary-color",
	"--navbar-bg", "--modal-bg", "--sidebar-select-color", "--border-radius",
	"--border-radius-md", "--shadow-base", "--padding-md", "--navbar-height",
	"--bg-green", "--text-on-green", "--bg-orange", "--text-on-orange",
	"--bg-yellow", "--text-on-yellow", "--bg-red", "--text-on-red",
	"--bg-blue", "--text-on-blue", "--bg-gray", "--text-on-gray", "--icon-stroke",
	// v16 espresso family — empty here on a v15 build, which is the answer.
	"--surface-white", "--surface-menu-bar", "--surface-modal", "--surface-gray-1",
	"--surface-gray-2", "--ink-gray-9", "--ink-gray-6", "--ink-gray-4",
	"--outline-gray-1", "--outline-gray-3", "--sidebar-hover-color",
	"--sidebar-active-color", "--sidebar-border-color", "--focus-default",
	"--btn-height", "--input-height",
];

// Every class this theme styles. Count 0 means the rule can never match.
const PROBE_SELECTORS = [
	".navbar", "#navbar-search", "#navbar-breadcrumbs", ".standard-sidebar-item",
	".standard-sidebar-item.selected", ".standard-sidebar-label", ".sidebar-item-icon",
	".layout-side-section", ".layout-main-section", ".list-sidebar", ".form-sidebar",
	".sidebar-label", ".frappe-list", ".list-row-container", ".list-row-head",
	".list-row", ".list-row-col.text-right", ".list-subject", ".list-id", ".list-count",
	".page-head", ".title-text", ".page-actions .btn-secondary", ".form-page",
	".form-tab-content", ".form-section", ".section-head", ".form-tabs-list",
	".frappe-control[data-fieldtype='Currency']", ".control-label", ".form-control",
	".like-disabled-input", ".widget", ".widget-head", ".shortcut-widget-box",
	".links-widget-box", ".number-card", ".frappe-card", ".modal-content",
	".form-grid", ".grid-heading-row", ".grid-row", ".grid-static-col.text-right",
	".grid-footer", ".datatable", ".dt-row--header", ".dt-cell", ".dt-row--totalRow",
	".indicator-pill", ".indicator-pill.red", ".btn-primary", ".btn-default",
	".awesomplete", ".dropdown-menu", ".desk-alert",
	// v16 shell
	".body-sidebar", ".body-sidebar-container", ".sidebar-header", ".header-title",
	".header-subtitle", ".header-logo-container", ".standard-sidebar-item .item-anchor",
	".sidebar-item-label", ".sidebar-item-icon", ".active-sidebar", ".sidebar-user-button",
	".onboarding-sidebar", ".sidebar-toggle-btn",
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
	L.push("--ph-surface-chrome     : " + (get("--ph-surface-chrome") || "(not set)"));
	L.push("--ph-surface-primary    : " + (get("--ph-surface-primary") || "(not set)"));

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
	["data-ph", "data-ph-density", "data-ph-chrome", "data-theme"].forEach((a) => {
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

// ---------------------------------------------------------------------------
// Visual check — contrast, measured on the live DOM
// ---------------------------------------------------------------------------
//
// Diagnostics answers "does this selector exist". This answers the question
// that actually bites: "is anything on this page unreadable". It reads the
// computed colour of an element, walks up until it finds the first ancestor
// with a non-transparent background, and measures the WCAG 2.1 ratio between
// them.
//
// It exists because the invisible-text failure mode is invisible to review:
// a rule written for one container follows a shared id or class into another,
// paints pale-on-pale, and nothing errors. It cannot be caught by reading CSS
// and it is trivial to catch by measuring. Run it on any screen that looks
// wrong, and on every screen after a token change.
//
// Read-only.

const CONTRAST_PROBES = [
	// [ label, selector, floor ]
	["Sidebar item label", ".body-sidebar .sidebar-item-label", 4.5],
	["Sidebar selected item", ".active-sidebar .sidebar-item-label", 4.5],
	["Sidebar header title", ".sidebar-header .header-title", 4.5],
	["Sidebar header subtitle", ".sidebar-header .header-subtitle", 4.5],
	["Sidebar user name", ".sidebar-user-button", 4.5],
	["Command palette input", ".modal #navbar-search", 4.5],
	["Navbar search input", ".navbar #navbar-search", 4.5],
	["Dropdown item", ".dropdown-menu .dropdown-item", 4.5],
	["Menu panel item", ".frappe-menu .menu-item-title", 4.5],
	["Workspace menu item", ".sidebar-header-menu .menu-item-title", 4.5],
	["Menu shortcut", ".menu-item-shortcut", 3.0],
	["Notification panel", ".notifications-list", 4.5],
	["Form sidebar action", ".form-sidebar .form-sidebar-items a", 4.5],
	["Form sidebar label", ".form-sidebar .sidebar-label", 4.5],
	["Filter panel label", ".layout-side-section .sidebar-label", 4.5],
	["List row title", ".list-subject a", 4.5],
	["List column head", ".list-row-head .list-row-col", 4.5],
	["List count", ".list-count", 4.5],
	["Status pill", ".indicator-pill", 4.5],
	["Field label", ".control-label", 4.5],
	["Field value", ".form-control", 4.5],
	["Disabled field value", ".like-disabled-input", 4.5],
	["Section heading", ".section-head", 4.5],
	["Active tab", ".form-tabs-list .nav-link.active", 4.5],
	["Inactive tab", ".form-tabs-list .nav-link:not(.active)", 4.5],
	["Primary button", ".btn-primary", 4.5],
	["Toolbar button", ".page-actions .btn-default:not(.btn-secondary)", 4.5],
	["Filter button", ".filter-selector .filter-button", 4.5],
	["Sort button", ".sort-selector .sort-selector-button", 4.5],
	["Page size", ".list-paging-area .btn-paging:not(.btn-info)", 4.5],
	["Active page size", ".list-paging-area .btn-paging.btn-info", 4.5],
	["Secondary button", ".btn-default", 4.5],
	["Page title", ".title-text", 4.5],
	["Breadcrumb", "#navbar-breadcrumbs a", 4.5],
	["Grid header", ".grid-heading-row", 4.5],
	["Grid cell", ".grid-row .grid-static-col", 4.5],
	["Timeline text", ".timeline-content", 4.5],
	["Modal title", ".modal-title", 4.5],
	["Placeholder", ".form-control::placeholder", 3.0],
];

function parse_rgb(value) {
	const m = String(value).match(/rgba?\(([^)]+)\)/);
	if (!m) return null;
	const p = m[1].split(",").map((n) => parseFloat(n.trim()));
	if (p.length < 3 || p.some(isNaN)) return null;
	return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
}

function luminance(c) {
	const ch = (v) => {
		v /= 255;
		return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
	};
	return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
}

function contrast(fg, bg) {
	const a = luminance(fg);
	const b = luminance(bg);
	return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

// The colour a user actually sees behind an element: the first ancestor whose
// background is not fully transparent. Without this every ratio is measured
// against rgba(0,0,0,0) and the whole report is fiction.
function effective_bg(el) {
	let node = el;
	while (node && node !== document.documentElement) {
		const bg = parse_rgb(getComputedStyle(node).backgroundColor);
		if (bg && bg.a > 0.05) return bg;
		node = node.parentElement;
	}
	return { r: 255, g: 255, b: 255, a: 1 };
}

function build_visual_report() {
	const L = [];
	const rule = "-".repeat(66);
	let fails = 0;
	let checked = 0;

	L.push("PHENOMENON UI — VISUAL CHECK (contrast, measured on this page)");
	L.push("Route: " + (frappe.get_route_str ? frappe.get_route_str() : location.hash));
	L.push("Theme: " + (document.documentElement.getAttribute("data-theme") || "light") +
		" · chrome: " + (document.documentElement.getAttribute("data-ph-chrome") || "-"));
	L.push(rule);

	CONTRAST_PROBES.forEach(([label, selector, floor]) => {
		let el = null;
		try {
			el = document.querySelector(selector.replace("::placeholder", ""));
		} catch (e) {
			el = null;
		}
		if (!el) {
			L.push("  --    (not on this page)          " + label);
			return;
		}
		const cs = getComputedStyle(el);
		const fg = parse_rgb(cs.color);
		if (!fg) {
			L.push("  --    (no colour)                 " + label);
			return;
		}
		const bg = effective_bg(el);
		const ratio = contrast(fg, bg);
		checked += 1;
		const ok = ratio >= floor;
		if (!ok) fails += 1;
		L.push(
			"  " + (ok ? "PASS" : "FAIL") + "  " + ratio.toFixed(2) + ":1 (>= " + floor + ")  " +
			label + "\n          fg " + cs.color + "  on bg rgb(" +
			[bg.r, bg.g, bg.b].join(", ") + ")"
		);
	});

	L.push(rule);
	L.push(checked + " measured on this page, " + fails + " below the floor.");
	L.push("");
	L.push("A FAIL means that text is hard or impossible to read where it sits.");
	L.push("Run this on a list, a form, a workspace, with the command palette");
	L.push("open, and with a sidebar menu open — each renders a different set.");
	L.push("");
	L.push("NOT COVERED: hover and focus states. CSS cannot be forced from");
	L.push("script, so a row that only goes unreadable under the pointer will");
	L.push("pass here. Check those by hovering: every row in this theme changes");
	L.push("its background and its text colour together, so if a label fades or");
	L.push("disappears on hover, that is a bug worth reporting.");

	return L.join("\n");
}

function show_visual_check() {
	const text = build_visual_report();
	const d = new frappe.ui.Dialog({
		title: __("Phenomenon UI Visual Check"),
		size: "large",
		fields: [
			{
				fieldtype: "HTML",
				fieldname: "intro",
				options: `<p class="text-muted small">${__(
					"Measures the contrast of every themed surface present on the page behind this dialog. Read-only."
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

// ---------------------------------------------------------------------------
// Palette preview — the derived colours and what they measure
// ---------------------------------------------------------------------------
//
// Two pickers produce ten tokens, so the person choosing cannot see what they
// have done from the two swatches alone. This renders the derived set and the
// contrast of every pair that has to stay readable, recomputed on each edit
// and in whichever mode the desk is currently in.
//
// It is deliberately a readout, not a gate. A site can save a palette that
// fails; it just cannot do so without having been told. The derivation already
// pushes each derived text colour until it clears the floor, so a FAIL here
// normally means the two chosen colours are too close to each other to be
// rescued, and one of them has to move.

function palette_rgb(hex) {
	const m = String(hex || "").trim();
	if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(m)) return null;
	let h = m.slice(1);
	if (h.length === 3) h = h.split("").map((c) => c + c).join("");
	return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}

function palette_ratio(a, b) {
	const lum = (c) => {
		const ch = (v) => {
			v /= 255;
			return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
		};
		return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
	};
	const la = lum(a);
	const lb = lum(b);
	return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// Read the tokens back off <html> after the engine has painted them, rather
// than recomputing the derivation here. Two implementations of the same maths
// drift; one source and a reader cannot.
function read_token(name) {
	return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

const PALETTE_SWATCHES = [
	["Page", "--ph-surface-primary"],
	["Card", "--ph-surface-raised"],
	["Control fill", "--ph-surface-secondary"],
	["Disabled fill", "--ph-surface-base"],
	["Body text", "--ph-text-primary"],
	["Muted text", "--ph-text-muted"],
	["Control edge", "--ph-border-strong"],
	["Accent", "--ph-primary"],
	["Toolbar button", "--ph-button-tint"],
	["Toolbar label", "--ph-button-tint-ink"],
	["Accent hover", "--ph-primary-hover"],
	["Selected wash", "--ph-primary-soft"],
	["Button label", "--ph-primary-contrast"],
	["Chrome", "--ph-surface-chrome"],
	["Chrome hover", "--ph-surface-chrome-hover"],
	["Chrome selected", "--ph-surface-chrome-selected"],
	["Chrome edge", "--ph-chrome-edge"],
	["Chrome text", "--ph-text-on-chrome"],
	["Chrome text muted", "--ph-text-on-chrome-muted"],
];

const PALETTE_CHECKS = [
	["Button label on accent", "--ph-primary-contrast", "--ph-primary", 4.5],
	["Toolbar button label", "--ph-button-tint-ink", "--ph-button-tint", 4.5],
	["Toolbar button label on hover", "--ph-button-tint-ink", "--ph-button-tint-hover", 4.5],
	["Accent text on page", "--ph-primary", "--ph-surface-primary", 4.5],
	["Row text on selected wash", "--ph-text-primary", "--ph-primary-soft", 4.5],
	["Sidebar label on chrome", "--ph-text-on-chrome", "--ph-surface-chrome", 4.5],
	["Muted chrome text", "--ph-text-on-chrome-muted", "--ph-surface-chrome", 4.5],
	["Selected item label", "--ph-text-on-chrome", "--ph-surface-chrome-selected", 4.5],
	["Body text on page", "--ph-text-primary", "--ph-surface-primary", 4.5],
	["Body text on card", "--ph-text-primary", "--ph-surface-raised", 4.5],
	["Body text on control fill", "--ph-text-primary", "--ph-surface-secondary", 4.5],
	["Body text on disabled fill", "--ph-text-primary", "--ph-surface-base", 4.5],
	["Muted text on page", "--ph-text-muted", "--ph-surface-primary", 4.5],
	["Control edge on page", "--ph-border-strong", "--ph-surface-primary", 3.0],
];

// Once a colour is edited by hand, the palette name above it is no longer
// true. Leaving a stale name in a Link field is how somebody later reports
// that "Forest looks nothing like Forest". Clearing it costs nothing; the
// colours are already copied in.
function clear_stale_palette(frm) {
	if (!frm.doc.palette_preset || frm.__ph_applying_palette) return;

	frappe.db.get_doc("Phenomenon UI Palette", frm.doc.palette_preset).then((palette) => {
		const same =
			(palette.accent_color || "") === (frm.doc.accent_color || "") &&
			(palette.chrome_color || "") === (frm.doc.chrome_color || "") &&
			(palette.canvas_color || "") === (frm.doc.canvas_color || "");
		if (!same) frm.set_value("palette_preset", "");
	});
}

function render_palette_preview(frm) {
	const field = frm.get_field("palette_preview");
	if (!field || !field.$wrapper) return;

	const mode = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";

	const swatches = PALETTE_SWATCHES.map(([label, token]) => {
		const value = read_token(token) || "-";
		return `<div style="display:flex;align-items:center;gap:8px;min-width:170px;margin:0 12px 6px 0">
			<span style="width:18px;height:18px;border-radius:3px;border:1px solid var(--border-color);
				background:${frappe.utils.escape_html(value)}"></span>
			<span style="font-size:12px">${__(label)}
				<code style="font-size:11px;opacity:.7">${frappe.utils.escape_html(value)}</code></span>
		</div>`;
	}).join("");

	let fails = 0;
	const checks = PALETTE_CHECKS.map(([label, fgToken, bgToken, floor]) => {
		const fg = palette_rgb(read_token(fgToken));
		const bg = palette_rgb(read_token(bgToken));
		if (!fg || !bg) return "";
		const ratio = palette_ratio(fg, bg);
		const ok = ratio >= floor;
		if (!ok) fails += 1;
		return `<div style="font-size:12px;margin-bottom:3px">
			<b style="color:${ok ? "var(--ph-success, green)" : "var(--ph-danger, #b3261e)"}">
				${ok ? "PASS" : "FAIL"}</b>
			<span style="font-variant-numeric:tabular-nums">&nbsp;${ratio.toFixed(2)}:1</span>
			<span style="opacity:.6">&nbsp;(min ${floor})</span>&nbsp; ${__(label)}
		</div>`;
	}).join("");

	field.$wrapper.html(`
		<div style="border:1px solid var(--border-color);border-radius:6px;padding:12px">
			<div style="display:flex;flex-wrap:wrap">${swatches}</div>
			<hr style="margin:10px 0">
			${checks}
			<div style="font-size:11px;opacity:.7;margin-top:8px">
				${__("Measured in {0} mode, on the colours currently previewing. Switch the desk to the other mode to check both.", [mode])}
				${fails ? "<br><b>" + __("A FAIL means those two colours are too close to each other. Move one of them.") + "</b>" : ""}
			</div>
		</div>
	`);
}

// ---------------------------------------------------------------------------
// Assigning themes to users
// ---------------------------------------------------------------------------
//
// The site palette is the default for everybody. This assigns a different one
// to named users, either a few at a time or a whole role at once.
//
// Only palette and density are assignable. Light and dark are not, on purpose:
// that is an eyesight and lighting matter, so Frappe's own switcher stays the
// user's to control. An assignment that also seized light and dark would be
// the kind of well-meant control people quietly work around.
//
// Every call is gated server-side on the Phenomenon UI Manager role. The
// button being visible is a convenience, not the security boundary.

const API = "phenomenon_ui.api.";

function show_assign_dialog(frm) {
	let selected = [];

	const d = new frappe.ui.Dialog({
		title: __("Assign Theme to Users"),
		size: "large",
		fields: [
			{
				fieldtype: "HTML",
				fieldname: "intro",
				options: `<p class="text-muted small">${__(
					"Assigned users see this palette instead of the site palette. Each keeps their own light or dark choice. Changes apply on their next page load."
				)}</p>`,
			},
			{
				fieldtype: "Link",
				fieldname: "role",
				label: __("Narrow by Role"),
				options: "Role",
				description: __("Optional. Leave blank to choose from all enabled users."),
				onchange: () => load_users(),
			},
			{
				fieldtype: "MultiSelectList",
				fieldname: "users",
				label: __("Users"),
				reqd: 1,
				get_data: (txt) =>
					(d.__users || [])
						.filter(
							(u) =>
								!txt ||
								u.value.toLowerCase().includes(txt.toLowerCase()) ||
								(u.description || "").toLowerCase().includes(txt.toLowerCase())
						)
						.slice(0, 99),
			},
			{ fieldtype: "Column Break" },
			{
				fieldtype: "Button",
				fieldname: "select_all",
				label: __("Select All Listed"),
				click: () => {
					d.set_value(
						"users",
						(d.__users || []).map((u) => u.value)
					);
				},
			},
			{ fieldtype: "Section Break" },
			{
				fieldtype: "Link",
				fieldname: "palette",
				label: __("Palette"),
				options: "Phenomenon UI Palette",
				description: __("Blank inherits the site palette."),
			},
			{
				fieldtype: "Select",
				fieldname: "density",
				label: __("Density"),
				options: ["", "Compact", "Comfortable", "Spacious"],
				description: __("Blank inherits the site density."),
			},
			{ fieldtype: "Section Break" },
			{ fieldtype: "HTML", fieldname: "current" },
		],
		primary_action_label: __("Assign"),
		primary_action(values) {
			const users = values.users || [];
			if (!users.length) {
				frappe.msgprint(__("Choose at least one user."));
				return;
			}
			frappe
				.call(API + "assign_theme", {
					users: users,
					palette: values.palette || "",
					density: values.density || "",
				})
				.then((r) => {
					const n = (r.message || {}).applied || 0;
					frappe.show_alert({
						message: __("Theme assigned to {0} user(s). They see it on their next page load.", [n]),
						indicator: "green",
					});
					render_current();
					d.set_value("users", []);
				});
		},
		secondary_action_label: __("Reset to Site Theme"),
		secondary_action() {
			const users = d.get_value("users") || [];
			if (!users.length) {
				frappe.msgprint(__("Choose the users to reset."));
				return;
			}
			frappe.confirm(
				__("Remove the assignment for {0} user(s)? They return to the site theme.", [users.length]),
				() => {
					frappe.call(API + "reset_theme", { users: users }).then((r) => {
						const n = (r.message || {}).removed || 0;
						frappe.show_alert({
							message: __("{0} user(s) returned to the site theme.", [n]),
							indicator: "blue",
						});
						render_current();
						d.set_value("users", []);
					});
				}
			);
		},
	});

	function load_users() {
		frappe.call(API + "list_users", { role: d.get_value("role") || "" }).then((r) => {
			d.__users = (r.message || []).map((u) => ({
				value: u.name,
				description: u.full_name || "",
			}));
			d.set_value("users", []);
			d.get_field("users").refresh();
		});
	}

	// What is already assigned, and where it is changed.
	//
	// The table started as a read-only summary, which meant correcting a
	// single user's palette required finding them again in a list of everybody
	// and re-assigning, or removing and re-adding. Both cells are editable
	// here instead, because the row a person is looking at is the row they
	// want to change.
	//
	// Each editor sends BOTH values back, not just the one that changed.
	// assign_theme writes both fields, so sending one would silently blank the
	// other: change a density and lose a palette.
	function render_current() {
		frappe.call(API + "get_assignments").then((r) => {
			const rows = r.message || [];
			const field = d.get_field("current");

			if (!rows.length) {
				field.$wrapper.html(
					`<p class="text-muted small">${__("No users are assigned. Everybody sees the site theme.")}</p>`
				);
				return;
			}

			const options = (values, current, blankLabel) =>
				[""]
					.concat(values)
					.map((v) => {
						const label = v || blankLabel;
						const sel = (v || "") === (current || "") ? " selected" : "";
						return `<option value="${frappe.utils.escape_html(v)}"${sel}>${frappe.utils.escape_html(
							label
						)}</option>`;
					})
					.join("");

			const body = rows
				.map((row) => {
					const user = frappe.utils.escape_html(row.user);
					return `<tr data-user="${user}">
						<td>${user}</td>
						<td><select class="form-control input-xs ph-edit-palette">
							${options(d.__palettes || [], row.palette, __("Site palette"))}
						</select></td>
						<td><select class="form-control input-xs ph-edit-density">
							${options(["Compact", "Comfortable", "Spacious"], row.density, __("Site density"))}
						</select></td>
						<td style="text-align:right">
							<button class="btn btn-xs btn-default ph-remove-assignment">${__("Remove")}</button>
						</td>
					</tr>`;
				})
				.join("");

			field.$wrapper.html(`
				<p class="text-muted small">${__(
					"Currently assigned. Change a palette or density here and it saves immediately."
				)}</p>
				<table class="table table-bordered" style="font-size:12px">
					<thead><tr>
						<th>${__("User")}</th><th style="width:26%">${__("Palette")}</th>
						<th style="width:22%">${__("Density")}</th><th style="width:90px"></th>
					</tr></thead>
					<tbody>${body}</tbody>
				</table>
			`);

			field.$wrapper.find(".ph-edit-palette, .ph-edit-density").on("change", function () {
				const $row = $(this).closest("tr");
				const user = $row.data("user");
				frappe
					.call(API + "assign_theme", {
						users: [user],
						palette: $row.find(".ph-edit-palette").val() || "",
						density: $row.find(".ph-edit-density").val() || "",
					})
					.then(() => {
						frappe.show_alert({
							message: __("Updated {0}. They see it on their next page load.", [user]),
							indicator: "green",
						});
					});
			});

			// Remove where the assignment is actually visible. Clearing one
			// used to mean finding that user again in a list of everybody,
			// which is the wrong way round when the row is right there.
			field.$wrapper.find(".ph-remove-assignment").on("click", function () {
				const user = $(this).closest("tr").data("user");
				frappe.confirm(
					__("Remove the theme assigned to {0}? They return to the site theme.", [user]),
					() => {
						frappe.call(API + "reset_theme", { users: [user] }).then(() => {
							frappe.show_alert({
								message: __("{0} returned to the site theme.", [user]),
								indicator: "blue",
							});
							render_current();
						});
					}
				);
			});
		});
	}

	load_users();
	// The palette list is fetched once and reused by every row editor.
	frappe.call(API + "list_palettes").then((r) => {
		d.__palettes = r.message || [];
		render_current();
	});
	d.show();
}

frappe.ui.form.on("Phenomenon UI Settings", {
	refresh(frm) {
		frm.add_custom_button(__("Assign to Users"), () => show_assign_dialog(frm));
		frm.add_custom_button(__("Run Diagnostics"), show_diagnostics);
		frm.add_custom_button(__("Run Visual Check"), show_visual_check);

		frm.add_custom_button(__("Reload Saved"), () => {
			window.phenomenon && window.phenomenon.refresh();
			frappe.show_alert({ message: __("Preview reset to saved settings."), indicator: "blue" });
		});

		render_palette_preview(frm);

		frm.dashboard.clear_comment();
		frm.dashboard.add_comment(
			__(
				"Appearance changes preview immediately as you edit. <b>Save</b> to apply them for everyone; other users pick them up on their next reload."
			),
			"blue",
			true
		);
	},

	// Live preview: one handler per appearance field. Each paints the desk,
	// then re-reads the painted tokens back for the swatch panel.
	//
	// palette_preset has its own handler below and is excluded here so it is
	// not bound twice.
	...Object.fromEntries(
		PREVIEW_FIELDS.filter((f) => f !== "palette_preset").map((f) => [
			f,
			(frm) => {
				preview(frm);
				render_palette_preview(frm);
					if (["accent_color", "chrome_color", "canvas_color"].includes(f)) {
					clear_stale_palette(frm);
				}
			},
		])
	),

	// Choosing a palette COPIES its two colours in. The link is a label, not a
	// live reference: the two colour fields are always the answer to "what
	// colour is this desk", whether a palette filled them or somebody typed
	// them. That is why editing a palette record later does not silently
	// re-theme every site that once chose it.
	palette_preset(frm) {
		const name = frm.doc.palette_preset;
		if (!name || frm.__ph_applying_palette) return;

		frappe.db.get_doc("Phenomenon UI Palette", name).then((palette) => {
			frm.__ph_applying_palette = true;
			frm.set_value("accent_color", palette.accent_color || "");
			frm.set_value("chrome_color", palette.chrome_color || "");
			frm.set_value("canvas_color", palette.canvas_color || "");
			frm.__ph_applying_palette = false;
			preview(frm);
			render_palette_preview(frm);
		});
	},

	after_save(frm) {
		// Re-assert from the form rather than from frappe.boot, which is still
		// the pre-save copy until the cache clear propagates.
		preview(frm);
		render_palette_preview(frm);
	},
});
