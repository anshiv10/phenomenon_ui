# Phenomenon UI

A premium, modular and upgrade-safe UI layer for Frappe and ERPNext v15.

Phenomenon UI re-themes the Frappe desk through CSS custom properties rather than by overriding templates or patching JavaScript. Everything it draws is scoped under a single attribute on `<html>`, so turning it off is a complete rollback rather than a partial one.

Phenomenon UI implements the **Instrument Panel** design system (Direction B, token specification v1): the chrome dims, the data field lights, and one teal accent is spent only on the answer to "where am I?". No DOM element moves.

- **Dark chrome, lit content.** Navbar and sidebar form one dark frame; the content plane sits inside a 4-step luminance band so a six-hour shift reads text and status, not surfaces.
- **The focus contract.** Teal appears in exactly four places: the focused control, the selected list row, the selected sidebar item, and the primary action. Each is drawn the same way — a 3px accent bar on the leading edge plus a soft accent wash.
- **Radius encodes distance from the page** (3 / 6 / 10px) and **shadow is only permitted on a surface you can dismiss.** Cards, forms, lists, navbar and sidebar are flat.
- **Status pills** are soft fill + solid uppercase text in four semantic colours and one neutral, mapped from Frappe's own indicator variables.
- **Dark mode** is a token set, not an inversion: the frame goes near-black, the data plane stays a lifted slate, shadows become 1px rings. It hooks Frappe's own theme attribute, so the built-in switcher keeps working.
- **Density** (compact / comfortable / spacious) changes three tokens and nothing else. Type never shrinks: 13px is the floor.
- **Tokens:** [`docs/design-tokens.md`](docs/design-tokens.md).
- **No webfonts, no CDN, no telemetry.** Zero outbound requests — air-gapped installs are a normal ERPNext deployment.
- **WCAG AA throughout**, measured rather than asserted — `python3 scripts/contrast_audit.py` measures the 34 specification pairs in light and dark and fails the build if any drops below the floor.

---

## Status: v0.3.1 — spec-complete, verified against v16 source

v0.3.0 rebuilt the token layer and every component rule to the Instrument Panel specification. v0.3.1 adds the v16 mapping layer and shell rules, written against Frappe `version-16` source rather than guessed. The 34 spec contrast pairs pass in both modes.

Session 0 on a v16 bench confirmed every mapped v15 variable is still present. Remaining unverified: the espresso mappings and the v16 sidebar selectors, which are read from source but not yet observed in a running DOM. Re-run **Run Diagnostics** after installing to close that gap.

That is the one outstanding piece of work, and it needs a bench. Two commands do it:

```bash
# source side — greps installed Frappe/ERPNext
cd ~/frappe-bench && bash apps/phenomenon_ui/scripts/session0.sh > session0-report.txt

# runtime side — Phenomenon UI Settings -> Run Diagnostics -> Copy to Clipboard
```

Then correct anything the reports contradict. Unverified rules are marked in place:

```bash
grep -rn "VERIFY (Session 0)" phenomenon_ui/public/scss/     # 17 markers across 14 files
```

An unmatched selector degrades to "not themed", never to "broken", so an unverified install is safe to run and look at. It is just not finished.

**Known unresolved:** on at least one v15 build, `data-theme` is absent from `<html>`, which would mean dark mode never activates. `$ph-dark` in `tokens/_scope.scss` is a single line and changing it re-points the whole dark palette — but the diagnostics report has to say what the attribute actually is first.

**Verify first on your bench (the rules that assume the most):** `.standard-sidebar-item.selected`, `.layout-side-section`, the `--bg-<colour>` / `--text-on-<colour>` indicator variables, `.page-actions .btn-secondary`, `.grid-footer`, `.dt-row--totalRow`, and the list ID column class (`.list-id` is a candidate, not a fact).

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

### Upgrading an install you already have

`bench get-app` clones once. It does **not** pull later commits, so a bench installed at v0.1 stays at v0.1 until you pull — and the symptom is "I updated but nothing changed":

```bash
cd ~/frappe-bench/apps/phenomenon_ui
git pull origin main
cd ~/frappe-bench
bench --site <your-site> migrate        # picks up new Settings fields
bench build --app phenomenon_ui         # recompiles the CSS/JS bundles
bench --site <your-site> clear-cache
```

Then **hard-reload** (Cmd/Ctrl + Shift + R). `frappe.boot` is cached in the browser, so a soft reload can show you the old settings against new assets.

To confirm which version is actually running, open **Phenomenon UI Settings → Run Diagnostics**. It reports whether the stylesheet and engine loaded, and what `--ph-primary` resolves to.

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
| Appearance | Follow User Preference (recommended), Always Light, Always Dark. |
| Accent Colour | Overrides the teal in light mode. Blank uses the spec value. |
| Density | Compact / Comfortable / Spacious. Changes control height, row padding and section gap. Type never changes. |
| Chrome | Dark (the design system) or Light, the one deviation offered for a client who rejects a dark frame. |
| Custom CSS | Injected into one `<style>` tag after the theme. Prefer changing a token. |

Radius, elevation and the accent's four uses are fixed by the specification and are deliberately not settings.

Saving clears the cache. Users pick it up on their next reload.

Every appearance field **previews live as you edit**, before you save. **Reload Saved** discards the preview.

**Appearance** deserves a note: *Follow User Preference* leaves Frappe's `data-theme` alone, so each user's own light/dark choice keeps working and the built-in switcher stays meaningful. The other two override that for everyone on the site. Prefer the default unless a client has actually asked for a fixed appearance.

### Diagnostics

**Phenomenon UI Settings → Run Diagnostics** answers the two questions that are otherwise painful:

- **Is the theme actually loaded?** Whether the stylesheet compiled, the engine ran, and boot data arrived — which distinguishes "the theme is broken" from "the assets were never rebuilt".
- **Do the classes I styled exist in this build?** It queries the live DOM for every selector the theme assumes and lists present vs absent. Run it from a list view, a form and a workspace to cover every surface.

It also reports how this build expresses dark mode, which is what `$ph-dark` in `tokens/_scope.scss` has to match.

Read-only — it measures, it changes nothing. Pair it with the source-side half:

```bash
cd ~/frappe-bench
bash apps/phenomenon_ui/scripts/session0.sh > session0-report.txt
```

That greps installed Frappe/ERPNext source for the same variables and classes. The two disagree usefully: a variable can exist in source but resolve empty at runtime, and a class can exist in source but never render on the page you are looking at.

### Testing from the console

```js
phenomenon.apply({ enabled: 1, density: "Compact", chrome: "Light" });
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
│   ├── phenomenon_web.bundle.scss    website entry point (inert by design — see file header)
│   ├── tokens/     palette (every literal), colors (light, dark, light-chrome), geometry, typography, web
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

**Both are supported, through two mapping files.** v16 kept the v15 custom properties for its older components and added a second, semantic family borrowed from frappe-ui / espresso (`--surface-*`, `--ink-*`, `--outline-*`). Its new desk shell — the collapsible left sidebar, the sidebar header, the settings dialog, the command palette — paints from that family alone, which is why a v15-era theme renders content correctly and leaves the shell stock.

`base/_mapping.scss` covers the v15 names, `base/_mapping-v16.scss` covers the espresso family and the sidebar's own variables. Both are imported on every build: a variable a given version does not define is inert, so neither file needs a version switch. v16 shell rules live at the foot of `desk/_sidebar.scss`.

One v16 rule this theme cannot reach: `common/buttons.scss` sets `.btn:active` with `!important`, so a pressed button briefly shows the stock control fill. Beating it would need `!important`, which `CLAUDE.md` forbids.

---

## Licence

MIT © TAALPLUS CHC Private Limited
