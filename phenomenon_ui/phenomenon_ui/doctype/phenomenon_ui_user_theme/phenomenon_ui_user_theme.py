import frappe
from frappe.model.document import Document


class PhenomenonUIUserTheme(Document):
	def on_update(self):
		self.clear_user_cache()

	def on_trash(self):
		self.clear_user_cache()

	def clear_user_cache(self):
		# The theme is assembled into frappe.boot, and boot is cached per user.
		# Without this the assignment would appear to do nothing until the cache
		# expired on its own, which is exactly the kind of "it did not work, so I
		# clicked it four more times" behaviour worth designing out.
		frappe.clear_cache(user=self.user)
