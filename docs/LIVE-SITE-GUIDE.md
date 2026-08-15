# Live website guide — Site scan, proposals & deploy

| Field | Value |
|-------|--------|
| **Product** | AI Growth OS |
| **Audience** | Founders, beta users, anyone testing a real site |
| **Last updated** | 2026-08-04 |
| **Related** | [PLUGIN-INSTALL.md](./PLUGIN-INSTALL.md) · [BETA-FAQ.md](./BETA-FAQ.md) · [APP-FLOW-MVP.md](./APP-FLOW-MVP.md) |

This is the **full how-to** for using **Site scan** with a live website: what the screen means, what each connect type can do, and how to run the trust loop on WordPress (staging or production).

---

## 1. What you are looking at (Site scan)

**Site scan** is the control center for **one connected site**. It is not a generic SEO report — it drives the product loop:

```text
Connect → Scan → Propose → Approve → Deploy → Verify → Rollback
```

| Section on screen | Meaning |
|-------------------|---------|
| **Run scan** | Queues a crawl + audit of the site (BullMQ job). Status moves queued → crawling → auditing → done / failed. |
| **AI proposals** | Safe fix suggestions for **meta title**, **meta description**, and **FAQ schema** only. Review before/after → Approve creates a **draft patch** (nothing live yet). |
| **Deployments** | After approve, Deploy writes to WordPress, verifies live HTML, and rolls back on failure. Empty until you approve + deploy. |
| **Scan history** | Past job runs: status, page count, issue count, time. |
| **Issues (latest)** | Findings from the newest completed scan (info / warn / error). Not every issue becomes a proposal. |

**USP:** Advice alone is not the product. On WordPress, **Deploy** can write, verify, and roll back.

---

## 2. What works today (honest scope)

| Capability | WordPress | Live URL audit | GitHub | ZIP upload |
|------------|-----------|----------------|--------|------------|
| Connect + health | Yes (plugin or app password) | Yes (public URL) | Yes (token + repo) | Yes (upload) |
| Scan / issues | Yes | Yes | Yes | Yes |
| AI proposals (title / meta / FAQ) | Yes | Yes | Yes | Yes |
| **Deploy** | Live plugin write | Apply **guide** + live HTML recheck | Opens a **GitHub PR** | **Fix pack** artifact |
| Verify | Live HTML | Live HTML match (honest) | PR file contains After | Artifact written |
| Rollback | Plugin restore | Remove guide artifact | Close PR | Remove artifact |

Deployable change types (MVP):

1. Meta title  
2. Meta description  
3. FAQ schema (JSON-LD)  
4. Canonical URL  

The Site scan page shows **Top fixes** in owner language (why + how to fix), including manual-only issues.

**Deploy modes (honest):**

| Mode | Connection | What Deploy does |
|------|------------|------------------|
| `wordpress_live` | WordPress | Write via plugin → verify HTML → auto-rollback on fail |
| `github_pr` | GitHub | Branch + patch file + open PR → verify PR contents → close PR on fail/rollback |
| `zip_artifact` | ZIP | Write fix pack under `storage/deploy-artifacts/` (you apply in the project) |
| `url_guide` | Live URL | Export apply instructions; cannot write to Vercel/hosts; rechecks live HTML |

OpenAI is **optional**. Without a key, proposals still work via rules. With `OPENAI_API_KEY`, meta title/description copy can be polished (`source: "llm"`). FAQ stays rule-based. Deploy never requires OpenAI.

---

## 3. Prerequisites (local app)

You need the Growth OS stack running:

| Service | Typical URL / port |
|---------|-------------------|
| Web | http://localhost:3000 |
| API | http://localhost:4000 (`GET /health`) |
| Postgres | host port **5433** |
| Redis | **6379** |

```bash
npm run db:up
npm run build -w @ai-growth-os/shared
npm run dev:api    # terminal 1
npm run dev:web    # terminal 2
```

Env files (keep secrets out of git):

- Root `.env`
- `apps/api/.env` (API reads this first; also loads `../../.env`)
- `apps/web/.env.local` (`NEXT_PUBLIC_API_URL=http://localhost:4000`)

| Variable | Live WP deploy | Notes |
|----------|----------------|-------|
| `MOCK_WP_HEALTH` | Must be **`0`** | `1` = fake health/apply/rollback (UI demos only) |
| `OPENAI_API_KEY` | Optional | Polishes meta proposals only |
| `ENCRYPTION_KEY` | Required | Do not rotate casually — breaks stored credentials |
| `JWT_SECRET` | Required | Auth |

After changing env: **restart the API**.

---

## 4. Choose your path

### Path A — Full trust loop (recommended for “does deploy work?”)

Use **WordPress** + plugin + `MOCK_WP_HEALTH=0`.

- **A1 Local staging WP** (Docker) — safest practice ground  
- **A2 Real / staging WordPress on the internet** — beta-ready proof  

### Path B — Scan only (any public site)

Use **Live URL** connection. You get scans, issues, and proposals. **No deploy.**

### Path C — Code snapshot audit

**GitHub** or **ZIP** — scan for issues/proposals; **no WordPress write**.

---

## 5. Path A1 — Local staging WordPress (full detail)

### 5.1 Start staging WP

```bash
npm run wp:up
# Site: http://localhost:8080
# Plugin folder is mounted from wordpress-plugin/ai-growth-os
```

1. Open http://localhost:8080 and finish the WordPress install wizard.  
2. Log into WP Admin.  
3. **Plugins** → activate **AI-Growth-OS** (if not already active).  
4. **Settings → AI-Growth-OS** → copy the **Site token**.

Build a ZIP for upload installs anytime:

```bash
npm run plugin:zip
# → wordpress-plugin/ai-growth-os.zip
```

More plugin detail: [PLUGIN-INSTALL.md](./PLUGIN-INSTALL.md).

### 5.2 Disable mocks

In `apps/api/.env` (and root `.env` if you keep them in sync):

```bash
MOCK_WP_HEALTH=0
```

Restart API:

```bash
npm run dev:api
```

### 5.3 Connect from the app

1. Open http://localhost:3000 → **Sign up** or **Log in**.  
2. Create a **workspace** if prompted.  
3. **Connect Website → WordPress**.  
4. **Base URL / domain:** `http://localhost:8080` (no path like `/wp-admin`).  
5. Paste the **site token**.  
6. **Connect & verify** — health must show success (`ok: true`).  

If health fails, fix plugin/token/URL before scanning (see §10).

### 5.4 Run Site scan

1. Open the connected site → **Site scan**.  
2. Click **Run scan**.  
3. Wait until **Scan history** shows status **done**.  
4. Check **Issues (latest)** and **AI proposals**.

### 5.5 Approve → Deploy → Verify → Rollback

1. Open a proposal → review **before / after** and change class.  
2. **Approve** → creates a **draft patch** (still not live).  
3. **Deploy** → API calls the plugin `apply_patch`, then verifies live HTML.  
4. Watch **Mission Timeline** / deployment events: apply → verify → success (or auto-rollback).  
5. Optionally **Rollback** from the deployment detail to restore `before_state`.

Tear down staging WP when done:

```bash
npm run wp:down
```

---

## 6. Path A2 — Real / staging WordPress on the internet

Same loop as A1, but the site is a public or staging domain.

### 6.1 Install plugin on the live site

1. Run `npm run plugin:zip` locally.  
2. On WordPress: **Plugins → Add New → Upload Plugin** → upload `ai-growth-os.zip` → **Install → Activate**.  
3. **Settings → AI-Growth-OS** → copy **Site token**.  
4. Prefer a **staging subdomain** before production.

### 6.2 App config for real writes

```bash
MOCK_WP_HEALTH=0
```

Restart API. Confirm `GET http://localhost:4000/health` still works.

### 6.3 Connect

1. Connect type: **WordPress**.  
2. Base URL: `https://your-site.com` (HTTPS preferred; no trailing slash / no `/wp-admin`).  
3. Paste site token → verify health.  

**Auth options**

| Method | When to use |
|--------|-------------|
| Plugin site token (Bearer) | Recommended for beta |
| Application Password (HTTP Basic) | Fallback; WP user needs `edit_posts` |

### 6.4 Scan → propose → deploy

Same as §5.4–5.5.

**Safety checklist before production deploy**

- [ ] Health is green  
- [ ] You reviewed the before/after diff  
- [ ] Change type is title / meta / FAQ only  
- [ ] You accept that verify failure triggers automatic rollback  
- [ ] Token is not committed to git or shared in chat  

---

### Path B — Live URL audit + guide deploy

Use when you want to test scanning a public marketing site without installing a plugin.

1. **Connect Website → Live URL** (connection type `url_audit`).  
2. Enter the public homepage URL / domain.  
3. Connect (no token).  
4. **Run scan** on Site scan.  
5. Review issues and proposals.  
6. **Approve → Deploy** packages an **apply guide** and rechecks live HTML.  
   - It does **not** write to Vercel/Netlify/etc.  
   - Mission Timeline shows instructions; apply the After value in your CMS/host, then re-deploy to recheck.

---

## 8. Path C — GitHub or ZIP (deployable)

| Type | How | Deploy |
|------|-----|--------|
| **GitHub** | Repo URL + token with **repo write** (PR create) | Opens PR under `.ai-growth-os/patches/`; merge to apply in git; Rollback closes PR |
| **ZIP** | Create site as ZIP type → upload `.zip` → scan | Packages fix pack JSON/MD; apply in your files yourself |

GitHub token needs permission to create branches/PRs on the repo.

---

## 9. Understanding empty states (common gotcha)

### “No proposals yet” after a successful scan

The scanner found issues, but **none map to a deployable proposal**.

Today, only these issue types become proposals:

| Issue type | Proposal |
|------------|----------|
| `missing_title` | Meta title |
| `missing_meta_description` | Meta description |
| `no_schema` (FAQ path) | FAQ schema |

Examples that show in **Issues** but do **not** create proposals:

- `no_llms_txt` (info)  
- `missing_h1`, `multiple_h1`  
- `missing_alt`, `missing_canonical`  
- `no_sitemap`, `no_robots`  
- `thin_content`, security headers, etc.

**What to do:** Scan a page that is missing title/meta/FAQ schema, or use staging WP with empty SEO fields, then **Run scan** again. You can also trigger proposal generation from the API/UI if your build exposes **Generate proposals** after a scan with eligible issues.

### “No deployments yet”

Normal until you **Approve** at least one proposal and then **Deploy**.

Deploy works on all four connection types, with different backends (live WP / GitHub PR / ZIP pack / URL guide).

### Scan shows few pages

MVP crawl depth/limits are intentional. Homepage + linked pages up to the scanner’s page budget. Re-run after content changes.

### Proposals say `source: "rule"` not `"llm"`

OpenAI key missing, invalid, or API not restarted after setting `OPENAI_API_KEY`. Put the key in **`apps/api/.env`** (and root `.env`), restart API, generate new proposals.

---

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Health 401 | Token mismatch | Rotate token in WP Settings → AI-Growth-OS; reconnect |
| Health unreachable | Bad base URL, firewall, SSL, wrong port | Use origin only (`https://site.com`); allow API host to reach site |
| Apply fails | Plugin inactive / old / not writable | Activate plugin v0.5+; check WP permissions |
| Verify fails → rollback | Live HTML did not match expected patch | Read Mission Timeline; SEO plugin conflict; fix page and redeploy |
| Deploy “works” but WP unchanged | Still on mock | Set `MOCK_WP_HEALTH=0`, restart API, reconnect |
| Scan stuck queued | Redis / worker down | Ensure Redis up; API logs show Scan queue worker started |
| CORS / login fails | Web/API URL mismatch | `CORS_ORIGIN` and `NEXT_PUBLIC_API_URL` must match how you open the app |
| Encrypted credential errors | `ENCRYPTION_KEY` changed | Restore previous key or reconnect site credentials |

---

## 11. End-to-end checklist (copy/paste)

### Real WordPress deploy proof

```text
[ ] MOCK_WP_HEALTH=0 and API restarted
[ ] Plugin installed + activated; site token copied
[ ] Connected as WordPress; health ok
[ ] Run scan → status done
[ ] At least one proposal for title / meta / FAQ
[ ] Approve → draft patch created
[ ] Deploy → Mission Timeline shows apply + verify success
[ ] Optional: Rollback restores previous state
[ ] Confirm change visible on the live page (View Source / SEO plugin)
```

### Scan-only live URL proof

```text
[ ] Connected as Live URL
[ ] Run scan → done
[ ] Issues list populated
[ ] Proposals appear only if eligible issues exist
[ ] Deploy not expected to write to WordPress
```

---

## 12. Screen map (where to click)

```text
Landing → Sign up / Login
  → Create workspace (first time)
  → Connect Website (WordPress | Live URL | GitHub | ZIP)
  → Mission Control (multi-site overview)
  → Site → Site scan
        → Run scan
        → AI proposals → Approve / Reject
        → Deployments → Deploy / Rollback / Timeline
        → Scan history + Issues
```

Mission Control aggregates health, pulse, priorities, and activity across sites. Site scan is where you **execute** the loop for one domain.

---

## 13. Security & beta etiquette

- Prefer staging domains before production.  
- Rotate site tokens and OpenAI keys if leaked (chat, screenshots, logs).  
- Never commit `.env` or plugin tokens.  
- Always review diffs before Approve / Deploy.  
- Treat automatic rollback as a feature, not a bug.

---

## 14. Phase 7–8 (automation, billing, pilots)

Weekly schedules, safe auto-apply, Stripe stub/checkout, and pilot metrics are available. See [PILOT-RUNBOOK.md](./PILOT-RUNBOOK.md) and [BETA-30-DAY.md](./BETA-30-DAY.md).

---

## Quick links

| Doc | Use when |
|-----|----------|
| [PLUGIN-INSTALL.md](./PLUGIN-INSTALL.md) | Installing / troubleshooting the WP plugin |
| [BETA-FAQ.md](./BETA-FAQ.md) | Short product answers for beta users |
| [BETA-30-DAY.md](./BETA-30-DAY.md) | Founder Track A plan |
| [README.md](../README.md) | Repo quick start |
