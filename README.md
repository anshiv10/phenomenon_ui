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

## Status: v0.6.1 — canvas colour, role-gated themes, per-user assignment

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
| Palette | Link to a **Phenomenon UI Palette** record. Picking one copies its two colours into the fields below, which stay editable. Type a new name to create your own; it appears in the list from then on. |
| Accent Colour | The accent. Blank uses the spec value. |
| Chrome Colour | The navbar and sidebar ground. Blank uses the spec value. |
| Canvas Colour | The content plane between the sidebars. Blank keeps the spec canvas. |
| Derived Palette | Read-only. The ten tokens derived from those two colours, and the contrast of every pair that has to stay readable. |
| Density | Compact / Comfortable / Spacious. Changes control height, row padding and section gap. Type never changes. |
| Custom CSS | Injected into one `<style>` tag after the theme. Prefer changing a token. |

Radius, elevation and the accent's four uses are fixed by the specification and are deliberately not settings.

### Who may change the theme

Write access to Settings, palettes and assignments belongs to the **Phenomenon UI Manager** role, not to System Manager. A client can hand theme control to one person without making them an administrator, and an administrator who was never given the role cannot quietly restyle everybody's desk. System Manager keeps read access. Administrator bypasses permission checks in Frappe by design, so a site can never lock itself out of its own theme; on install the role is created and granted to Administrator so that somebody holds it from the start.

### Per-user themes

**Assign to Users** on the Settings form gives named users a different palette or density from the site default. Pick users individually, or narrow by role and select the whole list at once. The dialog also lists who is currently assigned. Both the palette and the density in that table are editable in place and save immediately, so correcting one user does not mean removing and re-adding them. Each row also has **Remove**, and **Reset to Site Theme** clears a whole selection at once.

Only palette and density are assignable. Light and dark are deliberately not: that is an eyesight and lighting matter, so Frappe's own switcher stays the user's to control.

A blank field on an assignment means inherit, so assigning "compact only" does not freeze that user's palette when the site palette changes later. Assignments store the palette *name* and resolve its colours at boot, which means editing the Forest palette updates everybody assigned Forest. Settings stores colours directly instead, because it also accepts hand-typed colours belonging to no palette.

Changes reach a user on their next page load. Their cached boot is cleared when the assignment is saved, so a hard refresh is enough and nobody is logged out.

### The Chrome setting was removed in v0.6.0

It toggled an attribute that a CSS selector read. Once the palette engine began writing the chrome tokens inline on `<html>`, that selector could never win again: an inline style beats every selector regardless of specificity. The setting stayed in the form, still saved, and did nothing whenever a chrome colour was set.

Two controls for one property is the defect, not the losing one. Chrome Colour is the control, and a light frame is a light colour there. The **Light Chrome** palette ships one.

### How three colours become twenty

An accent is not one colour. It is a resting value, a hover value, a soft wash behind a selected row, and an ink that stays legible on the solid fill. A chrome colour is a ground, a hover step, a selected step, a hard edge, and two text values. A canvas colour is the page, the card, the control fill, the disabled fill, three text colours and two borders. Asking a site to pick twenty colours by hand guarantees an unreadable combination eventually; asking for three and deriving the rest cannot.

Canvas Colour is light mode only. Dark mode already has a designed plane and one colour cannot serve both.

Palettes are records, not a hard-coded list. Eight standard ones are seeded on install and re-asserted on migrate (`phenomenon_ui/install.py`); anything a site creates is never touched, and a standard one a site deletes is not resurrected. Choosing a palette copies its colours into Settings rather than referencing it, so editing a palette later does not silently re-theme a site that once chose it.

`public/js/phenomenon/palette.js` does the derivation and `theme_engine.js` writes the result inline on `<html>`, above the stylesheet. Inline, because the values have to change with the mode without a round trip: a brand colour chosen against white is usually too dark to read on a dark desk, so the accent is lifted per mode until it clears 4.5:1 against that mode's page. Hue is kept; only lightness moves, and only as far as the floor requires.

Every derived text colour is pushed away from its background until it clears the floor. Four guards do the work:

- Each content surface steps away from the page for its own reason, then is pushed back until body text clears 4.5:1 **on it**. The disabled fill is the darkest surface in a light ramp, so it fails first and is noticed last.
- The accent is fitted per mode against the real page, and must also be able to carry a button label on top of itself. An accent stranded mid-tone passes the first test and fails the second.
- The chrome selected colour is pushed away from the sidebar ink.
- A canvas too close to mid-tone to host readable text at all is nudged toward the end it is already nearer, keeping its hue. This is the one case the derivation cannot fix from the outside: near the middle of the range, no choice of text colour reaches 4.5:1.

4,608 combinations of accent, chrome, canvas and mode pass the audit, including pure black canvases, mid-grey canvases and white on white. That is what makes "pick any colour" a safe promise rather than a marketing one.

Saving clears the cache. Users pick it up on their next reload.

Every appearance field **previews live as you edit**, before you save. **Reload Saved** discards the preview.

**Appearance** deserves a note: *Follow User Preference* leaves Frappe's `data-theme` alone, so each user's own light/dark choice keeps working and the built-in switcher stays meaningful. The other two override that for everyone on the site. Prefer the default unless a client has actually asked for a fixed appearance.

### Diagnostics

**Phenomenon UI Settings → Run Diagnostics** answers the two questions that are otherwise painful:

There are two, and they answer different questions.

**Run Visual Check** measures contrast on the live DOM: for every themed surface present on the page behind the dialog it reads the computed text colour, walks up to the first ancestor with a real background, and reports the WCAG ratio. A FAIL is text that is hard or impossible to read *where it actually sits*. This is the one that catches the failure mode CSS review cannot: a rule written for one container following a shared id or class into another and painting pale on pale. Run it on a list, a form, a workspace, with the command palette open, and with a sidebar menu open — each renders a different set.

**Run Diagnostics** answers the structural questions:

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
