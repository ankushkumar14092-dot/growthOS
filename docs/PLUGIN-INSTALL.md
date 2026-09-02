# AI-Growth-OS WordPress plugin — install guide

For private beta and staging. Plugin source: `wordpress-plugin/ai-growth-os/`.

**Full product walkthrough (Site scan → deploy on a live site):** [LIVE-SITE-GUIDE.md](./LIVE-SITE-GUIDE.md)

## 1. Get the ZIP

```bash
npm run plugin:zip
# → wordpress-plugin/ai-growth-os.zip
```

Or copy the folder `wordpress-plugin/ai-growth-os/` into `wp-content/plugins/`.

## 2. Install on WordPress

1. WP Admin → **Plugins → Add New → Upload Plugin**
2. Upload `ai-growth-os.zip` → Install → **Activate**
3. **Settings → AI-Growth-OS** → copy the **Site token**

## 3. Connect from AI Growth OS

1. Open [https://grothos.in](https://grothos.in) (production) or [http://localhost:3000](http://localhost:3000) (local)
2. Sign up → create workspace
3. **Connect Website → WordPress**
4. Domain / Base URL = your site (local staging: `http://localhost:8080`)
5. Paste the site token → **Connect & verify**
6. Health must return `ok: true`

## 4. Trust loop (must work without mocks)

In `apps/api/.env`:

```bash
MOCK_WP_HEALTH=0
```

Restart the API. Then:

```text
Scan → Approve proposal → Deploy → Verify → Rollback
```

Supported deploy types: meta title, meta description, FAQ schema, canonical, Open Graph, llms.txt, robots/sitemap drafts.

## 5. Local staging WordPress (Docker)

```bash
npm run wp:up
# Site: http://localhost:8080
# Plugin is mounted from ./wordpress-plugin/ai-growth-os
```

1. Complete WP install wizard (any admin user)
2. Activate **AI-Growth-OS** under Plugins
3. Copy token from Settings → AI-Growth-OS
4. Connect with base URL `http://localhost:8080` and `MOCK_WP_HEALTH=0`

Tear down:

```bash
npm run wp:down
```

## Auth options

| Method | Header |
|--------|--------|
| Plugin token (recommended) | `Authorization: Bearer <site_token>` |
| Application Password | HTTP Basic (WP user + app password), user needs `edit_posts` |

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Health 401 | Token mismatch — rotate in WP settings and reconnect |
| Health unreachable | Check base URL, HTTPS cert, firewall; no trailing path |
| Apply fails | Plugin v0.5+ required; activate plugin; site writable |
| Verify fails then rollback | Expected safety — check Mission Timeline; fix HTML injection / SEO plugin conflict |
| Still using mock | Ensure `MOCK_WP_HEALTH` is unset or `0` and API restarted |

## Security notes for beta

- Rotate site token if leaked
- Prefer staging domains before production
- Always review diffs before Approve / Deploy
- Rollback restores `before_state` via plugin
