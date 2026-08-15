# AI-Growth-OS — UI/UX Design Brief (Vision)

| Field | Value |
|-------|--------|
| **Product** | AI Growth Operating System (AI-Growth-OS) |
| **Document** | UI-UX-BRIEF-VISION |
| **Status** | Draft v0.1 |
| **Horizon** | Phase C–D (post write-loop trust) |
| **Companion** | [APP-FLOW-VISION](./APP-FLOW-VISION.md) · [UI-UX-BRIEF-MVP](./UI-UX-BRIEF-MVP.md) · [TRD-SCALE](./TRD-SCALE.md) |

> **Design rule:** Reference-only until Growth Brain / analytics gates in [APP-FLOW-VISION](./APP-FLOW-VISION.md). Phase A visual work uses [UI-UX-BRIEF-MVP](./UI-UX-BRIEF-MVP.md) **v0.2** (tokens + screen layouts) as the base; this Vision brief **overlays** Command Center / Strategy later — do not reinvent a purple-glass AI dashboard.

---

## 1. Philosophy

Combine:

```text
Mission Control + AI Assistant + Premium Enterprise
```

**Logo-off test:** If the logo is hidden, the product must still feel like **AI Growth OS Mission Control**, not “another blue analytics SaaS.”

Communicate:

> “Your AI team is working.”

not only:

> “Here are your charts.”

---

## 2. Home layout (Command Center)

Replace card/chart/table-first home with:

```text
AI Growth Brain (goal + progress)
    ↓
Today's Mission (single priority)
    ↓
AI Agents / Mission Timeline (live feed)
    ↓
Business Impact (connected metrics only)
    ↓
Recent Improvements
    ↓
Recommended Actions
```

Site Detail from MVP remains for power users; Strategy / Command Center becomes default home for Assisted/Autonomous tenants after trust is proven.

---

## 3. Patterns and components

### AI Command Center card

- Current goal (e.g. “Improve AI visibility”)
- Progress (honest % of plan tasks completed — not fake revenue)
- Next action (one primary CTA)
- Estimated impact band: Low / Medium / High — **directional**, not SLA

### Agent Timeline

Timestamped feed, e.g.:

```text
09:02  Crawler completed
09:03  Found 24 issues
09:04  Generated fixes
09:05  Deployment ready
09:06  Verification running
09:07  Changes verified
```

Builds on MVP Job stepper; expands to multi-step narrative.

### Confidence and impact (with disclaimer)

Each recommendation may show:

- Confidence (model/heuristic score)
- Expected impact band
- Optional estimate ranges (traffic/ranking) **only** when backed by data or clearly labeled “estimate, not guaranteed”

Never hard-code “+12%” / “+800/month” as product promises in chrome.

### Automation mode control

```text
Manual → Review (Assisted) → Automatic → Autonomous
```

Maps to `change_class` + approval policy ([APP-FLOW-VISION](./APP-FLOW-VISION.md)). Trust ladder must stay visible; Autonomous still logs + rollback.

### Business Impact card

When connectors exist: traffic, AI citations, conversions, leads/revenue from **connected** sources. Until then, hide or show “Connect analytics” empty state — do not invent numbers.

### Learning surfaces

Best/worst changes, experiments, rollback history, AI confidence trends — fed by AI Memory ([TRD-SCALE](./TRD-SCALE.md)).

### AI Focus Mode

UI highlights the **single** highest-priority action; dims secondary noise.

---

## 4. Named visual effects (full set)

| Name | Description |
|------|-------------|
| **Growth Pulse** | Teal pulse on active AI work (from MVP) |
| **Mission Timeline** | Chronological AI activity |
| **Neural Gradient** | Brand gradient **navy → teal** (not blue–purple) for hero/Command chrome only |
| **Trust Indicators** | Verify, change_class, rollback, confidence |
| **AI Focus Mode** | Spotlight on next best action |

---

## 5. Motion system

Meaningful, restrained; always respect `prefers-reduced-motion` (fall back to static states).

| Moment | Motion idea |
|--------|-------------|
| Scan | Soft progress / sweep (not arcade radar) |
| AI thinking | Subtle teal neural pulse on agent row |
| Deployment | Step advance on Mission Timeline |
| Verification | Checklist fill → success or fail |
| Success | Brief calm glow on Trust Indicator — no confetti spam |

Avoid spectacle that reduces trust or accessibility.

---

## 6. Glass policy

- Glass **only** where it creates hierarchy (e.g. floating Command bar over Neural Gradient)
- Default panels remain **opaque** (MVP rule)
- Always provide opaque fallbacks; maintain WCAG contrast

---

## 7. Empty states (vision narrative)

Once Brain ships:

```text
Your AI is preparing its first growth strategy…
```

is acceptable **after** a site is connected and analysis has started. Before connect, keep MVP honesty: “Connect WordPress to begin.”

---

## 8. Migration from MVP UI

| MVP | Vision |
|-----|--------|
| Dashboard (site health) | Command Center home (flagged) |
| Job stepper | Full Agent Timeline |
| Safe auto-apply toggle | Automation mode ladder |
| Opaque cards + teal pulse | + Neural Gradient on Command only |
| Technical issue list | + Recommended Actions / Focus Mode |

**Gate:** deploy success, rollback trust, and (for business metrics) analytics connectors — same as APP-FLOW-VISION / TRD-SCALE Growth Brain.

---

## 9. Copy risks

| Avoid | Prefer |
|-------|--------|
| Guaranteed ranking/traffic lifts | Impact bands + “estimate” |
| Fake leads/revenue | Connect data source CTA |
| “Autonomous” with no rollback | Autonomous + always-on history/rollback |
| Purple glass Inter dashboard | Navy–teal Mission Control |

---

## Document control

| Version | Date | Notes |
|---------|------|--------|
| v0.1 | 2026-07-29 | Vision Mission Control identity; MVP brief remains build authority |
