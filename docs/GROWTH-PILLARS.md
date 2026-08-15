# Growth OS pillars — SEO · AEO · GEO · AI-visibility

| Field | Value |
|-------|--------|
| **Product** | AI Growth OS |
| **Last updated** | 2026-08-15 |
| **Rule** | Growth OS must cover **search growth + AI discovery**. Content farms, link buying, and fake ranking guarantees stay out of MVP auto-apply. |

---

## 1. Mental model (one product, four labels)

```text
                    Website Growth
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
         SEO             AEO             GEO
   (Google/Bing)   (snippets/answers) (ChatGPT/Gemini/…)
          └───────────────┬───────────────┘
                          ▼
                   AI-visibility
            (umbrella: AEO + GEO + AI crawlers)
```

| Pillar | Question it answers |
|--------|---------------------|
| **SEO** | Will classic search engines find, understand, and trust this page? |
| **AEO** | Can answer boxes / PAA / voice extract a clear answer? |
| **GEO** | Can generative engines cite or recommend this brand/page? |
| **AI-visibility** | Product umbrella for AEO + GEO + `llms.txt` / machine-readable signals |

**UI rule:** Show scores as **SEO · AEO · GEO**. Copy may say “AI-visibility” as the combined story; do not invent a fifth competing product name.

---

## 2. Full growth checklist (must include)

### SEO (classic search)

| Factor | Importance | Now | Next |
|--------|------------|-----|------|
| HTTPS / mixed content | High | Detect | Guide |
| Title tag | High | Auto-fix | — |
| Meta description | High | Auto-fix | — |
| Canonical | High | Auto-fix | — |
| H1 structure | Med | Detect + guide | Soft suggest |
| Image alt | Med | Detect + guide | Selective auto |
| Robots.txt | Med | Auto-fix template | Host publish |
| XML sitemap | Med | Auto-fix template | Host publish |
| Internal links | Med | Detect | Suggest hubs |
| Security headers | Low–Med | Detect | Guide |
| Page speed (TTFB proxy) | High | Detect + host guide | CWV lab |
| Mobile viewport | High | Detect | Guide |
| Helpful content depth | High | Thin-content flag | Draft assist (later) |
| Keywords / intent | High | Out | Research module (later) |
| Backlinks | High | Out | Monitoring only (later) |
| Freshness | Med | Weekly schedule | Email report |

### AEO (answer engines / snippets)

| Factor | Now | Next |
|--------|-----|------|
| Clear H1 / question-shaped headings | Detect | — |
| FAQ / Q&A schema | Auto-fix | Expand schema types |
| Concise meta that answers intent | Auto-fix | — |
| Structured lists / how-to schema | Out | Detect + propose |
| Featured-snippet ready blocks | Out | Content briefs |

### GEO / AI-visibility (generative engines)

| Factor | Now | Next |
|--------|-----|------|
| FAQPage / Organization schema | FAQ yes | Org/WebSite schema |
| Open Graph / social cards | Auto-fix | — |
| `llms.txt` | Auto-fix draft + WP serve | Host file publish |
| Multi-engine citation tracking | Out | Post-pilot |

### Extra growth factors (known, planned)

| Factor | Pillar | Notes |
|--------|--------|-------|
| Core Web Vitals (LCP/INP/CLS) | SEO | Needs lab/RUM later |
| Crawl budget / index bloat | SEO | GSC integration later |
| Local pack / GBP | SEO local | Post-MVP |
| E-E-A-T signals (author, about) | SEO + GEO | Detect about/contact later |
| Multilingual / hreflang | SEO | Later |
| Conversion CRO | Growth | Explicitly later — not MVP |

---

## 3. Honest MVP vs full Growth OS

| Layer | MVP (ship) | Full Growth OS (roadmap) |
|-------|------------|---------------------------|
| Connect + scan | Yes | Yes |
| Technical SEO fixes | Title, meta, canonical, FAQ, OG, robots/sitemap/llms drafts | + alts, CWV |
| AEO | FAQ schema, clear titles | HowTo/Article schema, snippet briefs |
| GEO | FAQ, llms.txt draft, OG | Org schema, citation tracking |
| Content / keywords / links | No auto | Human-in-loop drafts, GSC, backlink watch |
| Speed / mobile | Detect | Recommendations + CWV |
| Weekly loop | Shipped (schedule + safe auto-apply) | Email digest later |

---

## 4. Product promise (updated)

> **AI Growth OS** improves **SEO**, **AEO**, and **GEO (AI-visibility)** by auditing your site, proposing safe fixes, and — with approval — deploying, verifying, and rolling back.

Do **not** promise #1 rankings, backlink acquisition, or full content marketing.

---

## 5. Implementation map in this repo

| Code | Role |
|------|------|
| `packages/shared` | Issue types, owner guides, pillar map, scores |
| `apps/api/.../auditors.ts` | Detect growth signals |
| `apps/api/.../proposal-engine.ts` | Auto-fixable proposals |
| `wordpress-plugin` | Live apply for WP |
| Mission Control / Site scan | SEO · AEO · GEO scores + Top fixes |
