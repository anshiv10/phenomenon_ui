frappe.ui.form.on("Phenomenon UI Settings", {
	refresh(frm) {
		frm.add_custom_button(__("Preview Without Saving"), () => {
			if (!window.phenomenon) return;
			window.phenomenon.apply({
				enabled: frm.doc.enabled ? 1 : 0,
				theme_preset: frm.doc.theme_preset,
				accent_color: frm.doc.accent_color || "",
				density: frm.doc.density,
				corner_radius: frm.doc.corner_radius,
				sidebar_style: frm.doc.sidebar_style,
				navbar_style: frm.doc.navbar_style,
				custom_css: frm.doc.custom_css || "",
			});
		});

		frm.add_custom_button(__("Reset Preview"), () => {
			window.phenomenon && window.phenomenon.refresh();
		});
	},
});
