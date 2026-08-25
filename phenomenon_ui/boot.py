import frappe

DEFAULTS = {
	"enabled": 1,
	"theme_preset": "Default",
	"accent_color": "",
	"density": "Comfortable",
	"corner_radius": "Medium",
	"sidebar_style": "Standard",
	"navbar_style": "Standard",
	"custom_css": "",
}

# Values the client is allowed to write into DOM attributes. Anything outside
# these sets is dropped rather than passed through, so a bad Settings value can
# never produce an attribute the SCSS does not have a rule for.
ALLOWED = {
	"theme_preset": {"Default", "Clinical"},
	"density": {"Compact", "Comfortable", "Spacious"},
	"corner_radius": {"Sharp", "Small", "Medium", "Large"},
	"sidebar_style": {"Standard", "Flat", "Floating"},
	"navbar_style": {"Standard", "Flat", "Elevated", "Contrast"},
}


def boot_session(bootinfo):
	"""Push Phenomenon UI settings into frappe.boot.

	Never raises. A theme is a cosmetic layer; if it cannot read its settings
	the desk must still boot with stock appearance.
	"""
	try:
		bootinfo.phenomenon_ui = get_settings()
	except Exception:
		frappe.log_error(title="Phenomenon UI: boot failed")
		bootinfo.phenomenon_ui = dict(DEFAULTS, enabled=0)


def get_settings() -> dict:
	settings = dict(DEFAULTS)

	if not frappe.db.exists("DocType", "Phenomenon UI Settings"):
		# App installed but not migrated yet.
		return settings

	doc = frappe.get_cached_doc("Phenomenon UI Settings")

	settings["enabled"] = 1 if doc.enabled else 0
	settings["accent_color"] = (doc.accent_color or "").strip()
	settings["custom_css"] = doc.custom_css or ""

	for field, allowed in ALLOWED.items():
		value = doc.get(field)
		settings[field] = value if value in allowed else DEFAULTS[field]

	return settings
