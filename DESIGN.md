# PhoneBlade — UI/UX Design System & Google Stitch Specification

> **Target Tool**: [Google Stitch](https://labs.google/stitch)  
> **Format**: `DESIGN.md` (Stitch Agent Design System & Generation Spec)  
> **Project**: **PhoneBlade** — Desktop Webcam Hand-Tracking Fruit-Slicing Game (Cyberpunk / Neo-Arcade Aesthetic)

---

## 1. Project Vision & Brand Identity

PhoneBlade is a fast-paced, browser-based fruit slicing game where players use physical webcam hand gestures (karate chops, pointing fingers, sword swings) to slice 3D flying fruit in real-time.

- **Genre**: Motion Arcade / Spatial Casual Game (Fruit Ninja meets Beat Saber)
- **Vibe / Aesthetic**: **Neo-Cyber Arcade & Kinetic Glassmorphism**
  - Dark, immersive stadium/dojo atmosphere
  - High-contrast neon glows that POP against the webcam background
  - Translucent frosted-glass panels (`backdrop-filter: blur(16px)`) that never occlude incoming fruit
  - Crisp, futuristic geometric typography and arcade juice

---

## 2. Design System Tokens (Stitch Palette & Typography)

### 2.1 Color Palette
```yaml
Surfaces:
  background-deep: "#07090e"      # Deep void background
  background-elevated: "#0d1117"  # Modal / card background
  surface-glass: "rgba(16, 22, 34, 0.75)" # Frosted HUD panels
  surface-glass-border: "rgba(255, 255, 255, 0.12)"
  surface-glass-hover: "rgba(26, 35, 54, 0.85)"

Neon Accents (Active / Highlights):
  neon-cyan: "#00f0ff"            # Primary action, blade glow, main CTA
  neon-mint: "#7af0c8"            # Success, combo streaks, start button
  laser-yellow: "#ffd600"         # Combo banner, stars, score highlights
  plasma-pink: "#ff2a85"          # Danger, bombs, high-intensity blade
  cyber-purple: "#9d4edd"         # Armory rare items, special fruit

Fruit Theme Colors:
  apple-red: "#ff3344"
  orange-amber: "#ff9900"
  watermelon-green: "#26de81"
  watermelon-flesh: "#ff2a55"

Text:
  text-primary: "#f8fafc"
  text-secondary: "#94a3b8"
  text-muted: "#64748b"
  text-accent: "#7af0c8"
```

### 2.2 Typography
```yaml
Display & Titles:
  family: "'Space Grotesk', 'Rajdhani', sans-serif"
  weights: [700, 800, 900]
  character: Aggressive, clean geometric, slight arcade slant

Body & UI:
  family: "'Inter', 'Plus Jakarta Sans', sans-serif"
  weights: [400, 500, 600, 700]

Numbers & Scores:
  family: "'JetBrains Mono', 'Chakra Petch', monospace"
  weights: [700, 800]
  character: Monospaced tabular figures for animated score counters
```

### 2.3 Component Styling Standards
- **Border Radius**: Small badges `6px`, Cards `14px`, Floating HUD pill `24px`, Action buttons `10px`.
- **Elevation & Shadows**:
  - Button Glow: `box-shadow: 0 0 24px rgba(0, 240, 255, 0.45);`
  - Glass Border: `1px solid rgba(255, 255, 255, 0.14);`
  - Backdrop Blur: `backdrop-filter: blur(12px) saturate(180%);`

---

## 3. Screen-by-Screen UI Specifications for Stitch

### Screen 1: Start & Camera Permission Hero Screen
*The initial state before camera starts, establishing immediate arcade excitement.*

- **Layout**: Centered modal over dark ambient particle background with live camera framing silhouette.
- **Header**:
  - Glowing animated title: **PHONEBLADE** with neon gradient underline and glowing katana slash logo.
  - Subtitle: *"Slice Flying Fruit with Your Bare Hands — Powered by AI Hand Tracking"*.
- **Interactive Camera Onboarding Card**:
  - Video preview silhouette box with animated scanning grid.
  - Badge: `🔒 100% On-Device WebCam Tracking · No Data Sent`.
  - Giant Pulse CTA Button: **[ ⚔️ START BLADE ENGINE ]** (Gradient `#00f0ff` to `#7af0c8` with breathing glow).
- **Quick Hand Gesture Preview**:
  - 3 mini animated glyph cards:
    1. ☝️ *Pointer Finger* (Laser Dagger)
    2. ✋ *Karate Chop* (Katana Blade)
    3. ✊ *Fist Swing* (Energy Sabre)
- **Top Right Utilities**: Mode switcher (`Classic Fruit`, `Zen Dojo`, `Blade Armory`, `Sensitivity Tuning`).

---

### Screen 2: In-Game Spatial HUD (During Active Gameplay)
*Minimalist HUD that maximizes play area and frames the webcam player.*

- **Top Bar**:
  - **Left**: Current Score widget (`SCORE: 1,480`) with animated ticker roll.
  - **Center**:
    - Subtle guidance pill: `👋 Wave or swipe hand to slice` (fades after first 3 slices).
    - Floating dynamic **COMBO BANNER**: `⚡ COMBO x4! +160` with electric aura and sound wave pulse.
  - **Right**:
    - **Lives Indicator**: 3 neon heart/blade icons (`❤️❤️❤️`). Loses opacity/shatters into particles when a fruit drops.
    - Quick Pause button `[ ⏸️ ESC ]`.
- **Webcam Framing**:
  - Cyberpunk corner brackets on the 4 corners of the screen (`L-shaped cyan neon markers`).
  - Subtle dark vignette around screen edges to focus eyes on the center play area.
- **Real-Time Hand Blade Visuals**:
  - Glowing Neon Slash Trail that follows the fingertip.
  - Electric aura pulse at the hand cutting edge.
  - Splatter particle burst at slice location with fruit-matching colors.
- **Bottom Left Drawer**:
  - Compact Glass Pill: `Landmark: Index Tip` · `FPS: 60` · `Tracking: 99.8%`.

---

### Screen 3: Game Over & Score Summary Modal
*High-adrenaline arcade results screen designed for screenshot sharing.*

- **Modal Container**: Sleek frosted glass card with glowing cyber-neon border.
- **Header**:
  - Dynamic result title: `NEW HIGH SCORE!` (Gold) or `DOJO MASTERED!` (Cyan).
- **Stats Dashboard Grid (2x2)**:
  1. **Final Score**: Giant bold digits with animated spark effects (`2,850 PTS`).
  2. **Fruit Sliced**: `48 Fruits` with mini fruit breakdown pills (🍎 22 · 🍊 18 · 🍉 8).
  3. **Max Combo**: `x7 MEGA COMBO`.
  4. **Blade Velocity**: `Avg 840 px/s` with a "Ninja Agility" rating badge (Rank: S+).
- **Action Button Row**:
  - Primary CTA: **[ 🔄 PLAY AGAIN (Space) ]** (Neon Mint glow).
  - Secondary: **[ 🗡️ CUSTOMIZE BLADE ]** (Frosted glass).
  - Tertiary: **[ 📋 LEADERBOARD ]** (Outlined).

---

### Screen 4: Blade Armory & Customization (Blade Skin Selector)
*Allows players to choose their neon slash trail color and blade theme.*

- **Armory Grid**:
  1. **Cyber Katana** (Default Cyan / Electric Blue with trail sparks).
  2. **Solar Flare** (Fiery Orange & Molten Gold).
  3. **Plasma Sabre** (Vibrant Magenta & Vaporwave Violet).
  4. **Emerald Dragon** (Toxic Neon Green & Lime).
- **Live Preview Stage**: Interactive area where moving the mouse/hand immediately paints the selected slash trail to preview the effect.

---

### Screen 5: Settings & Hand Calibration Drawer
*Slide-out panel from the right for webcam and gesture sensitivity.*

- **Webcam Input**: Camera device selector dropdown.
- **Mirroring Toggle**: `[x] Mirror Video Feed (Selfie Mode)`.
- **Gesture Sensitivity Slider**:
  - *Casual Wave (Low Threshold)* <---------> *Fast Karate Chop (High Threshold)*.
- **Audio Mixers**:
  - Slice SFX Volume (0-100%).
  - Whoosh / Swish Sound Volume (0-100%).
- **Show Debug Hitboxes Toggle**: Checkbox for showing 3D collision circles.

---

## 4. Google Stitch Prompt Sequence (Copy & Paste directly into Stitch)

### Prompt 1: The Main Game Screen & Active HUD
> *"Create a desktop browser UI for 'PhoneBlade', a futuristic cyberpunk fruit-slicing webcam game inspired by Fruit Ninja and Beat Saber. Dark background (#07090e) with a live full-screen camera play area. The HUD features floating glassmorphism panels with 1px border highlights, neon cyan (#00f0ff) and mint (#7af0c8) accents. Top bar displays Score ticker in JetBrains Mono font, 3 neon blade lives, and an electric 'COMBO x3!' banner with a glowing pulse. The screen has sci-fi corner brackets framing the player, and a glowing neon cyan slash trail cutting through flying fruit. Bottom right features a sleek semi-transparent control pill for audio and pause. Style: Clean, high-tech, kinetic neo-arcade."*

### Prompt 2: The Start / Ready Screen with Camera Preview
> *"Design the Start Game hero overlay for PhoneBlade in Google Stitch. Frosted dark glass modal (backdrop-filter blur, 1px border) centered on screen. Glowing logo 'PHONEBLADE' with katana slash effect. Include an interactive webcam preview container with glowing corner brackets, a badge reading '100% On-Device AI Tracking', and a huge pulsating neon-mint button reading 'START BLADE ENGINE'. Beneath it, show 3 hand gesture guide cards: Pointer Finger (Laser Dagger), Karate Chop (Katana), and Fist (Plasma Sabre). Include mode tabs at the top for Classic, Zen, and Blade Armory."*

### Prompt 3: Game Over & High Score Screen
> *"Design a celebratory Game Over / Victory results modal for PhoneBlade. Dark cyber-glass card with glowing golden neon rim. Displays 'NEW HIGH SCORE!' in aggressive geometric font, final score '3,420 PTS' in large glowing monospaced numbers, and a 2x2 stats grid: Fruits Sliced (with apple, orange, watermelon breakdown), Max Combo (x8), Blade Agility Rank (S+ Rank badge), and Slices/Sec. Bottom row features two high-contrast buttons: 'PLAY AGAIN' (primary neon cyan button) and 'BLADE ARMORY' (secondary frosted outline button)."*

---

## 5. CSS Glassmorphism & Neon Utility Snippets (For Implementation)

```css
/* Stitch Glassmorphism Card */
.stitch-glass-panel {
  background: rgba(13, 17, 23, 0.78);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.5);
}

/* Neon Glow Button */
.stitch-neon-btn {
  background: linear-gradient(135deg, #00f0ff 0%, #7af0c8 100%);
  color: #07090e;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 800;
  letter-spacing: 0.5px;
  border-radius: 10px;
  border: none;
  box-shadow: 0 0 20px rgba(0, 240, 255, 0.45);
  transition: all 0.2s ease;
}

.stitch-neon-btn:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 0 32px rgba(0, 240, 255, 0.7);
}

/* Cyber Bracket Frame */
.stitch-corner-bracket {
  position: absolute;
  width: 24px;
  height: 24px;
  border-color: #00f0ff;
  border-style: solid;
  opacity: 0.65;
  pointer-events: none;
}
```
