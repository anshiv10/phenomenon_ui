"""Whitelisted endpoints for assigning themes to users.

Everything here is gated on the Phenomenon UI Manager role rather than on
System Manager. That is the point of the role: a client can hand theme control
to one person without making them an administrator, and an administrator who
was never given the role cannot quietly restyle everybody's desk.

Administrator bypasses permission checks in Frappe by design, so a site can
never lock itself out of its own theme.
"""

import frappe

MANAGER_ROLE = "Phenomenon UI Manager"
DENSITIES = {"Compact", "Comfortable", "Spacious"}


def guard():
	"""Raise unless the caller may manage themes."""
	if frappe.session.user == "Administrator":
		return
	if MANAGER_ROLE not in frappe.get_roles():
		frappe.throw(
			frappe._("Only a {0} can assign themes.").format(frappe._(MANAGER_ROLE)),
			frappe.PermissionError,
		)


@frappe.whitelist()
def list_users(role: str | None = None, search: str | None = None) -> list[dict]:
	"""Enabled users, optionally narrowed by role. Powers the assignment dialog."""
	guard()

	filters = {"enabled": 1}
	if search:
		filters["name"] = ["like", f"%{search}%"]

	if role:
		names = frappe.get_all(
			"Has Role",
			filters={"role": role, "parenttype": "User"},
			pluck="parent",
			distinct=True,
		)
		if not names:
			return []
		filters["name"] = ["in", names]

	return frappe.get_all(
		"User",
		filters=filters,
		fields=["name", "full_name"],
		order_by="full_name asc",
		limit_page_length=0,
	)


@frappe.whitelist()
def assign_theme(users, palette: str | None = None, density: str | None = None) -> dict:
	"""Give each named user a palette and/or density.

	A blank palette or density means "inherit the site setting" for that field,
	which is why they are stored blank rather than being filled in with the
	current site value. Copying the site value in would freeze it: change the
	site palette later and every assigned user would silently keep the old one.
	"""
	guard()

	users = _as_list(users)
	palette = (palette or "").strip()
	density = (density or "").strip()

	if palette and not frappe.db.exists("Phenomenon UI Palette", palette):
		frappe.throw(frappe._("Palette {0} does not exist.").format(palette))
	if density and density not in DENSITIES:
		frappe.throw(frappe._("{0} is not a density.").format(density))

	applied = 0
	for user in users:
		if not frappe.db.exists("User", user):
			continue
		doc = _row_for(user)
		doc.palette = palette or None
		doc.density = density or None
		doc.save(ignore_permissions=True)
		applied += 1

	frappe.db.commit()
	return {"applied": applied}


@frappe.whitelist()
def reset_theme(users) -> dict:
	"""Return users to the site theme by removing their row entirely.

	Deleting rather than blanking: a row with every field empty behaves the
	same but leaves the impression that the user has been configured, and the
	next person to read the list cannot tell the difference between "reset" and
	"assigned nothing yet".
	"""
	guard()

	removed = 0
	for user in _as_list(users):
		if frappe.db.exists("Phenomenon UI User Theme", user):
			frappe.delete_doc("Phenomenon UI User Theme", user, ignore_permissions=True)
			removed += 1

	frappe.db.commit()
	return {"removed": removed}


@frappe.whitelist()
def get_assignments() -> list[dict]:
	"""Every user who currently has an assignment, for the dialog's summary."""
	guard()
	return frappe.get_all(
		"Phenomenon UI User Theme",
		fields=["user", "palette", "density"],
		order_by="user asc",
		limit_page_length=0,
	)


def _as_list(users) -> list[str]:
	if isinstance(users, str):
		users = frappe.parse_json(users)
	if isinstance(users, str):
		users = [users]
	return [u for u in (users or []) if u]


def _row_for(user: str):
	if frappe.db.exists("Phenomenon UI User Theme", user):
		return frappe.get_doc("Phenomenon UI User Theme", user)
	return frappe.get_doc({"doctype": "Phenomenon UI User Theme", "user": user})
