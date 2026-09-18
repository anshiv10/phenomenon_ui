import frappe
from frappe.model.document import Document

HEX = ("#",)


class PhenomenonUIPalette(Document):
	def validate(self):
		for field, label, example in (
			("accent_color", "Accent Colour", "#0b5f68"),
			("chrome_color", "Chrome Colour", "#1e2a35"),
			("canvas_color", "Canvas Colour", "#f7f9fa"),
		):
			value = (self.get(field) or "").strip()
			self.set(field, value)
			if value and not value.startswith(HEX):
				frappe.throw(
					frappe._("{0} must be a hex value, for example {1}.").format(
						frappe._(label), example
					)
				)

	def on_trash(self):
		# A palette is only a pair of colours that were copied into Settings when
		# it was chosen, so deleting one never changes how the desk looks. It
		# would, however, leave a Link pointing at nothing, which reads as data
		# loss to the next person who opens the form.
		if frappe.db.get_single_value("Phenomenon UI Settings", "palette_preset") == self.name:
			frappe.db.set_single_value("Phenomenon UI Settings", "palette_preset", None)
