import frappe

DEFAULTS = {
	"enabled": 1,
	"appearance": "Follow User Preference",
	"accent_color": "",
	"chrome_color": "",
	"density": "Comfortable",
	"chrome": "Dark",
	"custom_css": "",
}

# Values the client is allowed to write into DOM attributes. Anything outside
# these sets is dropped rather than passed through, so a bad Settings value can
# never produce an attribute the SCSS does not have a rule for.
ALLOWED = {
	"appearance": {"Follow User Preference", "Always Light", "Always Dark"},
	"density": {"Compact", "Comfortable", "Spacious"},
	"chrome": {"Dark", "Light"},
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
