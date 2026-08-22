# AI-Growth-OS (growthOS)

**Your website’s relentless growth engine** — SEO · AEO · GEO (AI-visibility).

Connect a site → scan → approve AI proposals → deploy with verify/rollback (WordPress) or PR / apply guide (other modes).

---

## Live product (already deployed)

| Surface | URL |
|---------|-----|
| Web app | https://grothos.vercel.app |
| API health | https://growthos-nbvo.onrender.com/health |
| GitHub | https://github.com/ankushkumar14092-dot/growthOS |

### App routes (web)

| Route | What it is |
|-------|------------|
| `/` | Marketing landing |
| `/login` · `/signup` | Auth |
| `/onboarding` | Create workspace |
| `/dashboard` | Mission Control (KPIs, tasks, sites) |
| `/sites/connect` | Connect WordPress / GitHub / ZIP / Live URL |
| `/sites/[id]` | Site scan, proposals, deploy |
| `/job-runs/[id]` | Scan progress |
| `/deployments/[id]` | Deploy / verify / rollback timeline |
| `/billing` | Plans, Razorpay upgrade, usage |
| `/team` | Workspace members |

Push to `main` auto-deploys **web → Vercel**. **API → Render** if the service is linked to this repo (confirm latest deploy in the Render dashboard after each push).

---

## Do you need to do anything?

**For day-to-day use of the live app:** you’re fine — open https://grothos.vercel.app, sign up / log in, connect a site, run a scan.

**Only if you want full Razorpay test checkout in production**, finish these on the **Render** API service (Environment):

1. `RAZORPAY_KEY_ID` = your `rzp_test_…` key  
2. `RAZORPAY_KEY_SECRET` = matching secret  
3. Optional but recommended: `RAZORPAY_WEBHOOK_SECRET` + webhook URL  
   `https://growthos-nbvo.onrender.com/billing/webhook`  
4. Optional (recurring subscriptions): `RAZORPAY_PLAN_STARTER` / `RAZORPAY_PLAN_AGENCY`  
   Without plan IDs, upgrade opens a **Payment Link** (one-time test payment) instead.  
5. `CORS_ORIGIN` must include `https://grothos.vercel.app` (comma-separate other aliases if needed).  
6. After changing env vars → **Manual Deploy** on Render (or wait for auto-deploy).

**Local Razorpay:** put the same keys in `apps/api/.env` and restart `npm run dev:api`.

**Rename merchant “Mbsteach” → “grothos”:** Razorpay Dashboard → Account & Settings → Business details (account-level name; not controlled only by our code).

**WordPress live deploy:** install the plugin ([docs/PLUGIN-INSTALL.md](docs/PLUGIN-INSTALL.md)), set `MOCK_WP_HEALTH=0` on the API.

---

## Quick start (local)

Requires **Node 20+** and **Docker**.

```bash
# 1) Infra (Postgres host :5433, Redis :6379)
cp .env.example .env
npm run db:up

# 2) Install & shared package
npm install
npm run build -w @ai-growth-os/shared

# 3) API — http://localhost:4000/health
cp apps/api/.env.example apps/api/.env
# edit apps/api/.env (DB, JWT, optional Razorpay / OpenAI / Tavily)
cd apps/api && npx prisma migrate dev && npx prisma generate && cd ../..
npm run dev:api

# 4) Web — http://localhost:3000
cp apps/web/.env.example apps/web/.env.local
# NEXT_PUBLIC_API_URL=http://localhost:4000
npm run dev:web
```

| Path | Role |
|------|------|
| `apps/web` | Next.js — landing, auth, Mission Control, billing, scan UI |
| `apps/api` | NestJS — auth, orgs, sites, BullMQ workers, Razorpay billing |
| `packages/shared` | Shared types (issues, connection modes, change classes) |
| `wordpress-plugin/` | WP REST: health, apply_patch, rollback |
| `docs/` | PRD, architecture, pilot runbooks |

---

## Billing (Razorpay)

| Plan | Price (INR) | Limits (summary) |
|------|-------------|------------------|
| Free | ₹0 | Small site/scan caps |
| Starter | ₹3,999/mo | Higher sites + scans |
| Agency | ₹15,999/mo | Agency-scale caps |

- **No keys:** checkout uses **stub mode** (plan activates locally / without Razorpay UI).  
- **Test keys only:** Upgrade on `/billing` opens a Razorpay **Payment Link**; after pay, return URL is `/billing?billing=paid`.  
- **Subscriptions:** create monthly plans in Razorpay, set `RAZORPAY_PLAN_STARTER` / `RAZORPAY_PLAN_AGENCY`.  
- Test card (Razorpay test mode): `4111 1111 1111 1111`, any future expiry, any CVV.

Env templates: root [`.env.example`](.env.example) · [`apps/api/.env.example`](apps/api/.env.example).

---

## Connect modes

| Mode | Scan | Live write | Notes |
|------|------|------------|-------|
| WordPress + plugin | Yes | Yes | Deploy → verify → rollback |
| GitHub | Yes | PR | Merge + host redeploy |
| ZIP | Yes | Fix pack | Download apply package |
| Live URL | Yes | No | Read-only + apply guide |

---

## Docs

| Doc | Purpose |
|-----|---------|
| [docs/LIVE-SITE-GUIDE.md](docs/LIVE-SITE-GUIDE.md) | Use Site scan with a live site |
| [docs/GROWTH-PILLARS.md](docs/GROWTH-PILLARS.md) | SEO · AEO · GEO checklist |
| [docs/PILOT-RUNBOOK.md](docs/PILOT-RUNBOOK.md) | Pilot ops, weekly automation, rollback |
| [docs/PLUGIN-INSTALL.md](docs/PLUGIN-INSTALL.md) | WordPress plugin + staging WP |
| [docs/PRD.md](docs/PRD.md) | Vision + MVP scope |
| [docs/IMPL-MVP.md](docs/IMPL-MVP.md) | Implementation phases |
| [docs/HLD-MVP.md](docs/HLD-MVP.md) / [docs/LLD-MVP.md](docs/LLD-MVP.md) | Architecture |
| [docs/BETA-30-DAY.md](docs/BETA-30-DAY.md) | Beta plan |

```bash
# Local WordPress staging (plugin mounted)
npm run wp:up          # http://localhost:8080
npm run plugin:zip     # wordpress-plugin/ai-growth-os.zip
# In apps/api/.env set MOCK_WP_HEALTH=0 and restart API
```

---

## Status (2026-08-22)

| Area | Status |
|------|--------|
| Auth, orgs, multi-connect, scan, proposals | Done |
| Deploy / verify / rollback (WP) · Mission Control | Done |
| Dedicated `/billing` + `/team` routes | Done |
| Razorpay (test keys + Payment Link fallback) | Done in code — set keys on Render for prod |
| Stripe | Removed / replaced by Razorpay |
| Production web (Vercel) | Live |
| Production API (Render) | Live — confirm env + latest deploy after pushes |

**Not required for basic scanning:** OpenAI, Tavily, SERP, Razorpay plan IDs.

---

## License

TBD.
