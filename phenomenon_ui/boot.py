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

# Every free-form colour the Settings form offers. Read into frappe.boot as-is;
# the client validates the hex before writing it into an inline style.
COLOUR_FIELDS = ("accent_color", "chrome_color")

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
	settings["custom_css"] = doc.custom_css or ""

	# Colour fields are listed once, here, and the list is what makes the
	# palette reach the browser at all.
	#
	# This is where Chrome Colour was lost before v0.4.1: the field saved, the
	# Settings form previewed it (the form reads the document directly), and
	# every reload dropped it because boot never sent it. The symptom looked
	# like a caching or CSS problem and was neither. Any colour field added in
	# future goes in this tuple, or it will fail the same silent way.
	for field in COLOUR_FIELDS:
		settings[field] = (doc.get(field) or "").strip()

	for field, allowed in ALLOWED.items():
		value = doc.get(field)
		settings[field] = value if value in allowed else DEFAULTS[field]

	return settings
