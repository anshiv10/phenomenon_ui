#!/usr/bin/env bash
#
# Session 0 — reconnaissance, in one command.
#
#   cd ~/frappe-bench
#   bash apps/phenomenon_ui/scripts/session0.sh > session0-report.txt
#
# Strictly read-only: it greps installed source and prints a report. It changes
# nothing, installs nothing, and never touches a site.
#
# This answers the source-side half of Session 0 — which CSS variables exist,
# how dark mode is expressed, which classes are real. The runtime half is
# answered by Phenomenon UI Settings -> Run Diagnostics, which measures the live
# DOM instead. Run both; they check different things and disagree usefully.

set -uo pipefail

FRAPPE="apps/frappe"
ERPNEXT="apps/erpnext"

if [ ! -d "$FRAPPE" ]; then
	echo "ERROR: $FRAPPE not found."
	echo "Run this from your frappe-bench directory, not from inside the app."
	exit 1
fi

rule() { printf '%s\n' "------------------------------------------------------------"; }
head1() { echo; rule; echo "$1"; rule; }

echo "PHENOMENON UI — SESSION 0 SOURCE REPORT"
echo "Generated: $(date -u '+%Y-%m-%d %H:%M UTC')"

head1 "1. VERSIONS"
bench version 2>/dev/null || echo "(bench version unavailable)"
echo
echo "Sites on this bench:"
ls -1 sites/ 2>/dev/null | grep -v -E '^(assets|apps.txt|apps.json|common_site_config.json)$' || echo "(none found)"

head1 "2. CSS VARIABLE DEFINITIONS"
VARFILE=$(find "$FRAPPE" -name "css_variables.scss" 2>/dev/null | head -1)
if [ -n "$VARFILE" ]; then
	echo "Source: $VARFILE"
	echo
	echo "Every custom property this build defines:"
	grep -oE '^\s*--[a-zA-Z0-9-]+' "$VARFILE" | tr -d ' \t' | sort -u
	echo
	echo "Count: $(grep -coE '^\s*--[a-zA-Z0-9-]+' "$VARFILE")"
else
	echo "css_variables.scss not found. Searching for :root blocks instead:"
	grep -rl ":root" "$FRAPPE"/frappe/public/scss/ 2>/dev/null | head -20
fi

head1 "3. MAPPED VARIABLES — DO THEY EXIST?"
echo "Each variable base/_mapping.scss re-points, checked against source."
echo "ABSENT means the mapping is dead weight and should be deleted."
echo
for v in --bg-color --fg-color --card-bg --control-bg --disabled-control-bg \
	--fg-hover-color --subtle-accent --subtle-fg --highlight-color \
	--awesomplete-hover-bg --text-color --text-muted --text-light \
	--heading-color --icon-stroke --border-color --dark-border-color \
	--primary --primary-color --border-radius --border-radius-sm \
	--border-radius-md --border-radius-lg --border-radius-full \
	--shadow-base --shadow-sm --shadow-md --shadow-lg \
	--padding-xs --padding-sm --padding-md --padding-lg --padding-xl --padding-2xl \
	--margin-xs --margin-sm --margin-md --margin-lg --margin-xl \
	--navbar-bg --modal-bg --sidebar-select-color --control-bg-on-gray \
	--scrollbar-thumb-color --navbar-height --page-head-height; do
	n=$(grep -rho -- "$v *:" "$FRAPPE"/frappe/public/scss/ 2>/dev/null | wc -l | tr -d ' ')
	if [ "$n" -gt 0 ]; then
		printf '  PRESENT  %-26s (%s definitions)\n' "$v" "$n"
	else
		printf '  ABSENT   %-26s <-- delete this mapping\n' "$v"
	fi
done

head1 "4. DARK MODE MECHANISM"
echo "Where data-theme is written:"
grep -rn "setAttribute(\"data-theme\"\|setAttribute('data-theme'" \
	"$FRAPPE"/frappe/public/js/ 2>/dev/null | head -10 || echo "  (no direct setAttribute found)"
echo
echo "Theme-setting functions:"
grep -rn "set_theme\|toggle_theme\|desk_theme" \
	"$FRAPPE"/frappe/public/js/ 2>/dev/null | head -10 || echo "  (none found)"
echo
echo "Dark selectors in SCSS:"
grep -rhoE '\[data-theme=.?dark.?\]|\.dark-theme|\.theme-dark' \
	"$FRAPPE"/frappe/public/scss/ 2>/dev/null | sort | uniq -c | sort -rn | head
echo
echo "IF NOTHING APPEARS ABOVE, this build does not express dark mode via"
echo "data-theme, and \$ph-dark in tokens/_scope.scss will never match."

head1 "5. SELECTORS"
echo "Every class Phenomenon UI styles, checked against installed source."
echo "0 files means the rule can never match — delete it."
echo
for c in navbar navbar-brand standard-sidebar-item standard-sidebar-label \
	layout-side-section list-sidebar sidebar-label list-row-container \
	list-row-head list-row list-subject list-count form-section section-head \
	form-tabs-list form-page form-dashboard-section page-head widget \
	widget-head number-card modal-content modal-header modal-footer \
	grid-heading-row grid-row dt-row--header dt-cell indicator-pill \
	form-control control-label btn-primary btn-default awesomplete \
	standard-filter-section filter-selector sort-selector no-result \
	skeleton-card placeholder-block; do
	n=$(grep -rl "$c" "$FRAPPE" "$ERPNEXT" 2>/dev/null | wc -l | tr -d ' ')
	if [ "$n" -gt 0 ]; then
		printf '  FOUND    %-26s (%s files)\n' ".$c" "$n"
	else
		printf '  MISSING  %-26s <-- delete the rule\n' ".$c"
	fi
done

head1 "6. SELECTED-STATE CLASS (the important one)"
echo "desk/_sidebar.scss assumes '.selected'. An active state that never"
echo "matches is the half-styled look that reads worse than no theme."
echo
grep -rn "standard-sidebar-item" "$FRAPPE"/frappe/public/ 2>/dev/null | head -12
echo
grep -rnoE "addClass\(.selected.\)|classList.add\(.selected.\)|'selected'|\"selected\"" \
	"$FRAPPE"/frappe/public/js/frappe/views/ 2>/dev/null | head -8

head1 "7. BUNDLER"
echo "How *.bundle.scss is discovered:"
grep -rn "bundle.scss\|bundle.css" "$FRAPPE"/frappe/build.py "$FRAPPE"/esbuild/*.js 2>/dev/null | head -12
echo
echo "How app_include_css is consumed:"
grep -rn "app_include_css" "$FRAPPE"/frappe/ 2>/dev/null | head -6

head1 "8. BUILT ASSETS"
if [ -d "sites/assets/phenomenon_ui/dist" ]; then
	find sites/assets/phenomenon_ui/dist -type f \( -name '*.css' -o -name '*.js' \) \
		-exec ls -la {} \;
	echo
	echo "Budget: CSS <= 60 KB (61440 B), JS <= 8 KB (8192 B)"
else
	echo "sites/assets/phenomenon_ui/dist not found."
	echo "The app has not been built. Run: bench build --app phenomenon_ui"
fi

head1 "9. INSTALLED VERSION"
if [ -d "apps/phenomenon_ui/.git" ]; then
	git -C apps/phenomenon_ui log --oneline -3
	echo
	echo "Branch: $(git -C apps/phenomenon_ui rev-parse --abbrev-ref HEAD)"
	echo "Behind origin? Run: git -C apps/phenomenon_ui fetch && git -C apps/phenomenon_ui status"
else
	echo "(apps/phenomenon_ui is not a git checkout)"
fi

head1 "END OF REPORT"
echo "Next: open the desk, go to Phenomenon UI Settings -> Run Diagnostics,"
echo "and copy that report too. Source and runtime answer different halves."
