#!/usr/bin/env python3
"""WCAG contrast audit for the Phenomenon UI palette.

Reads tokens/_palette.scss and measures every foreground/background pair the
theme actually renders — the 34 pairs in section 04 of the Instrument Panel
spec, light and dark — computed by WCAG 2.1 relative luminance.

    python3 scripts/contrast_audit.py

Exits non-zero if any pair fails, so it can gate a release.

Thresholds (WCAG 2.2 AA):
    4.5:1  body text
    3.0:1  large text, and UI component boundaries needed to identify a control

One exclusion, stated rather than hidden: --ph-border-subtle against
--ph-surface-primary is ~1.45:1 light and ~1.28:1 dark. It is a decorative row
rule that never carries meaning on its own — every boundary it draws is also
expressed by alignment or a background step. Any border that does carry
meaning (control edge, checkbox, focus) uses --ph-border-strong or
--ph-primary, both above 3:1. It is printed below for the record, not gated.
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


# (label, foreground token, background token, floor) — spec section 04.
PAIRS = [
	("text-primary / surface-primary", "text-primary", "surface-primary", 4.5),
	("text-primary / surface-secondary", "text-primary", "surface-secondary", 4.5),
	("text-primary / surface-base", "text-primary", "surface-base", 4.5),
	("text-primary / primary-soft", "text-primary", "primary-soft", 4.5),
	("text-secondary / surface-primary", "text-secondary", "surface-primary", 4.5),
	("text-muted / surface-primary", "text-muted", "surface-primary", 4.5),
	("primary / surface-primary", "primary", "surface-primary", 4.5),
	("primary-contrast / primary", "primary-contrast", "primary", 4.5),
	("border-strong / surface-primary", "border-strong", "surface-primary", 3.0),
	("focus frame (primary) / surface-secondary", "primary", "surface-secondary", 3.0),
	("text-on-chrome / surface-chrome", "text-on-chrome", "surface-chrome", 4.5),
	("on-chrome-muted / surface-chrome", "text-on-chrome-muted", "surface-chrome", 4.5),
	("on-chrome / chrome-selected", "text-on-chrome", "surface-chrome-selected", 4.5),
	("success / success-soft", "success", "success-soft", 4.5),
	("warning / warning-soft", "warning", "warning-soft", 4.5),
	("danger / danger-soft", "danger", "danger-soft", 4.5),
	("info / info-soft", "info", "info-soft", 4.5),
]

# The dark set uses the same token names with a -dark suffix.
MODES = {"Light": "", "Dark": "-dark"}


def main() -> int:
	p = load_palette()
	failures = []

	for mode, suffix in MODES.items():
		print(f"\n=== {mode} ===")
		for label, fg, bg, floor in PAIRS:
			r = ratio(p[fg + suffix], p[bg + suffix])
			ok = r >= floor
			print(f"  {'PASS' if ok else 'FAIL'}  {r:5.2f}:1  (>= {floor})  {label}")
			if not ok:
				failures.append(f"{mode}: {label} = {r:.2f}:1, needs {floor}:1")

		# Stated exclusion — informational only.
		r = ratio(p["border-subtle" + suffix], p["surface-primary" + suffix])
		print(f"  info  {r:5.2f}:1  (decorative, not gated)  border-subtle / surface-primary")

	print()
	if failures:
		print("CONTRAST AUDIT FAILED")
		for f in failures:
			print(f"  {f}")
		return 1

	print(f"CONTRAST AUDIT PASSED — {len(PAIRS) * len(MODES)} pairs measured")
	return 0


if __name__ == "__main__":
	sys.exit(main())
