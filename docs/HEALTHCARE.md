# Healthcare guide

What Phenomenon UI does for a clinical deployment, and how to wire the parts that need your consent.

---

## The Clinical preset

**Phenomenon UI Settings → Theme Preset → Clinical.**

It changes tokens, not rules. Nothing in `components/` or `desk/` knows the preset exists — which is the point, and the test of whether the token layer is doing its job.

| | Default | Clinical |
|---|---|---|
| Accent | `#0d7c74` | `#0b6f68` — a step deeper, less saturated |
| Page | Cool grey `#f5f7f8` | Green-grey `#f2f6f5` |
| Ink | `#17222c` | `#16282c`, marginally warmer |
| Dark mode | Near-black | Lower-luminance night palette |

**Why teal rather than the ERPNext blue.** Surgical greens and teals are the convention in medicine for a physiological reason: they sit opposite red on the colour wheel and suppress the green afterimage that follows sustained focus on blood and tissue. Reusing ERPNext's blue for primary actions also collapses two meanings — blue already reads as "informational link" throughout the product.

**Why the surfaces move.** Ward and clinic staff hold these screens for eight to twelve hours. The clinical surfaces trade a little contrast between adjacent panels for less glare, and let the border do the separating instead. The accent desaturates a step for the same reason: a fully saturated primary is fine on a button pressed twice a day and fatiguing on a screen held all shift.

**Night mode** is not "the dark theme, but greener". Ward lighting goes down at night, so overall luminance drops further than the standard dark palette — bright enough to read a chart, dim enough that the screen is not the brightest object in a sleeping bay at 3am. It activates automatically when Clinical is selected *and* the user has Frappe's dark theme on, so the built-in switcher still drives it.

---

## Clinical severity indicators

Five states, available as CSS classes in every preset and both themes:

| Class | Meaning | Treatment |
|---|---|---|
| `ph-critical` | Needs attention now | Red fill, 3px rail |
| `ph-urgent` | Needs attention this shift | Amber fill, 2px rail |
| `ph-stable` | Within expected parameters | Green fill |
| `ph-routine` | Scheduled, nothing unusual | Blue fill |
| `ph-inactive` | Cancelled, closed, discharged | Grey fill |

Plus `ph-out-of-range` for a lab value or observation outside its reference range.

### The theme will not apply these for you

Deliberately. Guessing which of *your* workflow states means "critical" is exactly the kind of invention this project's rules forbid, and getting it wrong in a clinical setting is worse than leaving it unstyled. So you opt in, per doctype:

```js
// your_app/public/js/patient_appointment_list.js
frappe.listview_settings["Patient Appointment"] = {
	get_indicator(doc) {
		if (doc.status === "Cancelled") return [__("Cancelled"), "ph-inactive", "status,=,Cancelled"];
		if (doc.status === "Scheduled") return [__("Scheduled"), "ph-routine", "status,=,Scheduled"];
		if (doc.status === "Closed") return [__("Closed"), "ph-stable", "status,=,Closed"];
		return [__(doc.status), "ph-routine", "status,=," + doc.status];
	},
};
```

For a lab result, mark the value rather than the row:

```js
frappe.listview_settings["Lab Test"] = {
	formatters: {
		result_value(value, df, doc) {
			if (!value) return "";
			return doc.normal_range && is_out_of_range(value, doc.normal_range)
				? `<span class="ph-out-of-range">${frappe.utils.escape_html(value)}</span>`
				: frappe.utils.escape_html(value);
		},
	},
};
```

Escape any value you interpolate. A patient name with an apostrophe is common; a patient name that is valid HTML is a stored XSS.

### Why they look the way they do

Severity is carried by three channels at once — hue, lightness, and the weight of the left rail — never hue alone. Around 8% of men have a red/green colour vision deficiency, and a critical/stable pair distinguished only by hue is invisible to them. Lightness and rail weight survive that. They also survive a bad ward monitor, a projector in a handover meeting, and a greyscale printout.

Every state is measured at ≥ 4.5:1 against its own fill, in both day and night. Run `python3 scripts/contrast_audit.py` to see the numbers.

---

## Touch

Ward tablets and bedside terminals get 44px minimum targets on rows, buttons, sidebar items and checkboxes — the WCAG 2.2 target-size floor, and roughly a fingertip.

This is applied under `@media (pointer: coarse)` only. A clinician at a desk with a mouse keeps the density they chose; the same site on a tablet becomes tappable without a second configuration.

---

## Print

Healthcare still runs on paper at the edges: prescriptions, discharge summaries, consent forms, lab reports for the physical file.

`themes/_print.scss` re-points tokens to ink-on-white, drops shadows, and — the one that matters clinically — sets `break-inside: avoid` on rows and grid lines. Half a medication line at the foot of page one is how a dose gets misread.

It re-points tokens rather than restyling components, so it cannot fight your print format's own layout.

---

## What this theme deliberately does not do

Worth being explicit with a healthcare client, because these will come up:

- **It does not touch patient data, permissions, or any document workflow.** It is a stylesheet and one attribute-setting script. It has no server-side logic beyond reading its own settings.
- **It makes no outbound network request.** No webfonts, no CDN, no analytics. Verify with `grep -rn "http" phenomenon_ui/public/`. This matters for an on-premise hospital deployment behind a firewall, which is a normal ERPNext healthcare setup.
- **It is not a medical device and carries no clinical validation.** Colour choices here improve legibility; they do not constitute a clinical alerting system. If a status needs to be escalated reliably, that belongs in a workflow and a notification, not in a CSS class.
- **It does not decide clinical meaning.** See above — severity classes are opt-in for exactly this reason.

---

## Compliance notes

Nothing in this app stores, transmits, or logs patient data, so it sits outside the scope of most HIPAA/GDPR technical controls on its own. Two things worth recording in a client's documentation anyway:

- **Custom CSS** in Settings is injected into a `<style>` tag. It is restricted to System Manager, but treat it as you would any admin-level script injection surface.
- **Zero outbound requests** is a property you can demonstrate, not just claim. It is worth putting in front of an infosec reviewer early — it usually shortens the conversation.
