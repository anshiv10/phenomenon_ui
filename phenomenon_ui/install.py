"""Standard palettes.

Shipped as records rather than as a hard-coded Select, so "create your own"
needs no code: a palette is a row, the Settings form links to it, and a new one
appears in the dropdown the moment it is saved.

Seeded on install and re-asserted on every migrate. Standard rows are kept in
step with the app; anything a site creates is never touched, and a standard row
that a site has deleted is not resurrected, because deleting it was a decision.
"""

import frappe

STANDARD_PALETTES = (
	# name, accent, chrome
	("Phenomenon Default", "#0b5f68", "#1e2a35"),
	("Indigo", "#3b4cb8", "#1c2340"),
	("Forest", "#1f6b44", "#1b2a24"),
	("Plum", "#7a3b73", "#2a1f2e"),
	("Copper", "#9a4f1c", "#2b2119"),
	("Steel", "#2b6ca3", "#222d38"),
	("Graphite", "#4a5a6b", "#242a30"),
	("Light Chrome", "#0b5f68", "#eef1f3"),
)


MANAGER_ROLE = "Phenomenon UI Manager"


def after_install():
	ensure_manager_role()
	sync_standard_palettes(create_missing=True)


def after_migrate():
	ensure_manager_role()
	sync_standard_palettes(create_missing=False)


def ensure_manager_role():
	"""Create the role, and make sure at least one person holds it.

	Theme control is deliberately not tied to System Manager, so that a client
	can hand it to one person without making them an administrator. But a role
	nobody holds is a locked door with the key thrown away, so on first install
	it is granted to Administrator, who can then pass it on.

	Never raises: a missing role is a permissions inconvenience, not a reason to
	fail a migrate.
	"""
	try:
		if not frappe.db.exists("Role", MANAGER_ROLE):
			frappe.get_doc(
				{
					"doctype": "Role",
					"role_name": MANAGER_ROLE,
					"desk_access": 1,
				}
			).insert(ignore_permissions=True)

		holders = frappe.get_all(
			"Has Role",
			filters={"role": MANAGER_ROLE, "parenttype": "User"},
			pluck="parent",
			limit=1,
		)
		if not holders and frappe.db.exists("User", "Administrator"):
			admin = frappe.get_doc("User", "Administrator")
			admin.append("roles", {"role": MANAGER_ROLE})
			admin.save(ignore_permissions=True)

		frappe.db.commit()
	except Exception:
		frappe.log_error(title="Phenomenon UI: role setup failed")


def sync_standard_palettes(create_missing: bool = False):
	"""Never raises: a missing palette is a cosmetic loss, not a failed migrate."""
	try:
		if not frappe.db.exists("DocType", "Phenomenon UI Palette"):
			return

		# On a fresh install nothing exists yet, so everything is created. On a
		# later migrate only rows that are still present are refreshed, which is
		# what keeps a deliberate deletion deleted.
		first_run = create_missing or not frappe.db.exists("Phenomenon UI Palette", {"is_standard": 1})

		for name, accent, chrome in STANDARD_PALETTES:
			if frappe.db.exists("Phenomenon UI Palette", name):
				doc = frappe.get_doc("Phenomenon UI Palette", name)
				if not doc.is_standard:
					# A site has taken this name for its own palette. Theirs wins.
					continue
				if (doc.accent_color, doc.chrome_color) == (accent, chrome):
					continue
				doc.accent_color = accent
				doc.chrome_color = chrome
				doc.save(ignore_permissions=True)
			elif first_run:
				frappe.get_doc(
					{
						"doctype": "Phenomenon UI Palette",
						"palette_name": name,
						"accent_color": accent,
						"chrome_color": chrome,
						"is_standard": 1,
					}
				).insert(ignore_permissions=True)

		frappe.db.commit()
	except Exception:
		frappe.log_error(title="Phenomenon UI: palette seed failed")
