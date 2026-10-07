---
name: Futty Corporate Athletic
colors:
  surface: '#f8f9ff'
  surface-dim: '#d2daeb'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff3ff'
  surface-container: '#e6eeff'
  surface-container-high: '#e1e8f9'
  surface-container-highest: '#dbe3f3'
  on-surface: '#141c28'
  on-surface-variant: '#434651'
  inverse-surface: '#29313d'
  inverse-on-surface: '#ebf1ff'
  outline: '#747783'
  outline-variant: '#c4c6d3'
  surface-tint: '#375bac'
  primary: '#113d8d'
  on-primary: '#ffffff'
  primary-container: '#3155a6'
  on-primary-container: '#bfcfff'
  inverse-primary: '#b2c5ff'
  secondary: '#5e4eb7'
  on-secondary: '#ffffff'
  secondary-container: '#a192ff'
  on-secondary-container: '#36228d'
  tertiary: '#013c93'
  on-tertiary: '#ffffff'
  tertiary-container: '#2a55ac'
  on-tertiary-container: '#bfcfff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2ff'
  primary-fixed-dim: '#b2c5ff'
  on-primary-fixed: '#001847'
  on-primary-fixed-variant: '#1a4293'
  secondary-fixed: '#e5deff'
  secondary-fixed-dim: '#c8bfff'
  on-secondary-fixed: '#190064'
  on-secondary-fixed-variant: '#46359d'
  tertiary-fixed: '#dae2ff'
  tertiary-fixed-dim: '#b1c5ff'
  on-tertiary-fixed: '#001946'
  on-tertiary-fixed-variant: '#0d4299'
  background: '#f8f9ff'
  on-background: '#141c28'
  surface-variant: '#dbe3f3'
typography:
  display-hero:
    fontFamily: Chivo
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 52px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Chivo
    fontSize: 34px
    fontWeight: '800'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-xl:
    fontFamily: Chivo
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Chivo
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Chivo
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  score-display:
    fontFamily: Chivo
    fontSize: 28px
    fontWeight: '800'
    lineHeight: 32px
    letterSpacing: 0.02em
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Hanken Grotesk
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Chivo
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.02em
  label-md:
    fontFamily: Chivo
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-sm:
    fontFamily: Chivo
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.06em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.25rem
---

## Brand & Style

This design system drives a premium corporate futsal tournament management application. It bridges executive corporate professionalism with high-tempo court energy: structured, precise, decisive, yet punchy and kinetic. 

The aesthetic is Modern Corporate Athletic:
- **Structural Precision:** Crisp layout grids, meticulous containment lines, and strong typographic hierarchy derived from sports statistics consoles.
- **Tactile Match Day Elements:** High-contrast scoreboards, state badges, and tangible tournament cards grounded in physical depth and structured micro-surfaces.
- **Tone:** Authoritative, energetic, reliable, and frictionless for league organizers, captains, and corporate players reviewing fixtures in high-pressure match environments.

## Colors

The palette balances formal organizational governance with athletic performance:

- **Primary Colors:**
  - `#17233C` (Deep Navy): Primary header bars, match day hero wrappers, high-emphasis text, and dark structural foundations.
  - `#3155A6` (Corporate Blue): Primary CTAs, active tab accents, and default brand indicators.
  - `#4169C1` (Digital Blue): Interactive focus rings, dynamic live-game indicators, and accent states.
- **Accent:**
  - `#6B5CC5` (Contour Purple): Standings leaders, MVP badges, knockout bracket connectors, and spotlight moments.
- **Neutrals & Surfaces:**
  - `#F7F9FC` (Off White): Main canvas background.
  - `#EAF1FF` (Soft Blue): Highlighted table rows, subtle card accents, and selected container states.
  - `#FFFFFF` (White): Standard card surface and panel backgrounds.
  - `#E4E7EC` (Light Gray): Delimiting borders, divider lines, and card stroke thresholds.
  - `#1C2430` (Dark Charcoal): Base text and high-contrast numerical readouts.
  - `#667085` (Slate Gray): Secondary labels, tournament metadata, timestamps, and captions.
- **System States:**
  - `#22A06B` (Success Green): Won matches, qualified bracket status, and pitch availability.
  - `#F5A623` (Warning Amber): Yellow cards, pending review, extra time, or fixture delays.
  - `#D92D20` (Error Red): Red cards, match forfeit, disqualified teams, and critical alerts.

## Typography

The typographic hierarchy pairs **Chivo** for display, score lines, headlines, and data headers with **Hanken Grotesk** for long-form narrative, rosters, and operational forms.

- **Chivo** provides an assertive, athletic cut with squared terminals and dense numerals ideal for match clocks, scores, standings, and stage headers.
- **Hanken Grotesk** maintains legibility at dense tabular intervals, player statistics, and match rosters.
- Match scores, player numbers, and live clock elements must enforce tabular figures (`font-variant-numeric: tabular-nums`) to prevent horizontal jitter during score adjustments and clock updates.

## Layout & Spacing

The layout philosophy follows a structured hybrid fluid grid anchored to a standard 8pt spatial baseline:

- **Breakpoints:**
  - **Mobile (< 768px):** 4 columns, `margin: 1rem`, `gutter: 1rem`. Focus is on full-width vertical card stacks and scrolling tournament brackets.
  - **Tablet (768px - 1024px):** 8 columns, `margin-tablet: 1.5rem`, `gutter: 1rem`. Double-column match lists with pinned filter ribbons.
  - **Desktop (> 1024px):** 12 columns, max-width `1280px` centered, `margin-desktop: 2.5rem`, `gutter-desktop: 1.5rem`. Enables side-by-side pitch layouts, live bracket trees, and match log sidebars.
- **Rhythm Rules:**
  - Card internal padding uses strict `space-md` (`1rem`) on mobile and scales to `space-lg` (`1.5rem`) on desktop.
  - Component stacks (e.g., fixtures list, player stat rows) maintain a persistent `space-sm` (`0.5rem`) gap for clear demarcation.

## Elevation & Depth

Visual hierarchy merges crisp tactile lines with layered surface containment rather than heavy, diffuse shadows.

- **Outlines First:** Primary layering relies on crisp 1px borders using `#E4E7EC`. Elements stay grounded and athletic without excessive blur.
- **Surface Elevation Levels:**
  - **Base Canvas:** `#F7F9FC` serves as the non-elevated ground plane.
  - **Level 1 (Cards, Tables, Panels):** `#FFFFFF` surface bounded by a 1px `#E4E7EC` border and an ambient downward shift: `0 2px 4px 0 rgba(23, 35, 60, 0.04), 0 1px 2px 0 rgba(23, 35, 60, 0.02)`.
  - **Level 2 (Tactile Interactive / Match Cards):** Slightly lifted card states during hover or active game focus: `0 8px 16px -4px rgba(23, 35, 60, 0.08), 0 2px 6px -1px rgba(23, 35, 60, 0.04)`.
  - **Level 3 (Modals, Match Event Drawers, Popovers):** High floating layer: `0 20px 24px -4px rgba(23, 35, 60, 0.12), 0 8px 8px -4px rgba(23, 35, 60, 0.04)`.
- **Athletic Contrast Accents:** Active and live match modules feature an inset vertical indicator band (4px width) in `#4169C1` or `#22A06B` on the leading edge to deliver instant state recognition.

## Shapes

The roundedness level is configured to **Level 2 (Rounded)**:
- Standard elements (buttons, input fields, tactical chips, player tags) employ `0.5rem` (8px) corner radii.
- Medium components (match cards, stats pods, fixture items) use `rounded-lg` at `1rem` (16px).
- Large containment structures (bracket hubs, modals, scoreboard wrappers) utilize `rounded-xl` at `1.5rem` (24px).
- Status pills, score tags, and timer badges override this with fully rounded caps (`9999px`) to maintain athletic insignia conventions.

## Components

### Buttons
- **Primary:** Solid `#3155A6` background, white text, 8px border-radius, `Chivo` medium-weight font. Hover state transitions to `#17233C`. Active state adds `scale(0.98)` for tactile feedback.
- **Secondary:** White background with a 1.5px border in `#3155A6`, text in `#3155A6`. Hover triggers an `#EAF1FF` tint.
- **Tertiary / Ghost:** Transparent background with `#3155A6` text and hover fill in `#EAF1FF`.
- **Destructive:** `#D92D20` fill with white text for forfeit or match cancel actions.

### Match Day Cards (Tactile Signature Element)
- Built on a `#FFFFFF` base with a 1px `#E4E7EC` border and 16px corner radius.
- Divided into three distinct zones:
  1. **Header Zone:** League name, court number, and status badge (e.g., "LIVE - 1st Half", "FULL TIME", "UPCOMING").
  2. **Score Center:** Two-row team block displaying team badge, team name, and high-contrast tabular score boxes filled with `#F7F9FC` bordered by `#E4E7EC`.
  3. **Footer Bar:** Light blue `#EAF1FF` micro-strip listing referees, elapsed time, and goal scorers.
- Active "LIVE" cards receive a 2px `#4169C1` border and a pulsing `#22A06B` indicator dot.

### Chips & Badges
- **Status Pills:** Fully rounded (`9999px`), 10px uppercase `Chivo` with letter spacing `0.06em`.
  - *Live Match:* `#22A06B` text on `#22A06B15` background.
  - *Caution / Half-Time:* `#F5A623` text on `#F5A62315` background.
  - *Final:* `#17233C` text on `#EAF1FF` background.
- **Group/Pitch Filter Chips:** 8px border-radius, `#FFFFFF` background, 1px border `#E4E7EC`. Selected state uses `#17233C` background with `#FFFFFF` text.

### Form Inputs & Selectors
- `#FFFFFF` surface with 1px border in `#E4E7EC`. Focus state transitions border to `#4169C1` with a 3px outer ring tinted to `#4169C120`.
- Height: 44px for comfortable touch targets on pitch side lines. Placeholder color `#667085`.

### Checkboxes & Radio Controls
- Checkbox uses an 8px radius outline (4px on inner square) in `#E4E7EC`, transitioning to `#3155A6` with a white checkmark when selected.
- Radios are circular, featuring a solid `#3155A6` center ring when active.

### Lists & Standings Tables
- Alternating `#FFFFFF` and `#F7F9FC` row fills with 1px bottom border in `#E4E7EC`.
- Top 2 promotion positions feature a vertical 3px accent in `#6B5CC5` on the rank column. Relegation/elimination lines display a `#D92D20` mark.

### Scoreboard Header
- High-contrast block with `#17233C` background, white team titles, and yellow/green game clock readouts.