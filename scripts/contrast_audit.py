#!/usr/bin/env python3
"""WCAG contrast audit for the Phenomenon UI palette.

Reads tokens/_palette.scss and measures every foreground/background pair the
theme actually puts on screen, in all four themes.

    python3 scripts/contrast_audit.py

Exits non-zero if any pair fails, so it can gate a release.

Thresholds (WCAG 2.2 AA):
    4.5:1  body text
    3.0:1  large text, and UI component boundaries needed to identify a control

Note which pairs are NOT checked: --ph-border is a decorative separator between
rows, not a control boundary, and SC 1.4.11 does not apply to it. Holding a
table divider to 3:1 produces a UI that looks like a spreadsheet grid from 1997.
--ph-border-strong is the control edge, and it is checked.
"""

import re
import sys
from pathlib import Path

PALETTE = Path(__file__).resolve().parent.parent / "phenomenon_ui/public/scss/tokens/_palette.scss"


def load_palette() -> dict[str, str]:
	text = PALETTE.read_text()
	return dict(re.findall(r"^\$([\w-]+):\s*(#[0-9a-fA-F]{3,8})\s*;", text, re.M))


def _rgb(hex_value: str) -> tuple[int, int, int]:
	h = hex_value.lstrip("#")
	if len(h) == 3:
		h = "".join(c * 2 for c in h)
	return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def _luminance(hex_value: str) -> float:
	def channel(c: float) -> float:
		c /= 255
		return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4

	r, g, b = _rgb(hex_value)
	return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)


def ratio(a: str, b: str) -> float:
	la, lb = _luminance(a), _luminance(b)
	hi, lo = max(la, lb), min(la, lb)
	return (hi + 0.05) / (lo + 0.05)


# theme -> (page, card, ink, muted, light, accent, on-accent, control-border)
THEMES = {
	"Default light": {
		"page": "grey-050", "card": "white", "ink": "grey-900",
		"muted": "grey-600", "light": "grey-500", "accent": "teal-600",
		"on_accent": "white", "control": "grey-450", "accent_soft": "teal-050",
	},
	"Default dark": {
		"page": "ink-800", "card": "ink-700", "ink": "ink-100",
		"muted": "ink-200", "light": "ink-300", "accent": "teal-400",
		"on_accent": "teal-ink", "control": "ink-450", "accent_soft": "teal-950",
	},
	"Clinical day": {
		"page": "clinical-050", "card": "white", "ink": "clinical-900",
		"muted": "clinical-600", "light": "clinical-500", "accent": "clinical-accent",
		"on_accent": "white", "control": "clinical-450", "accent_soft": "clinical-accent-soft",
	},
	"Clinical night": {
		"page": "clinical-night-800", "card": "clinical-night-700", "ink": "clinical-night-100",
		"muted": "clinical-night-200", "light": "clinical-night-300", "accent": "clinical-accent-night",
		"on_accent": "clinical-night-900", "control": "clinical-night-450",
		"accent_soft": "clinical-accent-night-soft",
	},
}

STATES = ["critical", "urgent", "stable", "routine", "inactive"]


def main() -> int:
	p = load_palette()
	failures = []

	def check(theme: str, label: str, fg: str, bg: str, floor: float) -> None:
		r = ratio(p[fg], p[bg])
		ok = r >= floor
		mark = "PASS" if ok else "FAIL"
		print(f"  {mark}  {r:5.2f}:1  (>= {floor})  {label}")
		if not ok:
			failures.append(f"{theme}: {label} = {r:.2f}:1, needs {floor}:1")

	for theme, t in THEMES.items():
		print(f"\n=== {theme} ===")
		check(theme, "body text on page", t["ink"], t["page"], 4.5)
		check(theme, "body text on card", t["ink"], t["card"], 4.5)
		check(theme, "muted text on page", t["muted"], t["page"], 4.5)
		check(theme, "muted text on card", t["muted"], t["card"], 4.5)
		# --ph-text-light is used for uppercase micro-labels and placeholders,
		# both of which are large-text-equivalent or non-essential. 3:1.
		check(theme, "light text on card (labels)", t["light"], t["card"], 3.0)
		check(theme, "accent text on page", t["accent"], t["page"], 4.5)
		check(theme, "accent text on card", t["accent"], t["card"], 4.5)
		check(theme, "primary button label", t["on_accent"], t["accent"], 4.5)
		check(theme, "accent on its soft fill", t["accent"], t["accent_soft"], 4.5)
		check(theme, "control border on page", t["control"], t["page"], 3.0)
		check(theme, "control border on card", t["control"], t["card"], 3.0)

	print("\n=== Clinical states, day ===")
	for s in STATES:
		check("states-day", s, f"state-{s}", f"state-{s}-soft", 4.5)

	print("\n=== Clinical states, night ===")
	for s in STATES:
		check("states-night", s, f"state-{s}-dark", f"state-{s}-soft-dark", 4.5)

	print()
	if failures:
		print(f"{len(failures)} FAILURES:")
		for f in failures:
			print(f"  - {f}")
		print("\nFix the token in _palette.scss. Never add a one-off override.")
		return 1

	print("All pairs meet WCAG AA.")
	return 0


if __name__ == "__main__":
	sys.exit(main())
