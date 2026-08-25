# CLAUDE.md — Phenomenon UI

Working agreement for any AI or human contributor touching this app.

Place a copy at the root of `frappe-bench` so it is read from every session, and run sessions from `~/frappe-bench` — not from inside `apps/phenomenon_ui` — because verifying a selector requires reading `apps/frappe` and `apps/erpnext`.

---

## 1. What this app is

A CSS-first theme layer for Frappe / ERPNext v15. It changes how the product looks. It does not change what the product does.

It must survive `bench update` without intervention. That single constraint decides most of the rules below.

---

## 2. Change classification

Every changed file carries a level. **At least 90% of files in any release must be L1.**

| Level | Meaning | Upgrade risk | Approval |
|-------|---------|--------------|----------|
| **L1** | CSS custom properties, SCSS scoped under `html[data-ph='on']`, the theme engine's own DOM attributes | None. Frappe never reads these. | None needed |
| **L2** | Selector-dependent CSS targeting Frappe's own class names, hooks that only add assets | Low. A class rename degrades to unstyled, never broken. | Note it in the PR |
| **L3** | Overriding a core template, monkey-patching JS, `override_whitelisted_methods`, `doctype_js` on core doctypes | Real. Upstream changes silently break or, worse, silently diverge. | **Ask the user first. Every time.** |

L3 is not forbidden. It is a decision the user makes, not one you make for them.

---

## 3. Hard rules

**Never:**
- Write a rule outside the `html[data-ph='on']` scope. One attribute must remove the entire theme.
- Use `!important`, with exactly one exception: the `prefers-reduced-motion` block in `themes/_accessibility.scss`. If a rule is losing a specificity fight, the fix is in `base/_mapping.scss`.
- Put a hex value anywhere outside `public/scss/tokens/_palette.scss`.
- Reference an outbound URL — no webfonts, no CDN, no analytics, no telemetry. Air-gapped installs are a normal ERPNext deployment.
- Patch, wrap, subclass or `MutationObserver` a Frappe component.
- Use these hooks: `override_doctype_class`, `override_whitelisted_methods`, `doc_events` on core doctypes, `website_route_rules` that shadow core routes, `jinja` filters that replace core ones, `before_request` / `after_request`.
- Style a selector you have not read in `apps/frappe` or `apps/erpnext` source.
- Change a font size in Frappe's type scale (`--text-xs` … `--text-4xl`) globally.

**Always:**
- Prefer a variable mapping over a component rule. Ask out loud: "would a variable have done this?" and say so if one would.
- Write dark mode in the same commit as the surface it themes. Retrofitting it later costs more than doing it now.
- Keep `boot.py` inside `try/except`. A cosmetic layer must never prevent the desk from booting.

---

## 4. Architecture

```
tokens/_palette.scss   SCSS variables. Every colour and font literal, emits nothing.
tokens/_colors.scss    --ph-* colour tokens, light and dark, from the palette.
tokens/_geometry.scss  radius / density / elevation, driven by <html> attributes.
tokens/_typography.scss type scale and weights.
tokens/_web.scss       the same values under the portal scope.
base/_mapping.scss     Frappe var -> --ph-* token. The important one.
base/_shell.scss       page-level rules.
components/            generic UI: buttons, forms, cards, dialogs, tables,
                       indicators (incl. clinical severity), motion.
desk/                  desk surfaces: navbar, sidebar, list, form.
themes/                dark *rules*, accessibility, print. Imported last.
```

Two consequences of this layout worth stating outright:

- **The dark palette lives in `tokens/_colors.scss`, not `themes/_dark.scss`.** A dark theme is a token set, not a pile of overrides. Because the mapping layer reads `--ph-*` and never a literal, re-declaring the tokens re-themes every mapped Frappe variable at once. `themes/_dark.scss` is only for rules that baked in a light assumption a token cannot reach — if it starts growing, the rule that forced each addition is the bug.
- **`_palette.scss` holds every literal in the app.** Both scopes (desk and portal) read from it, so the two bundles cannot drift.
- **A preset is a token swap, never a rule swap.** The Clinical preset re-declares `--ph-*` in `tokens/_colors.scss` and reaches every surface through the mapping layer. If adding a preset ever requires editing a file in `components/` or `desk/`, the token layer has failed and that is the bug to fix.

Contrast is measured, not asserted: `python3 scripts/contrast_audit.py` checks every foreground/background pair in all four themes and exits non-zero on a failure. Run it after touching `_palette.scss`. Fix a failure by changing the token — never with a one-off override.

**The mapping layer is the product.** Frappe paints its desk from CSS custom properties; re-pointing those properties themes every page at once, including ones nobody has opened and ones that ship in a future release. A component rule themes one surface until someone renames a class. Reach for `_mapping.scss` first, always.

Runtime configuration flows one way only:

```
Phenomenon UI Settings (Single)
  -> boot.py  -> frappe.boot.phenomenon_ui
  -> theme_engine.js -> data-* attributes on <html>
  -> SCSS reads the attributes
```

The engine writes attributes. It does not write styles (beyond one inline `--ph-primary`) and it does not touch components.

---

## 5. Verification discipline

Never invent a selector. Before styling anything:

```bash
grep -rn "standard-sidebar-item" apps/frappe/frappe/public/
```

If it does not appear in source, do not write a rule for it. If you cannot verify it, mark it `// VERIFY (Session 0):` in the file and list it in your report as unverified. An honest gap beats a confident guess.

Report format after any styling session:

- Files changed, with L1/L2/L3 for each
- Any selector you could not verify
- CSS size delta
- Whether a variable mapping would have solved it instead

---

## 6. Performance budget

| Asset | Budget |
|-------|--------|
| `phenomenon_ui.bundle.css` | ≤ 60 KB uncompressed |
| `phenomenon_ui.bundle.js` | ≤ 8 KB uncompressed |
| Webfonts | 0 |
| Outbound requests | 0 |
| Runtime DOM observers | 0 |

---

## 7. Definition of done (per milestone)

- [ ] Every selector verified against installed source, or marked unverified in the report
- [ ] Dark mode covered for every new surface
- [ ] `Enable Phenomenon UI = 0` returns the surface to *exactly* stock — no residue
- [ ] Works at 430 / 390 / 375 / 360px
- [ ] Contrast meets WCAG AA: 4.5:1 body, 3:1 large text and UI borders
- [ ] No `!important` outside the documented exception
- [ ] No hex outside `tokens/`
- [ ] No unscoped rule
- [ ] Asset sizes reported against budget
- [ ] ≥ 90% of changed files are L1

---

## 8. Session protocol

One milestone per session, on its own `feature/*` branch. Reconnaissance before code. Review the diff before moving on. If a diff is larger than the milestone asked for, the excess gets reverted — scope creep in a theme shows up as unexplained visual change three screens away.
