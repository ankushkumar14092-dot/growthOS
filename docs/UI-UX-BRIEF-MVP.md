# AI-Growth-OS — UI/UX Design Brief (MVP)

| Field | Value |
|-------|--------|
| **Product** | AI Growth Operating System (AI-Growth-OS) |
| **Document** | UI-UX-BRIEF-MVP |
| **Status** | Draft v0.2 |
| **Horizon** | Phase A (next 90 days) |
| **Companion** | [APP-FLOW-MVP](./APP-FLOW-MVP.md) · [TRD-MVP](./TRD-MVP.md) · [UI-UX-BRIEF-VISION](./UI-UX-BRIEF-VISION.md) |

> **Design rule:** Implement **this** brief for Phase A UI. Screens must match [APP-FLOW-MVP](./APP-FLOW-MVP.md). Do not ship Growth Brain Command Center, revenue/lead KPI theater, Autonomous mode, or heavy glassmorphism. Those live in [UI-UX-BRIEF-VISION](./UI-UX-BRIEF-VISION.md).

---

## 1. Design vibe

**Mission Control for safe website growth** — not a generic analytics dashboard.

Pro thesis — every screen should feel like:

> AI is working — you stay in control (**diff → apply → verify → rollback**).

Communicate via the **job timeline**, **trust strip**, and clear WordPress apply actions — not chart wallpaper, Inter + blue-purple clones, or glass cards everywhere.

Tone: premium enterprise, high trust, agency-tool density, AI-present but restrained.

---

## 2. Named language (MVP subset)

| Name | Use in MVP |
|------|------------|
| **Mission Timeline** | Job status stepper: queued → crawling → auditing → proposing → deploying → verifying → done/failed |
| **Trust Indicators** | `change_class` chip (safe / approve), verify pass/fail, rollback available |
| **Growth Pulse** | Subtle teal pulse **only** on the currently running job step |

Defer to VISION: Neural Gradient backgrounds, AI Focus Mode, full Command Center home, confidence % / ranking-gain claims.

---

## 3. Signature moments (brand = interaction)

These four patterns are the product’s visual identity — more important than decorative gradients.

| Moment | Spec |
|--------|------|
| **1. Mission Timeline** | Vertical (preferred) or horizontal stepper; only the **active** step gets Growth Pulse; completed = quiet check; failed = error icon + text + Retry/Rollback |
| **2. Trust strip** | Chips (8px radius): **Safe** · **Needs review** · **Verified** · **Rollback ready** — always icon + label, never color-only |
| **3. Diff stage** | IBM Plex Mono before/after; primary CTA label exactly **Apply to WordPress** (not “Deploy” / “CI/CD”) |
| **4. Honest empty states** | Connect WP / audit running / no issues — no fake “preparing growth strategy” or +leads theater |

---

## 4. Color palette

| Token | Light | Dark | Usage |
|-------|-------|------|--------|
| **Primary** | `#0066FF` | `#4A90E2` | Primary actions, active nav |
| **Secondary** | `#475569` | `#94A3B8` | Secondary actions (slate — not indigo) |
| **Navy** | `#0B1220` | `#E5E7EB` | Strong headings / mission chrome (invert in dark) |
| **Teal (neural accent)** | `#0D9488` | `#2DD4BF` | Growth Pulse, running AI state |
| **Background** | `#F7FAFC` | `#1A1E24` | Page canvas |
| **Surface** | `#FFFFFF` | `#2C313A` | Cards, modals, tables (opaque default) |
| **Overlay** | `#00000066` | `#00000099` | Modal backdrops |
| **Text primary** | `#1A202C` | `#E5E7EB` | Body / headings |
| **Text secondary** | `#4A5568` | `#A0AEC0` | Hints, meta |
| **Border** | `#E2E8F0` | `#3A3F48` | Dividers, inputs |
| **Success** | `#38A169` | `#48BB78` | Verify pass, success toasts |
| **Warning** | `#DD6B20` | `#F6AD55` | Needs approval |
| **Error** | `#E53E3E` | `#F56565` | Failures, validation |
| **Info** | `#3182CE` | `#63B3ED` | Neutral info |
| **Glass** | `rgba(255,255,255,0.6)` | `rgba(30,30,34,0.6)` | Top bar / rare overlay only |

**Default theme:** light. Dark via `class` strategy.

### CSS variables

```css
:root {
  --color-primary: #0066FF;
  --color-secondary: #475569;
  --color-navy: #0B1220;
  --color-teal: #0D9488;
  --color-bg: #F7FAFC;
  --color-surface: #FFFFFF;
  --color-text: #1A202C;
  --color-text-muted: #4A5568;
  --color-border: #E2E8F0;
  --color-success: #38A169;
  --color-warning: #DD6B20;
  --color-error: #E53E3E;
  --color-info: #3182CE;
  --radius-default: 8px;
  --radius-card: 12px;
  --space-base: 8px;
}

.dark {
  --color-primary: #4A90E2;
  --color-secondary: #94A3B8;
  --color-navy: #E5E7EB;
  --color-teal: #2DD4BF;
  --color-bg: #1A1E24;
  --color-surface: #2C313A;
  --color-text: #E5E7EB;
  --color-text-muted: #A0AEC0;
  --color-border: #3A3F48;
}
```

### Tailwind extend (reference)

```js
// tailwind.config — when apps/web is scaffolded
theme: {
  extend: {
    colors: {
      primary: '#0066FF',
      secondary: '#475569',
      navy: '#0B1220',
      teal: '#0D9488',
      surface: '#FFFFFF',
      canvas: '#F7FAFC',
    },
    fontFamily: {
      sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      mono: ['"IBM Plex Mono"', 'Menlo', 'monospace'],
    },
  },
},
darkMode: 'class',
```

---

## 5. Typography

| Token | Family | Weight | Size | Line-height | Usage |
|-------|--------|--------|------|-------------|--------|
| Display | Plus Jakarta Sans | 700 | 32 | 1.25 | Landing brand / rare titles |
| H1 | Plus Jakarta Sans | 600 | 24 | 1.3 | Page headings |
| H2 | Plus Jakarta Sans | 500 | 20 | 1.35 | Sections, modal titles |
| Body | Plus Jakarta Sans | 400 | 16 | 1.5 | Primary copy |
| Body small | Plus Jakarta Sans | 400 | 14 | 1.45 | Hints, table meta |
| Caption | Plus Jakarta Sans | 500 | 12 | 1.4 | Chips, micro-labels |
| Mono | IBM Plex Mono | 400 | 14 | 1.4 | Diffs, job logs |

**Not Inter.** Contrast ≥ 4.5:1 for text on surface/canvas.

---

## 6. Spacing, layout, radius

| Token | px | Usage |
|-------|-----|--------|
| Base | 8 | Grid step |
| XS | 4 | Icon inset |
| SM | 12 | Field gaps |
| MD | 16 | Card padding / Fix review panels |
| LG | 24 | Section gutters |
| XL | 32 | Page margins / landing hero padding |

- 12-column fluid; max container `1440px`
- Breakpoints: Tailwind defaults (`sm`–`2xl`)
- **Radius default:** `8px` (chips, inputs, buttons)
- **Card:** `12px`
- **Do not** default status to `rounded-full` pills

---

## 7. Screen layouts (MVP)

Wire-level composition for implementers. Scope = [APP-FLOW-MVP](./APP-FLOW-MVP.md) Must screens only.

### 7.1 Landing (public)

Full-bleed atmosphere (subtle navy→teal wash or soft grid) — **edge-to-edge**, not inset media cards.

**First viewport only:**

```text
[Brand: AI-Growth-OS]          (hero-level, Display/navy)
[Headline: one line]           e.g. Your website’s relentless growth engine
[Support: one short sentence]  Safe audit → fix → verify on WordPress
[CTA: Get started] [Login]
```

**Forbidden in first viewport:** stats strips, feature card grids, logo walls, floating badges on hero media, schedule/promo chrome.

### 7.2 Auth (login / sign-up / verify email)

```text
Canvas (background)
  └─ Centered surface card (max ~420px)
       Title + fields + primary button
       Minimal footer links
```

Calm, no marketing sidebar collage.

### 7.3 App shell

```text
┌──────────┬────────────────────────────────────┐
│ Slim nav │  Top: org name (light)             │
│ Sites    │────────────────────────────────────│
│ Billing  │  Main content                      │
│ Team     │                                    │
│ Profile  │                                    │
└──────────┴────────────────────────────────────┘
```

Nav width ~220px desktop; collapse to icons/`sm` drawer on mobile.

### 7.4 Dashboard (home)

```text
Header: Workspace · [Add site] [Run audit]
─────────────────────────────────────────
Latest mission (collapsed Mission Timeline — last job)
─────────────────────────────────────────
Site health table/list
  domain | status | last job | issues count | →
```

**No** six-KPI chart wall. At most one optional sparkline later — not required for MVP.

### 7.5 Onboarding (workspace → Connect WP → scan settings)

Single-column wizard, one job per step. Connect WP: plugin token / Application Password fields + **Test health** secondary button. Scan settings: weekly default + safe auto-apply toggle with helper listing safe classes only.

### 7.6 Site detail

```text
example.com    [Healthy|Needs review]    [Run audit]
Trust strip: Safe pending · Needs review · …
─────────────────────────────────────────
Issues table
  severity | type | Safe/Review chip | View fix →
```

### 7.7 Fix review modal (money screen)

Max-width **720px** (or up to 840px if diff needs room). MD padding. Sticky bottom action bar.

```text
┌─────────────────┬─────────────────────────────┐
│ Issue context   │ Diff (IBM Plex Mono 14px)   │
│ title, URL,     │ - before                    │
│ severity,       │ + after                     │
│ change_class    │                             │
└─────────────────┴─────────────────────────────┘
Trust: We'll verify live. Rollback anytime.
[Reject]                    [Apply to WordPress]
```

### 7.8 Job / deployment status

Full **Mission Timeline** (all states). Running step = Growth Pulse. Failed = error message + **Retry** (crawl/audit) or **Rollback** (post-deploy). Success = quiet teal check — **no confetti**.

### 7.9 Billing / Team / Profile

Sparse forms and tables; same tokens; no decorative dashboard chrome.

---

## 8. Components (MVP screens only)

Aligned to [APP-FLOW-MVP](./APP-FLOW-MVP.md).

### Buttons

| Variant | Notes |
|---------|--------|
| Primary | `bg-primary` white text — **Apply to WordPress**, Run audit |
| Secondary | Slate fill or outline |
| Ghost | Border primary / teal sparingly for running |
| Destructive | Error — Rollback, remove member |
| Success | Verify-passed actions |

Sizes: `h-8` / `h-10` / `h-12`. Focus: 2px primary outline. Hover: light elevation only.

### Inputs

Height 40px; radius 8px; focus border primary; error border error.

### Cards

**Opaque surface default.** Border + `shadow-sm`. Glass never on issue/fix cards.

### Modals

Fix review = money screen (see §7.7). Entrance: scale 0.94→1 + fade 150ms. Focus trap; Esc closes.

### Trust chips

Radius **8px**; icon + text for Safe / Needs review / Verified / Rollback ready / verify fail.

### Toasts

Top-right (desktop); auto-dismiss 4s.

### Tables

Sticky header; row hover `primary/5`; ghost icon actions.

### Job stepper / Diff / Forms

As named language + Fix review; forms vertical, `md` gaps.

### Charts

At most **one** optional sparkline on Dashboard — not an Amplitude clone. Prefer none for MVP.

---

## 9. Motion (MVP minimal)

Only these three intentional motions:

| Interaction | Motion |
|-------------|--------|
| Modal open | 150ms opacity + scale |
| Toast | Slide ~20px |
| Active job step | Growth Pulse (teal) |

**Forbidden:** radar sweeps, neural net spectacle, CI pipeline animations, confetti, success fireworks.

```css
@media (prefers-reduced-motion: reduce) {
  .growth-pulse { animation: none !important; }
}
```

---

## 10. Copy rules

| Prefer | Avoid |
|--------|--------|
| Apply to WordPress | Deploy pipeline / CI/CD / cluster |
| Verify live site | Health checks on containers |
| Rollback | Abort rollout |
| Connect WordPress to start your first audit | Your AI is preparing a growth strategy… |
| First audit running — usually a few minutes | Estimated +800 traffic / +30% leads |

### Empty and loading

| State | Copy |
|-------|------|
| No sites | “Connect WordPress to start your first audit.” |
| First audit running | “First audit running — usually a few minutes.” |
| No issues | “No open issues. Run another audit anytime.” |
| Loading | Skeletons matching final layout |

---

## 11. Accessibility

- Text contrast ≥ 4.5:1; UI components ≥ 3:1 where applicable
- Visible focus rings on all controls
- Verify/fail: **icons + text**, not color alone
- Honor `prefers-reduced-motion`
- Modal focus trap; Esc closes

---

## 12. Out of scope (MVP)

- AI Command Center / Growth Brain as home
- Business Impact cards (revenue, leads) without connectors
- Confidence % / “+12% ranking” claim chrome
- Automation ladder (Manual→Autonomous) full page
- Dominant glassmorphism, purple secondary, Inter font
- Electron / React Native token packaging
- Hero stats, feature-card collages, floating promo badges

---

## Document control

| Version | Date | Notes |
|---------|------|--------|
| v0.1 | 2026-07-29 | MVP Mission Control brief; identity locked (Jakarta + teal/navy) |
| v0.2 | 2026-08-04 | Pro screen layouts, signature moments, Fix review money screen, copy/motion rules |
