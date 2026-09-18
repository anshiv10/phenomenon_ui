import frappe

DEFAULTS = {
	"enabled": 1,
	"appearance": "Follow User Preference",
	"accent_color": "",
	"chrome_color": "",
	"canvas_color": "",
	"density": "Comfortable",
	"custom_css": "",
}

# Every free-form colour the Settings form offers. Read into frappe.boot as-is;
# the client validates the hex before writing it into an inline style.
COLOUR_FIELDS = ("accent_color", "chrome_color", "canvas_color")

# Values the client is allowed to write into DOM attributes. Anything outside
# these sets is dropped rather than passed through, so a bad Settings value can
# never produce an attribute the SCSS does not have a rule for.
ALLOWED = {
	"appearance": {"Follow User Preference", "Always Light", "Always Dark"},
	"density": {"Compact", "Comfortable", "Spacious"},
}


def boot_session(bootinfo):
	"""Push Phenomenon UI settings into frappe.boot.

	Never raises. A theme is a cosmetic layer; if it cannot read its settings
	the desk must still boot with stock appearance.
	"""
	try:
		bootinfo.phenomenon_ui = get_settings(frappe.session.user)
	except Exception:
		frappe.log_error(title="Phenomenon UI: boot failed")
		bootinfo.phenomenon_ui = dict(DEFAULTS, enabled=0)


def get_settings(user: str | None = None) -> dict:
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

	apply_user_theme(settings, user)

	return settings


def apply_user_theme(settings: dict, user: str | None):
	"""Overlay one user's assigned palette and density on the site settings.

	Only palette and density are assignable. Light and dark deliberately are
	not: that is an eyesight and lighting matter, so Frappe's own switcher stays
	the user's to control and this app never overrides it per user.

	A blank field on the row means inherit, so an assignment of "compact only"
	does not quietly freeze that user's palette when the site palette changes
	later.

	Note the asymmetry with Settings, which stores the two colours directly. A
	user row stores the palette NAME and the colours are resolved here, at boot.
	The reason is that Settings also lets someone type colours belonging to no
	palette, so it has to hold values; a row only ever points at a palette, so
	it can point. The practical effect is the useful one: edit the Forest
	palette and every user assigned Forest follows on their next load.
	"""
	if not user or user == "Guest":
		return
	if not frappe.db.exists("DocType", "Phenomenon UI User Theme"):
		return

	row = frappe.db.get_value(
		"Phenomenon UI User Theme", {"user": user}, ["palette", "density"], as_dict=True
	)
	if not row:
		return

	if row.density in ALLOWED["density"]:
		settings["density"] = row.density

	if row.palette:
		palette = frappe.db.get_value(
			"Phenomenon UI Palette",
			row.palette,
			["accent_color", "chrome_color", "canvas_color"],
			as_dict=True,
		)
		if palette:
			for field in COLOUR_FIELDS:
				settings[field] = (palette.get(field) or "").strip()
