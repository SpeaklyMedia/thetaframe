# ThetaFrame Brand Asset Notes

**Extracted:** 2026-04-14
**Source:** `THETAFRAME_REPLIT_COMPLETE_SEND_SET__2026-04-13__R1_1776123059478.zip`
→ inner: `ThetaFrame_Replit_Activation_Pack_R2__2026-04-13__R1.zip`
→ inner: `brand_assets/`

**Destination:** `artifacts/thetaframe/public/brand/`

---

## Files

| File | Extracted Size | Transforms Applied |
|------|---------------|-------------------|
| `THETAFRAME_LOGO_PRIMARY__BRAND_SPLASH__2026-04-13__R1.png` | 1514.4 KB | None — verbatim extraction |
| `THETAFRAME_LOGO_SECONDARY__WORDMARK_VARIANT__2026-04-13__R1.png` | 1442.6 KB | None — verbatim extraction |
| `THETAFRAME_LOGO_MARK__PHI_CROP__2026-04-13__R1.png` | 521.0 KB | None — verbatim extraction |
| `THETAFRAME_LOADING_SCREEN_PRIMARY__COSMIC_PHI__2026-04-13__R1.png` | 1756.9 KB | None — verbatim extraction |
| `THETAFRAME_BRAND_PALETTE_CUES__2026-04-13__R1.png` | 30.9 KB | None — verbatim extraction |

Original composition intent is fully preserved. No resize, recompress, or format conversion was performed.

---

## Usage Mapping

| Asset | Usage in App |
|-------|-------------|
| `LOGO_PRIMARY__BRAND_SPLASH` | Sign-in page splash — centered above sign-in form |
| `LOGO_SECONDARY__WORDMARK_VARIANT` | Fallback for sign-in and auth splash contexts |
| `LOGO_MARK__PHI_CROP` | Shell header top-left compact brand mark |
| `LOADING_SCREEN_PRIMARY__COSMIC_PHI` | App startup loading state (auth/session resolution only — not routine route changes) |
| `BRAND_PALETTE_CUES` | Reference only — not rendered in UI |

---

## Palette Anchors (from spec)

| Token | Hex |
|-------|-----|
| Brand Midnight | `#0A1F36` |
| Brand Navy | `#0A213C` |
| Phi Teal | `#1090A0` |
| Phi Blue | `#005070` |
| Wordmark Light | `#D0C0B0` |
| Sync Gold | `#C07000` |

---

## Motion Rules Applied

- Startup loading uses slow CSS `opacity` breath animation (`2.4s ease-in-out infinite alternate`)
- `@media (prefers-reduced-motion: reduce)` collapses animation to static display
- No fast spinning, aggressive zoom, or repeated flashes
- Loading screen does NOT appear on routine route changes (only on initial auth resolution)
