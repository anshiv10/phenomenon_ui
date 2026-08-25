# Session 0 — Reconnaissance checklist

This app was scaffolded without a bench attached, so nothing in it has been checked against installed Frappe source. This file is the work that closes that gap. **Do it before trusting any visual output**, and do it read-only — no code changes in this session.

---

## The short version

Most of what follows is now automated. Two commands produce both reports:

```bash
# 1. Source side — greps installed Frappe/ERPNext. Read-only.
cd ~/frappe-bench
bash apps/phenomenon_ui/scripts/session0.sh > session0-report.txt

# 2. Runtime side — Phenomenon UI Settings → Run Diagnostics → Copy to Clipboard.
#    Run it three times: from a list view, a form, and a workspace.
```

Run both. They answer different questions and disagreement between them is informative, not a bug:

- A variable can be **defined in source** but resolve **empty at runtime** — the definition is behind a selector that does not match, so the mapping is still dead.
- A class can **exist in source** but never appear in `querySelectorAll` — it belongs to a surface the page you are on does not render. That is why you run the runtime half from three different pages.

The manual steps below are kept because they explain *what* each check is looking for and *what to do* with the answer. The script tells you the state; this file tells you the decision.

---

## The long version

Run everything from `~/frappe-bench`.

---

## 1. Versions

```bash
bench version
bench --site <dev-site> list-apps
ls sites/
```

Record the exact Frappe and ERPNext versions. **If either is v16, stop.** The CSS custom property set changed and `base/_mapping.scss` is written against v15 names — proceeding will produce a half-themed desk that looks worse than no theme.

---

## 2. The variable set

```bash
find apps/frappe -name "css_variables.scss"
cat apps/frappe/frappe/public/scss/common/css_variables.scss
```

List every `--` property, grouped: surfaces, text, borders, accent/semantic, radius, shadow, spacing, layout.

Then reconcile against `phenomenon_ui/public/scss/base/_mapping.scss`:

- **Mapped but not in source** → delete the line, note it in the report.
- **In source but not mapped** → add it, especially anything controlling surfaces, text, borders or accent. This is where the value is.
- The commented CANDIDATES block at the foot of `_mapping.scss` is a pre-written list to check off and promote.

Leave the type scale (`--text-xs` … `--text-4xl`) unmapped. Rescaling it globally reflows every list, grid and report.

---

## 3. Dark mode

```bash
grep -rn "data-theme" apps/frappe/frappe/public/js/ | head -40
grep -rn "set_theme\|toggle_theme" apps/frappe/frappe/public/js/
```

Confirm: which attribute, on which element, and the exact set of values.

The theme assumes `data-theme="dark"` on `<html>`. If that is wrong, change `$ph-dark` in `tokens/_scope.scss` — that one line is the only edit needed. The dark palette in `tokens/_colors.scss` and the rules in `themes/_dark.scss` both follow from it automatically.

---

## 4. Selectors

Check each. Anything absent, delete the rule rather than leaving it hopeful.

```bash
for c in navbar standard-sidebar-item standard-sidebar-label list-row-container \
         list-row-head form-section section-head form-tabs-list page-head widget \
         widget-head number-card modal-content grid-heading-row dt-row--header \
         dt-cell indicator-pill form-control control-label; do
  n=$(grep -rl "$c" apps/frappe apps/erpnext 2>/dev/null | wc -l)
  printf '%-24s %s\n' "$c" "$n files"
done
```

Every in-file marker is greppable:

```bash
grep -rn "VERIFY (Session 0)" phenomenon_ui/public/scss/
```

The highest-value item on the list is **the class Frappe puts on the *selected* sidebar item**. `desk/_sidebar.scss` assumes `.selected`; confirm it, because an active state that never matches is exactly the half-styled look that reads worse than stock.

---

## 5. The bundler

```bash
grep -rn "bundle.scss\|app_include_css" apps/frappe/frappe/build.py \
  apps/frappe/frappe/website/ apps/frappe/esbuild/ 2>/dev/null | head -30
```

Confirm that `*.bundle.scss` under `public/scss/` is auto-discovered, and the exact string format `app_include_css` expects. `hooks.py` uses the bare `"phenomenon_ui.bundle.css"` form.

---

## 6. Install and measure

```bash
bench --site <dev-site> install-app phenomenon_ui
bench build --app phenomenon_ui
bench --site <dev-site> migrate
bench --site <dev-site> clear-cache
ls -la sites/assets/phenomenon_ui/dist/css/ sites/assets/phenomenon_ui/dist/js/
```

Against budget: CSS ≤ 60 KB, JS ≤ 8 KB, 0 webfonts, 0 outbound requests.

---

## 7. Rollback proof

With **Enable Phenomenon UI = 0**, confirm every surface returns to *exactly* stock: desk home, a Sales Invoice form, a Sales Invoice list, a query report, a child-table grid, a modal, the awesomebar dropdown, a print preview.

In the console, `document.documentElement.attributes` should show no `data-ph*` at all, and `#phenomenon-custom-css` should not exist. Any residue is a scoping bug — find the rule that was written outside `#{$ph}`.

---

## Output

A single markdown report: versions, the full variable list, the dark-mode mechanism with the code that does it, the selector table with each marked exists/absent, the bundler answer, asset sizes vs budget, and a flag on anything that contradicts a normal v15 build.
