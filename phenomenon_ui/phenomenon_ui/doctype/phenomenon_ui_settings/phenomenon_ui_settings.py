import frappe
from frappe.model.document import Document

HEX = ("#",)


class PhenomenonUISettings(Document):
	def validate(self):
		for field, label, example in (
			("accent_color", "Accent Colour", "#0b5f68"),
			("chrome_color", "Chrome Colour", "#1e2a35"),
		):
			value = (self.get(field) or "").strip()
			self.set(field, value)
			if value and not value.startswith(HEX):
				frappe.throw(
					frappe._("{0} must be a hex value, for example {1}.").format(
						frappe._(label), example
					)
				)

	def on_update(self):
		# The theme is delivered through frappe.boot, so a stale bootinfo cache
		# means users keep the old theme until their next hard reload.
		frappe.clear_cache()
