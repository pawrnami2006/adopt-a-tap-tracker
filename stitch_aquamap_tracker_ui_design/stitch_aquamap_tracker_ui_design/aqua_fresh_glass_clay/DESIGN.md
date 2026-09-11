---
name: Aqua Fresh Glass & Clay
colors:
  surface: '#f4fbfa'
  surface-dim: '#d4dbdb'
  surface-bright: '#f4fbfa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eef5f4'
  surface-container: '#e8efee'
  surface-container-high: '#e2eae9'
  surface-container-highest: '#dde4e3'
  on-surface: '#161d1d'
  on-surface-variant: '#3c4949'
  inverse-surface: '#2b3231'
  inverse-on-surface: '#ebf2f1'
  outline: '#6c7a7a'
  outline-variant: '#bcc9c9'
  surface-tint: '#00696b'
  primary: '#00696b'
  on-primary: '#ffffff'
  primary-container: '#42c6c9'
  on-primary-container: '#004f50'
  inverse-primary: '#59d9dc'
  secondary: '#00696e'
  on-secondary: '#ffffff'
  secondary-container: '#97eef4'
  on-secondary-container: '#006e73'
  tertiary: '#436467'
  on-tertiary: '#ffffff'
  tertiary-container: '#98bbbe'
  on-tertiary-container: '#2a4b4f'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#79f5f8'
  primary-fixed-dim: '#59d9dc'
  on-primary-fixed: '#002021'
  on-primary-fixed-variant: '#004f51'
  secondary-fixed: '#9af1f7'
  secondary-fixed-dim: '#7dd4da'
  on-secondary-fixed: '#002022'
  on-secondary-fixed-variant: '#004f53'
  tertiary-fixed: '#c6e9ec'
  tertiary-fixed-dim: '#aacdd0'
  on-tertiary-fixed: '#002022'
  on-tertiary-fixed-variant: '#2b4c4f'
  background: '#f4fbfa'
  on-background: '#161d1d'
  surface-variant: '#dde4e3'
  text-muted: '#789092'
  status-working: '#22C55E'
  status-working-bg: '#E8F8EE'
  status-warning: '#F59E0B'
  status-warning-bg: '#FEF3C7'
  status-danger: '#EF4444'
  status-danger-bg: '#FEE2E2'
  status-pending: '#8B5CF6'
  status-pending-bg: '#EDE9FE'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.03em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-sm: 0.75rem
  gutter-lg: 1.5rem
  margin: 1rem
  margin-md: 1.5rem
  margin-lg: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

# AquaMap / Adapt a Tap Tracker Design System

## 1. Visual Direction & Personality
- **Personality**: Clean, fresh, trustworthy, modern civic-tech & environmental app. A living community map of water and sanitation points.
- **Visual Style**: Translucent glassmorphism containers (`backdrop-blur-md bg-white/80` or `bg-white/90`) paired with soft, tactile claymorphism for interactive controls (smooth dual-shadow pill capsules, inset shadows for active states, gentle 3D elevation).
- **Aesthetic Guidance**: Light-mode-only. Floating controls elevated directly over the interactive map canvas. Never generic admin CRUD or dense tables.

## 2. Color Palette & Semantics
- **Background Base**: `#F3FAF9` (very light fresh aqua tint)
- **Primary Aqua**: `#42C6C9` (vibrant clean fresh water)
- **Deep Aqua**: `#167D83` (oceanic teal for high contrast text & icons)
- **Dark Deep Teal / Text Primary**: `#183A3D` (rich readable deep spruce)
- **Secondary Text**: `#789092` (balanced muted slate aqua)
- **Glass Card Fill**: `rgba(255, 255, 255, 0.85)` with `backdrop-filter: blur(16px)`
- **Glass Border / Highlight**: `rgba(255, 255, 255, 0.9)` top/left highlight, `rgba(22, 125, 131, 0.08)` outer border
- **Status Colors (Used ONLY for functional status)**:
  - Working / Clean: `#22C55E` / `#E8F8EE` (soft mint emerald)
  - Issue / Average: `#F59E0B` / `#FEF3C7` (soft warm amber)
  - Broken / Dirty: `#EF4444` / `#FEE2E2` (soft coral red)
  - Pending / Verifying: `#8B5CF6` / `#EDE9FE` or `#42C6C9` dashed badge

## 3. Claymorphism & Elevation System
- **Clay Button Default**: `background: linear-gradient(145deg, #FFFFFF, #E6F4F3); box-shadow: 4px 6px 14px rgba(22, 125, 131, 0.12), -3px -3px 8px rgba(255, 255, 255, 0.9), inset 1px 1px 2px rgba(255, 255, 255, 1);`
- **Clay Button Primary / Active**: `background: linear-gradient(135deg, #42C6C9 0%, #167D83 100%); color: #ffffff; box-shadow: 0 6px 16px rgba(22, 125, 131, 0.28), inset 0 2px 2px rgba(255, 255, 255, 0.4);`
- **Clay Floating FAB**: Large circular pill with multi-stop drop shadows and soft inner glow.
- **Glass Container**: `backdrop-blur-xl bg-white/80 border border-white/60 shadow-[0_12px_36px_rgba(24,58,61,0.08)]`

## 4. Typography & Shape Language
- **Font Family**: Plus Jakarta Sans, Inter, system-ui, -apple-system, sans-serif
- **Corner Radii**:
  - Cards & Floating Panels: `rounded-3xl` (24px - 28px)
  - Bottom Sheet: `rounded-t-[32px]`
  - Interactive Buttons & Pills: `rounded-2xl` (16px - 20px)
  - Badges & Chips: `rounded-full`
- **Touch Targets**: Min 44px-48px on mobile for thumb friendliness.
