---
name: Cyberpunk Neo-Arcade HUD
colors:
  surface: '#111319'
  surface-dim: '#111319'
  surface-bright: '#37393f'
  surface-container-lowest: '#0c0e13'
  surface-container-low: '#191c21'
  surface-container: '#1d2025'
  surface-container-high: '#282a30'
  surface-container-highest: '#33353b'
  on-surface: '#e2e2ea'
  on-surface-variant: '#b9cacb'
  inverse-surface: '#e2e2ea'
  inverse-on-surface: '#2e3036'
  outline: '#849495'
  outline-variant: '#3b494b'
  surface-tint: '#00dbe9'
  primary: '#dbfcff'
  on-primary: '#00363a'
  primary-container: '#00f0ff'
  on-primary-container: '#006970'
  inverse-primary: '#006970'
  secondary: '#64dbb4'
  on-secondary: '#003829'
  secondary-container: '#1ca380'
  on-secondary-container: '#003024'
  tertiary: '#fff3f3'
  on-tertiary: '#67001d'
  tertiary-container: '#ffcdd0'
  on-tertiary-container: '#be003d'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#7df4ff'
  primary-fixed-dim: '#00dbe9'
  on-primary-fixed: '#002022'
  on-primary-fixed-variant: '#004f54'
  secondary-fixed: '#82f8cf'
  secondary-fixed-dim: '#64dbb4'
  on-secondary-fixed: '#002117'
  on-secondary-fixed-variant: '#00513d'
  tertiary-fixed: '#ffdadb'
  tertiary-fixed-dim: '#ffb2b8'
  on-tertiary-fixed: '#40000f'
  on-tertiary-fixed-variant: '#91002d'
  background: '#111319'
  on-background: '#e2e2ea'
  surface-variant: '#33353b'
typography:
  display-hero:
    fontFamily: Space Grotesk
    fontSize: 64px
    fontWeight: '700'
    lineHeight: 72px
  display-hero-mobile:
    fontFamily: Space Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: JetBrains Mono
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 14px
  telemetry-num:
    fontFamily: JetBrains Mono
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 52px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 0.75rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system channels an adrenaline-charged, high-precision neo-arcade experience. Engineered for spatial tracking, low-latency webcam inputs, and tactile spatial feedback, the aesthetic fuses gritty cyberpunk tactical HUDs with hyper-refined glassmorphism. It rejects muddy visual noise in favor of luminous optical physics: hyper-focused neon strikes, crisp 1px optical borders, laser-cut geometry, and dark obsidian negative space that guarantees rapid kinetic target acquisition.

The emotional target is hyper-focus, razor-sharp mastery, and arcade euphoria. Players should feel equipped with experimental, cutting-edge military cyberware rather than a casual mini-game interface.

## Colors

The palette is engineered for maximum photonic contrast against deep spatial voids.

- **Primary (`#00f0ff` Electric Cyan):** Active blade trails, lock-on vectors, core instrumentation, and prime interactive triggers.
- **Secondary (`#7af0c8` Cyber Mint):** Spatial tracking confirmation, calibration locks, combo multipliers, and operational status indicators.
- **Tertiary (`#ff0055` Electric Magenta):** Critical threats, bomb warnings, hyper-drive overdrive triggers, and high-priority alerts.
- **Accent Warning (`#ffb800` Amber Strike):** Proximity anomalies, combo break buffers, and secondary telemetry warnings.
- **Neutral Core (`#07090e` Deep Obsidian):** Deep spatial foundation. Never pure `#000000`; rich in deep-space blue-black undertones to allow glass transmission layers to refract background light without mudding visual priority.
- **Surface Elevation Levels:**
  - `Surface Tier 1`: `rgba(11, 16, 26, 0.65)`
  - `Surface Tier 2`: `rgba(15, 23, 38, 0.8)`
  - `Surface Tier 3 (Overlays)`: `rgba(22, 33, 54, 0.92)`
- **Border Gradients:** Linear directional borders from `rgba(0, 240, 255, 0.4)` fading into `rgba(0, 240, 255, 0.05)` along light-incidence axes.

## Typography

Typography strikes a balance between sharp computational readability and aggressive arcade pacing:
- **Headlines (`Space Grotesk`):** High-impact geometric sans with distinct angled cuts and mechanical poise. All primary stats and headers are tracked out (+0.05em to +0.1em) and rendered in uppercase to reinforce aerospace HUD hierarchy.
- **Data & Body (`JetBrains Mono`):** Fixed-pitch monospaced clarity eliminates tabular layout jitter during rapid score increments, frame-rate shifts, coordinate readouts, and webcam latency stats.
- **Micro-Labels (`JetBrains Mono` Uppercase):** Formatted with bracket prefixes (e.g., `[SYS.01]`, `[FPS_60]`, `[COMBO_X32]`) for authentic telemetry structure.

## Layout & Spacing

The layout is built around a perimeter-anchored tactical HUD overlay spanning over the live camera canvas:
- **Interactive Safe Zone:** A central 16:9 or full-viewport target field kept completely clear of dense structural UI to permit unobstructed physical hand/blade trajectory.
- **HUD Anchor Points:**
  - **Top Deck (Telemetry & Combo Bar):** Persistent score, energy status, and system latency pinned cleanly with `space-md` gaps.
  - **Flank Wings (Left/Right Rail):** Collapsible biometric tracking data, slash accuracy ratings, and webcam preview PIP.
  - **Bottom Deck (Tactical Action Controls):** High-precision status chips and active ability nodes.
- **Responsive Adaptations:**
  - **Desktop/Terminal View:** 12-column grid with `1.5rem` gutters; perimeter floating panels pinned with `2rem` margin.
  - **Mobile/Vertical Stream:** Fluid single-column safe container; 4-column HUD clusters with compact `0.75rem` gutters to maximize strike visibility.

## Elevation & Depth

Visual hierarchy uses layered photonic glassmorphism and directed laser-etched strokes instead of muddy drop shadows:

1. **Backdrop Reality Layer (Camera Video Buffer):** Base video stream treated with a slight ambient chromatic aberration and high-pass contrast filter.
2. **Surface Layer 1 (Tactical Glass):** `backdrop-filter: blur(16px)`; background tinted with `rgba(7, 9, 14, 0.7)`; bordered by 1px stroke of `rgba(0, 240, 255, 0.2)`.
3. **Surface Layer 2 (Active Hud Panels & Overlays):** `backdrop-filter: blur(24px)`; tinted with `rgba(15, 23, 38, 0.85)`; top and left borders highlighted with crisp 1px specular edges (`rgba(0, 240, 255, 0.5)`).
4. **Surface Layer 3 (Critical Overdrive & Modal Alerts):** Frosted glass tinted with `rgba(255, 0, 85, 0.12)` with an intense, localized neon edge glow (`box-shadow: inset 0 0 15px rgba(255, 0, 85, 0.25), 0 0 20px rgba(0, 240, 255, 0.15)`).
5. **Glow Logic:** Pure drop shadows are prohibited. Ambient photonic flares are localized to interactive components, scaling on active blade proximity or hover states.

## Shapes

The design language favors precision-engineered, faceted geometric profiles:
- **Roundedness Scale:** Set to `1` (Soft Minimal, `0.25rem` / `4px`), ensuring components maintain crisp, architectural edges without harsh raw brutalism.
- **Chamfers & Angled Cutouts:** Prominent UI containers and primary action triggers use a secondary cut-corner motif (45-degree chamfers on top-right and bottom-left edges at `8px` to `12px`).
- **Tactical Reticles:** Targeting reticles, energy nodes, and blade-strike vectors strictly adhere to polygonal, circular, or crosshair primitives with thin 1px concentric tracks.

## Components

### Buttons & Interactive Nodes
- **Primary Cyber-Trigger:** Chamfered button with `rgba(0, 240, 255, 0.12)` fill, 1px solid `#00f0ff` border, and text in `JetBrains Mono` bold uppercase. Hover/Blade-focus triggers a cyan flood fill (`#00f0ff`) with inverted deep obsidian text (`#07090e`) and a sharp outer flare (`0 0 20px rgba(0, 240, 255, 0.6)`).
- **Destructive / Overdrive Trigger:** Same mechanics driven by tertiary `#ff0055` with warning scanlines.

### Status Chips & Telemetry Tags
- Compact `space-xs` vertical, `space-sm` horizontal containers with monospaced code notation (`[STATUS: LOCKED]`).
- Left-aligned 6px pulsing LED indicator in `#7af0c8` (operational) or `#ffb800` (calibrating).

### Tactical Cards & Floating HUD Clusters
- Semi-transparent glass bodies (`rgba(11, 16, 26, 0.75)`) featuring 4-corner targeting brackets (1px L-shaped cyan guides).
- Subtle horizontal scanlines running at 4px intervals with 2% opacity.

### Kinetic Energy Meters & Progress Tracks
- Segmented linear gauges (micro tick marks spaced by 2px) replacing continuous bars.
- Color progression transforms dynamically: Cyber Mint (`#7af0c8`) at base state, transitioning through Electric Cyan (`#00f0ff`) to saturated Electric Magenta (`#ff0055`) at 100% blade overload.

### Input Fields & Sensitivity Dials
- Low-profile inputs with inset obsidian backgrounds (`rgba(3, 5, 8, 0.9)`), framed by lower-edge-only cyan borders that intensify upon active tracking focus.
- Sliders feature tactical numeric readouts and stepping pips.

### Checkboxes & Segmented Toggles
- Square toggles with sharp 45-degree inner crosschecks. Active states pulse with electric cyan backlight.