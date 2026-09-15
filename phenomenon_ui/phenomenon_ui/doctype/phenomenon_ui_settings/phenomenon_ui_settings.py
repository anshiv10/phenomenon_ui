import frappe
from frappe.model.document import Document

HEX = ("#",)


class PhenomenonUISettings(Document):
	def validate(self):
		self.accent_color = (self.accent_color or "").strip()
		if self.accent_color and not self.accent_color.startswith(HEX):
			frappe.throw(frappe._("Accent Colour must be a hex value, for example #0b5f68."))

	def on_update(self):
		# The theme is delivered through frappe.boot, so a stale bootinfo cache
		# means users keep the old theme until their next hard reload.
		frappe.clear_cache()
