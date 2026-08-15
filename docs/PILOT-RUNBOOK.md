# Pilot runbook — AI Growth OS

| Field | Value |
|-------|--------|
| **Audience** | Founders, CS, pilot agencies |
| **Phase** | 8 — Pilot readiness |
| **Last updated** | 2026-08-15 |

## 0. Pre-flight

1. `npm run db:up` · Redis up · `npm run dev:api` · `npm run dev:web`
2. Staging WP: `npm run wp:up` → http://localhost:8080
3. Plugin: `npm run plugin:zip` or use mounted `wordpress-plugin/ai-growth-os`
4. In `apps/api/.env`: **`MOCK_WP_HEALTH=0`** (real trust loop)
5. Optional: `SENTRY_DSN`, `STRIPE_SECRET_KEY`, `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_AGENCY`

## 1. Connect (first website)

1. Sign up → create workspace
2. Connect Website → WordPress
3. Base URL = staging (`http://localhost:8080`) or customer staging
4. Paste **Settings → AI-Growth-OS** site token → Connect & verify
5. Health must be `ok`

**Revoke credentials:** rotate token in WP settings, reconnect, or delete site credential by reconnecting with a new token.

## 2. First audit

1. Site scan → **Run scan**
2. Wait for `awaiting_approval` (not stuck — your turn)
3. Review ★ recommended proposals (before → after)
4. Approve → **Deploy** → Mission Timeline verify
5. Optional: **Rollback** to confirm safety

Supported auto-fixes: title, meta, canonical, FAQ, Open Graph, llms.txt, robots/sitemap drafts.

## 3. Weekly automation (Phase 7)

On Site scan → **Automation**:

| Setting | Effect |
|---------|--------|
| Schedule = weekly | BullMQ Monday 09:00 UTC re-scan |
| Schedule = manual | No automatic scans |
| Safe auto-apply ON | Auto-approve + deploy **`safe`** proposals only |

Leave safe auto-apply **OFF** for new pilots until they trust diffs.

## 4. Billing stub (Phase 7)

Mission Control → **Billing**:

- Without Stripe keys: checkout activates Starter/Agency in **stub mode**
- With Stripe: Checkout + Customer Portal
- Usage meters: scans, AI generations (see `/organizations/:id/usage`)

## 5. Pilot metrics

`GET /organizations/:id/pilot-metrics` (also Mission Control):

- Scan completion %, proposal approval %, deploy success %, rollback %, WAU
- Targets: approval ≥60%, deploy success ≥95% (BETA-30-DAY)

## 6. Rollback & incidents

1. Open failed Mission Timeline → read verify checks
2. Click **Rollback** if apply succeeded but content is wrong
3. If plugin broken: deactivate AI-Growth-OS → clear cache → reactivate → flush permalinks
4. File Sentry issue if `SENTRY_DSN` set

## 7. Recruit checklist (2–5 agencies)

- [ ] Staging WP green apply→verify→rollback
- [ ] Plugin zip shared privately ([PLUGIN-INSTALL.md](./PLUGIN-INSTALL.md))
- [ ] Pilot signed NDA / beta terms
- [ ] First live site connected with `MOCK_WP_HEALTH=0`
- [ ] Weekly check of pilot-metrics + funnel events

## Related

- [LIVE-SITE-GUIDE.md](./LIVE-SITE-GUIDE.md)
- [PLUGIN-INSTALL.md](./PLUGIN-INSTALL.md)
- [GROWTH-PILLARS.md](./GROWTH-PILLARS.md)
- [BETA-30-DAY.md](./BETA-30-DAY.md)
