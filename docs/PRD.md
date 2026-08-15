# AI-Growth-OS — Product Requirements Document

| Field | Value |
|-------|--------|
| **Product name** | AI-Growth-OS (working) |
| **Tagline** | Your website’s relentless AI-driven growth engine |
| **Status** | Draft v0.1 |
| **Horizon** | Vision (5-year) + MVP (90-day) |
| **Primary GTM** | Digital / SEO agencies |
| **Day-1 CMS** | WordPress |

> **Scope banner:** This PRD describes a Growth Operating System vision. **Only [Section 8 — MVP](#8-mvp-scope-90-days) is in scope for the next 90 days.** Everything else is directional and must not expand the MVP without an explicit roadmap review.

---

## 1. Header summary

AI-Growth-OS is not another read-only SEO auditor. It is a **closed-loop growth engine**: audit → plan → fix → deploy → verify → measure → learn → repeat — starting with safe, permanent WordPress writes and expanding into a unified visibility platform (SEO, AEO, GEO, local, AI search) and, later, conversion-linked optimization.

---

## 2. Problem

Website owners, marketers, and agencies must continuously improve sites for Google **and** answer engines (ChatGPT, Gemini, Perplexity, Copilot). Today’s stack is manual, fragmented, and reactive.

**What breaks today**

- Tools like Semrush, Ahrefs, and Search Console are largely **read-only**: they find issues, then stop.
- Fixes require SEO + content + developers → weeks of delay and dropped priorities.
- Discovery surfaces multiplied (SEO / AEO / GEO / local / AI visibility) with no single execution loop.
- Businesses buy **customers, leads, and revenue** — not ranking reports.

**Consequence:** missed ranking and AI-citation opportunities, higher ops cost, and slow time-to-value.

---

## 3. Vision

> Build an autonomous **AI Growth Operating System** that continuously improves a business’s online visibility, website quality, AI discoverability, and (later) conversions by automatically auditing, planning, fixing, deploying, verifying, measuring, and learning from every change.

**Positioning**

- Category: **Unified Visibility + Growth OS** — not “another GEO tool” and not “another SEO suite.”
- SEO remains the foundation; AEO/GEO **extend** SEO rather than replace it.
- Long-term: the AI thinks like a Growth Manager (business goals → strategy → site execution). Short-term: earn trust with safe technical and on-page writes.

**Day-1 customer promise (MVP)**

> Connect your WordPress site, click one button, and let AI safely improve SEO and AI-readability with automatic deployment and rollback.

---

## 4. Target users

Priority order for GTM and product decisions:

| Priority | Segment | Primary role | Context |
|----------|---------|--------------|---------|
| 1 | **SEO / digital agencies** | SEO Lead / Account Manager | Dozens–hundreds of domains; needs scalable automation and client reporting |
| 2 | Growth-focused SMBs | Marketing manager / founder | Limited DevOps; needs fast, safe SEO wins |
| 3 | Ecommerce | Head of Growth / Product Owner | Ranking and speed drops hit revenue |
| 4 | SaaS product teams | Growth Engineer / Growth PM | Align site health with releases and experiments |
| 5 | Local / franchise (post-MVP) | Regional marketing | Geo landing pages and local consistency |

**Beachhead:** agencies (one sale → many sites).

---

## 5. Jobs to be done

| Who | Job |
|-----|-----|
| Agency lead | Approve safe fixes across many client sites without opening each WP admin |
| SMB marketer | Connect once; keep technical SEO and AI-readability from rotting |
| Growth engineer | Roll back any AI change in minutes if something regresses |
| Freelancer / agency | Pay per site / usage, not enterprise shelfware |
| Later (out of MVP) | Tie site changes to leads/signups (needs analytics/CRM hooks) |

---

## 6. Competitive framing

| Group | Examples | They win at | Gap we fill |
|-------|----------|-------------|-------------|
| Traditional SEO | Semrush, Ahrefs, Moz | Data, crawl, reports | No permanent CMS deploy loop |
| Content AI | Surfer, Clearscope, Frase | Briefs / on-page copy | Not whole-site write → verify |
| Automation | Alli AI, Search Atlas | Closer to write path | Prefer **permanent CMS writes** + rollback/trust over overlays |
| AI visibility | Profound, Peec, Otterly | “Did ChatGPT cite you?” | Detection without fix |

**Differentiator loop**

```text
Analyze → Plan → Fix → Deploy → Verify → Measure → Learn → Repeat
```

Most tools stop at Analyze → Recommend.

---

## 7. Product principles

1. **Trust > autonomy** — diff, approval modes, and rollback before clever agents.
2. **Safe-by-default change classes** — see [Automation matrix](#9-automation-matrix).
3. **Permanent CMS writes**, versioned — not transient JS overlays.
4. **SEO foundation first**; AEO/GEO extend it under unified visibility.
5. **Ship a wedge, expand into the OS** — vision language must not inflate MVP scope.

---

## 8. MVP scope (90 days)

### Must-have

- Auth + agency workspace + multi-site
- WordPress connect (custom plugin and/or Application Passwords + REST)
- Crawl: sitemap-driven sample + key templates
- Deterministic audit: titles, meta descriptions, H1, schema presence, image alt, canonical, sitemap, `llms.txt`
- LLM-assisted proposals for titles / metas / FAQ schema where evidence is clear
- Diff preview → apply → **immutable audit log** → **rollback**
- Safe auto-apply mode (user toggle): meta, schema JSON-LD, `llms.txt`, empty image alts
- Weekly scheduled re-audit
- Basic billing stub: Free + Starter + Agency (usage: sites / scans)

### Should-have (if time)

- Google Search Console connect (queries / impressions)
- Thin AI Visibility: fixed prompt set × 2 engines; store citation yes/no
- Shareable before/after client report (agency white-label light)

### Won’t (MVP)

- Shopify / Webflow / Next.js / GitHub deploy
- “Increase leads 30%” Growth Brain autonomy
- Body-content auto-publish without approval
- Theme / JS / CSS mutation, mass redirects
- Backlinks, review generation, fake EEAT
- Full multi-agent swarm / agent marketplace
- SOC2 / SSO / deep enterprise RBAC (MVP roles: owner / member only)
- A/B testing orchestrator, edge AI

---

## 9. Automation matrix

Product law — enforce in UI, docs, and deploy guards:

| Mode | Change types |
|------|----------------|
| **Auto (safe mode)** | Meta titles/descriptions, schema JSON-LD, `llms.txt`, empty image alts, sitemap hints |
| **Human approve** | Body content, internal links, new pages, redirects |
| **Blocked in MVP** | Theme / JS / CSS edits, destructive deletes |
| **Out of product** | Genuine backlinks, reviews, real-world EEAT (playbooks only, no fake signals) |

---

## 10. Architecture

### Vision (future — not MVP build)

```text
Business goals
    ↓
Growth Strategist
    ↓
Crawler → Auditor → Planner
    ↓
Content / Schema / Speed agents
    ↓
Deployment Agent
    ↓
Verification → Monitoring → Learning
    ↓
(back to strategy)
```

### MVP (ship this)

Collapse agents into a **job state machine**:

```text
queued → crawling → auditing → proposing → awaiting_approval
      → deploying → verifying → done | failed
```

Write path: permanent patches via WordPress REST / plugin (`apply_patch`, `rollback`, `health`), each with `before` / `after` stored for rollback.

---

## 11. User stories

### MVP

1. **As an agency account manager**, I want on-demand (and scheduled) scans so client technical SEO issues surface without manual crawling.
2. **As an SEO lead**, I want one-click approve/apply for safe-class fixes across a site so we cut eng dependency for meta/schema/`llms.txt`.
3. **As a growth engineer**, I want versioned audit logs and one-click rollback so any bad AI write can be reversed in minutes.
4. **As an agency owner**, I want multi-site workspaces with owner/member roles so the team manages many domains in one place.
5. **As a freelancer**, I want site/scan-based usage so I only pay for what I manage.
6. **As a marketer**, I want a clear diff before deploy so I trust what will change on the live site.

### Future (parked)

- Geo-specific ranking alerts for franchise pages
- AEO featured-snippet / answer-engine playbooks tied to conversions
- Auto landing-page experiments with winner promotion
- Business KPI goals (“increase leads 30%”) driving a Growth Brain plan
- Sandboxed lint/SAST gate for all code-like patches (enterprise)

---

## 12. Success metrics

### Phase A / MVP (prove trust)

| Metric | Target |
|--------|--------|
| Deploy success rate | ≥ 95% |
| Rollback success | 100% in tests + pilot incidents |
| Time-to-first-safe-fix | &lt; 30 min (mid-size WP site) |
| Safe-class fix acceptance | ≥ 50% in pilots |
| Pilot agency retention | Through 60–90 days |

### 12-month (directional — not sales SLAs)

- Activated sites, MAU, hours saved per site, churn
- AI citation rate / recommendation share (where measured)
- Time to first ranking movement (observational)
- Customer-reported ROI
- Automatic fix success rate; rollback success rate

**Do not** guarantee “+15% average keyword position” as a product SLA.

---

## 13. GTM and pricing

**GTM**

1. Digital / SEO agencies (beachhead) — multi-site + client reports
2. SMBs and local businesses
3. Ecommerce / SaaS growth teams
4. Enterprise (SSO, SOC2, RBAC) after trust and unit economics

**Pricing shape**

```text
Free → Starter → Agency → Business → Enterprise
```

- Meter: sites, scans, AI generations
- **BYOK (Agency+):** customer brings OpenAI/Anthropic keys; they pay model cost; we charge for the platform

---

## 14. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Site breakage from AI writes | Mandatory diffs; safe-class only auto; always rollback; later sandbox lint |
| Incumbents copy “AI fix” features | Deepen CMS adapters, trust UX, and telemetry moat |
| Scope creep into Growth Brain | Enforce Won’t list in every roadmap review |
| Inflated market-size claims | Treat figures as estimates; verify before investor decks |
| LLM/API cost spikes | BYOK; rate limits; prefer deterministic audits before LLM |

---

## 15. Open questions

- WP plugin distribution: private zip for pilots vs WordPress.org later
- Yoast / Rank Math meta field compatibility matrix
- Data residency and retention for crawled HTML snapshots
- Exact Free/Starter/Agency limits (sites, scans/month)

---

## 16. Roadmap (Phase A–D)

Keep vision ambitious; ship in phases. **Only Phase A is committed for the next 90 days.**

### Phase A — MVP (0–3 months)

- WordPress only
- Audit → safe fixes (meta, schema, `llms.txt`, empty alts) → deploy → rollback
- Weekly re-audit
- Agency workspace + basic billing stub
- Prove: deploy/rollback reliability and pilot retention

### Phase B — V1 (3–9 months)

- Shopify (and/or Webflow)
- Human-approved content drafts + internal linking apply
- GSC deeper integration
- Local SEO basics where relevant
- Monitoring dashboards for agencies

### Phase C — V2 (9–18 months)

- GitHub / Next.js deploy path
- Broader AI Share of Voice (multi-engine citation tracking)
- Stronger AEO/GEO playbooks on top of solid SEO
- Learning loop from successful vs failed experiments (AI Memory light)

### Phase D — Enterprise / Growth OS (18–36+ months)

- Growth Strategist / goal-linked planning (business KPIs via analytics)
- Experimentation (controlled A/B of AI variants)
- SSO, SOC2, deep RBAC, API, white-label
- Optional agent marketplace
- Conversion-linked optimization once measurement is trusted

```text
Phase A: Trust the write loop (WordPress)
Phase B: More CMS + approved content
Phase C: AI visibility depth + modern stacks
Phase D: Full Growth OS
```

---

## Document control

| Version | Date | Notes |
|---------|------|--------|
| v0.1 | 2026-07-29 | Initial PRD from research synthesis; Vision + MVP locked |
