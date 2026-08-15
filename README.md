# AI-Growth-OS

**Your website’s relentless AI-driven growth engine.**

**Day-1 (MVP) promise:** Connect WordPress → audit → safe AI fixes → one-click deploy → rollback → weekly re-audit.

## Quick start

Requires **Node 20+** and **Docker**.

```bash
# 1) Infra (Postgres on host port 5433 — avoids clash with local Postgres on 5432)
cp .env.example .env
npm run db:up

# 2) Install & build shared types
npm install
npm run build -w @ai-growth-os/shared

# 3) API (http://localhost:4000/health)
cp apps/api/.env.example apps/api/.env   # if needed
cd apps/api && npx prisma migrate dev && npx prisma generate && cd ../..
npm run dev:api

# 4) Web (http://localhost:3000) — signup / login / onboarding / dashboard
cp apps/web/.env.example apps/web/.env.local
npm run dev:web
```

| Path | Role |
|------|------|
| `apps/web` | Next.js — landing, auth, connect wizard, scan UI |
| `apps/api` | NestJS — auth, orgs, sites, BullMQ scan worker |
| `packages/shared` | `ChangeClass`, connection types, issue types |
| `wordpress-plugin/` | WP REST (`health`, `apply_patch`, `rollback`) |
| `docs/` | PRD, TRD, HLD/LLD, schema, UI, IMPL |

## Docs

| Doc | Purpose |
|-----|---------|
| [docs/LIVE-SITE-GUIDE.md](docs/LIVE-SITE-GUIDE.md) | **How to use Site scan with a live site** (full trust loop) |
| [docs/GROWTH-PILLARS.md](docs/GROWTH-PILLARS.md) | **SEO · AEO · GEO · AI-visibility** checklist + MVP vs roadmap |
| [docs/PILOT-RUNBOOK.md](docs/PILOT-RUNBOOK.md) | **Pilot ops** — connect, scan, weekly automation, billing, rollback |
| [docs/PLUGIN-INSTALL.md](docs/PLUGIN-INSTALL.md) | WordPress plugin install + staging WP |
| [docs/PRD.md](docs/PRD.md) | Vision + MVP scope |
| [docs/IMPL-MVP.md](docs/IMPL-MVP.md) | **Execute now** — phases 0–8 |
| [docs/HLD-MVP.md](docs/HLD-MVP.md) / [docs/LLD-MVP.md](docs/LLD-MVP.md) | Architecture |
| [docs/SCHEMA-MVP.md](docs/SCHEMA-MVP.md) | DDL |
| [docs/UI-UX-BRIEF-MVP.md](docs/UI-UX-BRIEF-MVP.md) | Mission Control UI (v0.2) |
| [docs/APP-FLOW-MVP.md](docs/APP-FLOW-MVP.md) | Screens / journeys |

Scale/Vision docs are reference-only until pilots succeed.

**Engineering rule:** Implement [IMPL-MVP](docs/IMPL-MVP.md) against HLD/LLD/SCHEMA/UI MVP docs.

## Status

Last verified: **2026-08-04** (Phases 0–6)

| Phase | Status | Customer can… |
|-------|--------|----------------|
| Docs | Done | Read MVP plan & architecture |
| 0 Foundations | Done | Run web + API + Postgres + Redis locally |
| 1 Auth & orgs | **Verified** | Sign up, log in, create workspace |
| 2 Multi-connect | **Verified** | Connect WP / GitHub / ZIP / Live URL |
| 3 Universal scanner | **Verified** | Run scan; see pages + issues |
| 4 AI proposals | **Verified** | Review title/meta/FAQ proposals; approve → draft patch |
| 5 Deploy / verify / rollback | **Verified** | Deploy approved patches; Mission Timeline; auto-rollback |
| 6 Mission Control | **Shipped** | See health, pulse, priorities, activity, search in one place |
| 7 Automation & billing | **Shipped** | Weekly schedule, safe auto-apply, Stripe stub/checkout, usage |
| 8 Pilot readiness | **Shipped** | Staging WP, plugin zip, PILOT-RUNBOOK, Sentry hooks, pilot metrics |

**Founder decision (2026-08-04):** Core MVP complete. Track A in progress (real WP, onboarding, beta).

**Track A + Phase 7/8:** See [docs/LIVE-SITE-GUIDE.md](docs/LIVE-SITE-GUIDE.md) · [docs/PILOT-RUNBOOK.md](docs/PILOT-RUNBOOK.md) · [docs/BETA-30-DAY.md](docs/BETA-30-DAY.md) · [docs/PLUGIN-INSTALL.md](docs/PLUGIN-INSTALL.md)

```bash
# Real WordPress staging (plugin mounted)
npm run wp:up          # http://localhost:8080
npm run plugin:zip     # wordpress-plugin/ai-growth-os.zip
# In apps/api/.env set MOCK_WP_HEALTH=0 and restart API
```

**Validation gate before Phase 7:** ~5–10 real users · ~100 scans · ~50 approvals · ~20 deploys · users asking for weekly automation.

**Verification run (pass):**
- Unit / typecheck / Mission Control + deploy smokes (Phases 0–6)
- Infra: API `phase: "beta-track-a"`, Postgres `:5433`, optional WP `:8080`

**Not verified yet:** Live WP without mock by an external beta user; production Stripe webhooks; Sentry in a live project.

## License

TBD.
