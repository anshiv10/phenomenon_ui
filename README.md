# Phenomenon UI

A premium, modular and upgrade-safe UI layer for Frappe and ERPNext v15.

Phenomenon UI re-themes the Frappe desk through CSS custom properties rather than by overriding templates or patching JavaScript. Everything it draws is scoped under a single attribute on `<html>`, so turning it off is a complete rollback rather than a partial one.

- **Deep teal accent**, deliberately not blue — ERPNext already spends blue on "informational link", and reusing it for primary actions collapses two meanings into one colour.
- **Configurable density and corner radius** from a Settings page, resolved through DOM attributes rather than a rebuild.
- **Dark mode** that hooks Frappe's own theme attribute, so the built-in light/dark/automatic switcher keeps working.
- **A Clinical preset** for healthcare deployments: calmer surfaces for long shifts, a low-luminance night palette for ward night shifts, five opt-in severity indicators, and 44px touch targets on bedside tablets. See [`docs/HEALTHCARE.md`](docs/HEALTHCARE.md).
- **No webfonts, no CDN, no telemetry.** Zero outbound requests — air-gapped installs are a normal ERPNext deployment.
- **WCAG AA throughout**, measured rather than asserted — `python3 scripts/contrast_audit.py` gates every palette pair in all four themes.

---

## Status: v0.1.0 — scaffold, pending bench verification

This app was authored without a bench attached. It is structurally complete and installable, but **its selectors and variable mappings have not yet been checked against an installed Frappe build.**

Before relying on it, run the Session 0 reconnaissance in [`docs/SESSION-0-CHECKLIST.md`](docs/SESSION-0-CHECKLIST.md) and correct anything marked `// VERIFY (Session 0):` in the SCSS. Unverified rules are marked in place — grep for them:

```bash
grep -rn "VERIFY (Session 0)" phenomenon_ui/public/scss/
```

An unmatched selector degrades to "not themed", never to "broken", so an unverified install is safe to look at. It is just not finished.

---

## Install

### Self-hosted bench

```bash
cd ~/frappe-bench
bench get-app https://github.com/anshiv10/phenomenon_ui --branch main
bench --site <your-site> install-app phenomenon_ui
bench build --app phenomenon_ui
bench --site <your-site> migrate
bench --site <your-site> clear-cache
```

Then hard-reload the desk (Cmd/Ctrl + Shift + R) — `frappe.boot` is cached in the browser.

### Frappe Cloud

1. **Bench group → Apps → Add App → From GitHub**, pointing at this repository on `main`.
2. Wait for the build to finish, then **Deploy**.
3. **Site → Apps → Install** `phenomenon_ui`.
4. Open **Phenomenon UI Settings** and hard-reload.

Frappe Cloud builds assets during deploy, so no manual `bench build` is needed.

---

## Configure

**Awesomebar → Phenomenon UI Settings** (System Manager only):

| Field | Effect |
|-------|--------|
| Enable Phenomenon UI | Master switch. Off = stock Frappe, no residue. |
| Theme Preset | Default or **Clinical** — see [`docs/HEALTHCARE.md`](docs/HEALTHCARE.md). |
| Accent Colour | Overrides the teal. Blank uses the default. |
| Density | Compact / Comfortable / Spacious — changes row heights, not just padding. |
| Corner Radius | Sharp / Small / Medium / Large. |
| Sidebar Style | Standard / Flat / Floating. |
| Navbar Style | Standard / Flat / Elevated / Contrast (dark chrome). |
| Custom CSS | Injected into one `<style>` tag after the theme. Prefer changing a token. |

Saving clears the cache. Users pick it up on their next reload.

### Testing from the console

```js
phenomenon.apply({ enabled: 1, density: "Compact", corner_radius: "Sharp" });
phenomenon.refresh();   // back to saved settings
```

---

## Rollback

Three levels, cheapest first.

**1. Turn it off** — Phenomenon UI Settings → uncheck *Enable Phenomenon UI* → Save → reload. The engine strips every `data-ph*` attribute, and since all styling is scoped under `html[data-ph='on']`, nothing remains. No rebuild, no downtime.

**2. Uninstall from one site**

```bash
bench --site <your-site> uninstall-app phenomenon_ui
bench --site <your-site> clear-cache
```

**3. Remove from the bench entirely**

```bash
bench --site <your-site> uninstall-app phenomenon_ui
bench remove-app phenomenon_ui
bench build
```

On **Frappe Cloud**: remove the app from the bench group, deploy, and the previous release stays available for one-click rollback in *Deploys*.

Uninstalling deletes the **Phenomenon UI Settings** Single. Export it first if the configuration matters.

---

## Architecture

```
phenomenon_ui/
├── hooks.py                    app_include_css/js, web_include_css, extend_bootinfo
├── boot.py                     settings -> frappe.boot, wrapped in try/except
├── public/js/
│   ├── phenomenon_ui.bundle.js
│   └── phenomenon/theme_engine.js
├── public/scss/
│   ├── phenomenon_ui.bundle.scss     desk entry point
│   ├── phenomenon_web.bundle.scss    website entry point (inert by design in v0.1)
│   ├── tokens/     palette (every literal), colors, geometry, typography, web
│   ├── base/       mapping (the important one), shell
│   ├── components/ buttons, forms, cards, dialogs, tables, indicators, motion
│   ├── desk/       navbar, sidebar, list-view, form-view
│   └── themes/     dark rules, accessibility, print
└── phenomenon_ui/doctype/phenomenon_ui_settings/
```

Configuration flows one way: **Settings → `boot.py` → `frappe.boot` → `theme_engine.js` → `data-*` attributes on `<html>` → SCSS.** The engine writes attributes and one inline custom property. It never touches a Frappe component.

`base/_mapping.scss` is where to look first when something appears unthemed. Frappe paints its desk from CSS custom properties; re-pointing those at `--ph-*` tokens themes every page at once, including pages that ship in a future release. Component rules only cover what a variable could not.

See [`CLAUDE.md`](CLAUDE.md) for the full contribution rules.

---

## Compatibility

| | |
|---|---|
| Frappe | v15 |
| ERPNext | v15 |
| Python | ≥ 3.10 |

**v16 is not supported.** The CSS custom property set changes between v15 and v16, and the mapping layer is written against v15 names. Verify before attempting it.

---

## Licence

MIT © TAALPLUS CHC Private Limited
