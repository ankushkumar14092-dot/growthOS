# AI-Growth-OS WordPress plugin

Safe apply / verify / rollback bridge for IMPL-MVP Phase 5.

## Endpoints

| Method | Route | Auth | Status |
|--------|-------|------|--------|
| GET | `/wp-json/ai-growth-os/v1/health` | Bearer site token **or** Application Password | Ready |
| POST | `/wp-json/ai-growth-os/v1/apply_patch` | same | Ready (v0.5) |
| POST | `/wp-json/ai-growth-os/v1/rollback` | same | Ready (v0.5) |

## Supported patches (MVP)

- Meta title (`rank_math_title` / overrides)
- Meta description (`rank_math_description` / overrides)
- FAQ schema JSON-LD (`faq_schema_jsonld`)

The plugin stores overrides in `aigos_overrides`, keeps per-patch backups in `aigos_patch_backups`, and injects title / meta / FAQ into the front-end so live verify can see the change.

## Install

1. Copy `ai-growth-os/` into `wp-content/plugins/`
2. Activate in WP Admin
3. **Settings → AI-Growth-OS** — copy the site token
4. In AI-Growth-OS web app: Connect wizard → paste token → health must return `ok: true`

## Auth

- **Plugin token:** `Authorization: Bearer <site_token>`
- **Application Password:** WP user + app password via HTTP Basic (user must have `edit_posts`)

## Local mock

API `MOCK_WP_HEALTH=1` simulates health + apply + rollback without a live WP install (state under `apps/api/storage/mock-wp/`).
