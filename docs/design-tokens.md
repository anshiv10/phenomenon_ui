# Design tokens

Phenomenon UI · Direction B · Instrument Panel · token specification v1.
Three blocks: light values, dark overrides, density variants. The SCSS source of
truth is `phenomenon_ui/public/scss/tokens/_palette.scss`; every value below is
emitted as a `--ph-*` custom property under `html[data-ph='on']`.

## Light (root)

```css
--ph-primary:            #0B5F68;
--ph-primary-hover:      #084E56;
--ph-primary-soft:       #DCEBED;
--ph-primary-contrast:   #FFFFFF;

--ph-surface-base:       #DDE1E6;
--ph-surface-primary:    #F7F9FA;
--ph-surface-secondary:  #EDF1F3;
--ph-surface-raised:     #FFFFFF;
--ph-surface-chrome:          #1E2A35;
--ph-surface-chrome-hover:    #2A3844;
--ph-surface-chrome-selected: #0F3D45;
--ph-chrome-edge:             #0B1219;

--ph-text-primary:       #16202B;
--ph-text-secondary:     #4A5A6B;
--ph-text-muted:         #5F6E7D;
--ph-text-inverse:       #FFFFFF;
--ph-text-on-chrome:       #DCE3EA;
--ph-text-on-chrome-muted: #93A3B2;

--ph-border-subtle:      #C9D2DA;
--ph-border-strong:      #7E8B98;

--ph-success:  #0F7A43;  --ph-success-soft: #DFF0E5;
--ph-warning:  #8A5A00;  --ph-warning-soft: #F7EBD2;
--ph-danger:   #B3261E;  --ph-danger-soft:  #F8E3E1;
--ph-info:     #1B5FA8;  --ph-info-soft:    #E1ECF8;

--ph-shadow-sm: 0 1px 2px rgba(11,20,29,.10), 0 0 0 1px rgba(11,20,29,.06);
--ph-shadow-md: 0 6px 16px rgba(11,20,29,.14), 0 0 0 1px rgba(11,20,29,.08);
--ph-shadow-lg: 0 18px 40px rgba(11,20,29,.22);

--ph-radius-sm: 3px;
--ph-radius-md: 6px;
--ph-radius-lg: 10px;

--ph-space-1: 2px;  --ph-space-2: 4px;
--ph-space-3: 8px;  --ph-space-4: 12px;
--ph-space-5: 16px; --ph-space-6: 24px;

--ph-control-height: 32px;
--ph-row-padding:    7px 12px;
--ph-section-gap:    24px;

--ph-font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Inter, system-ui, sans-serif;
--ph-font-mono: ui-monospace, "SF Mono", "Cascadia Mono", "Segoe UI Mono", "Roboto Mono", monospace;

--ph-text-xs: 11px;  --ph-text-sm: 12px;
--ph-text-md: 13px;  --ph-text-lg: 15px;
--ph-text-xl: 21px;

--ph-weight-regular:  400;
--ph-weight-medium:   500;
--ph-weight-semibold: 600;
```

## Dark overrides (`html[data-ph='on'][data-theme='dark']`)

```css
--ph-primary:            #4FC3CE;
--ph-primary-hover:      #6FD3DC;
--ph-primary-soft:       #123840;
--ph-primary-contrast:   #06222A;

--ph-surface-base:       #0E141A;
--ph-surface-primary:    #18212B;
--ph-surface-secondary:  #202B36;
--ph-surface-raised:     #26313D;
--ph-surface-chrome:          #0A0F14;
--ph-surface-chrome-hover:    #161F28;
--ph-surface-chrome-selected: #123840;
--ph-chrome-edge:             #000000;

--ph-text-primary:       #E8EDF2;
--ph-text-secondary:     #A9B7C4;
--ph-text-muted:         #8493A1;
--ph-text-inverse:       #0E141A;
--ph-text-on-chrome:       #DCE3EA;
--ph-text-on-chrome-muted: #8493A1;

--ph-border-subtle:      #2C3946;
--ph-border-strong:      #5E7183;

--ph-success:  #4ED18A;  --ph-success-soft: #12301F;
--ph-warning:  #E2B44A;  --ph-warning-soft: #332810;
--ph-danger:   #FF7A70;  --ph-danger-soft:  #3A1A17;
--ph-info:     #6BB4F5;  --ph-info-soft:    #12283A;

/* shadow becomes ring: depth reads as edge here */
--ph-shadow-sm: 0 0 0 1px #2C3946;
--ph-shadow-md: 0 8px 24px rgba(0,0,0,.60), 0 0 0 1px #2C3946;
--ph-shadow-lg: 0 20px 48px rgba(0,0,0,.75), 0 0 0 1px #2C3946;
```

## Density variants (`data-ph-density`) — three tokens, nothing else

```css
/* compact */
--ph-control-height: 26px;
--ph-row-padding:    4px 10px;
--ph-section-gap:    16px;

/* comfortable — default, in root */
--ph-control-height: 32px;
--ph-row-padding:    7px 12px;
--ph-section-gap:    24px;

/* spacious */
--ph-control-height: 38px;
--ph-row-padding:    10px 14px;
--ph-section-gap:    32px;
```

Type sizes do not change with density. 13px is the floor in all three modes.

## Derived tokens (added by the app, no new hex)

The usage table names a different token for light and dark on four surfaces.
These aliases carry that switch so component rules stay to one declaration:

| Token | Light | Dark |
|---|---|---|
| `--ph-surface-canvas` | surface-primary | surface-base |
| `--ph-surface-card` | surface-raised | surface-primary |
| `--ph-surface-disabled` | surface-base | surface-chrome |
| `--ph-canvas-edge` | chrome-edge | border-subtle |

## Light chrome (`data-ph-chrome='light'`) — the one offered deviation

Re-points only the chrome family at surfaces the content already uses:
chrome → surface-raised, chrome-hover → surface-secondary,
chrome-selected → primary-soft, chrome-edge → border-subtle,
text-on-chrome → text-primary, text-on-chrome-muted → text-muted.

## The focus contract

Teal appears in exactly four places: the focused control, the selected list
row, the selected sidebar item, and the primary action. The first three are
drawn the same way: a 3px accent bar on the leading edge plus a soft accent
wash. If teal ever appears on a heading, an icon row or a decorative divider,
the signature is dead. Links inside content use `--ph-primary` because a link
is a target; nothing else qualifies.
