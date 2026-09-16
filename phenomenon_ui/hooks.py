app_name = "phenomenon_ui"
app_title = "Phenomenon UI"
app_publisher = "TAALPLUS CHC Private Limited"
app_description = "A premium, modular and upgrade-safe UI layer for Frappe and ERPNext v15."
app_email = "developer@taalhealthcare.com"
app_license = "mit"

# ---------------------------------------------------------------------------
# Assets
# ---------------------------------------------------------------------------
# Both strings are bundle *outputs*. Frappe's esbuild pipeline picks up every
# `*.bundle.scss` / `*.bundle.js` under `phenomenon_ui/public/` and emits
# `assets/phenomenon_ui/dist/css/<name>.bundle.<hash>.css`. The hook is written
# without the hash — Frappe resolves it through the generated assets.json.

app_include_css = "phenomenon_ui.bundle.css"
app_include_js = "phenomenon_ui.bundle.js"

web_include_css = "phenomenon_web.bundle.css"

# ---------------------------------------------------------------------------
# Boot
# ---------------------------------------------------------------------------
# The theme engine reads `frappe.boot.phenomenon_ui`. Everything the client
# needs to paint the first frame must be here — no round trip on page load.

extend_bootinfo = "phenomenon_ui.boot.boot_session"

# Standard palettes are records, not a hard-coded list, so that a site can add
# its own and have it appear in the Settings dropdown with no code change.
after_install = "phenomenon_ui.install.after_install"
after_migrate = "phenomenon_ui.install.after_migrate"
