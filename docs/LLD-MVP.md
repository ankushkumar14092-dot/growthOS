# AI-Growth-OS — Low-Level Design (MVP)

| Field | Value |
|-------|--------|
| **Product** | AI Growth Operating System (AI-Growth-OS) |
| **Document** | LLD-MVP |
| **Status** | Draft v0.1 |
| **Implements** | [HLD-MVP](./HLD-MVP.md) |
| **Data** | [SCHEMA-MVP](./SCHEMA-MVP.md) |
| **Build order** | [IMPL-MVP](./IMPL-MVP.md) |

> **Design rule:** This LLD is the **authoritative** detailed design for Phase A. Cursor/agents should implement against these contracts. No git/K8s deploy fields; no agent microservice tables.

---

## 1. Repo and package map

```text
apps/web/                 # Next.js App Router — APP-FLOW-MVP screens
apps/api/                 # NestJS REST + BullMQ processors (or apps/api + worker entry)
packages/shared/          # ChangeClass, Patch DTOs, API types
wordpress-plugin/         # health, apply_patch, rollback
```

---

## 2. NestJS modules and REST routes

| Module | Routes (illustrative) |
|--------|------------------------|
| **Auth** | Session/Clerk bridge; current user |
| **Orgs** | `POST /organizations`, `POST /organizations/:id/invites` |
| **Sites** | `GET/POST /sites`, `POST /sites/:id/connect`, `GET /sites/:id/health`, `PATCH /sites/:id/settings` |
| **Jobs** | `POST /sites/:id/audits`, `GET /job-runs/:id` |
| **Issues** | `GET /sites/:id/issues` |
| **Proposals** | `GET /sites/:id/proposals`, `POST /proposals/:id/approve`, `POST /proposals/:id/reject` |
| **Deployments** | `POST /sites/:id/deploy` (batch approved/safe), `POST /deployments/:id/rollback` |
| **Billing** | `POST /billing/checkout`, `POST /billing/portal`, `POST /billing/webhook` |

**Guard on every mutating route:** authenticated user → membership on site’s `organization_id` → role check (`owner`/`member`).

---

## 3. BullMQ queues and processors

| Queue | Job data | Writes | Retry |
|-------|----------|--------|-------|
| `scan` | `{ jobRunId, siteId }` | crawls, pages, issues; status crawling→auditing→done | 3× transient |
| `propose` | `{ jobRunId }` | proposals, patches | 1–2× LLM errors (Phase 4+) |
| `deploy` | `{ jobRunId, patchIds[] }` | deployments (apply) | **Only after health OK**; no blind retry |
| `verify` | `{ deploymentId, patchId }` | verify_result; maybe rollback job | 1× |
| `schedule` | repeatable per site | new job_runs | n/a |

**Phase 3 note:** A single BullMQ `scan` queue runs ContentResolver (wordpress / url_audit / github / zip) then deterministic auditors. Job status maps crawl/audit stages; jobs finish at `done` (no `proposing` until Phase 4).

**Idempotency**

- Pipeline steps: key `job_run_id` + step name
- Deploy/rollback: key `patch_id` + `action` (`apply`|`rollback`)

**Ordering:** scan (crawl+audit) → propose → (await approval or auto) → deploy → verify.

---

## 4. Patch contracts (`packages/shared`)

```ts
export type ChangeClass = 'safe' | 'approve' | 'blocked';

export type PatchTarget = {
  type: 'post_meta' | 'option' | 'post_field';
  post_id?: number;
  key?: string; // e.g. rank_math_title, _yoast_wpseo_title, llms_txt
};

export type PatchDto = {
  id: string;
  site_id: string;
  proposal_id: string;
  change_class: ChangeClass;
  target: PatchTarget;
  before_state: Record<string, unknown>;
  after_state: Record<string, unknown>;
};
```

**Enforcement**

- Client cannot set `change_class`; server assigns from allowlist rules.
- Auto-apply path: filter `change_class === 'safe'` only.
- `blocked` patches never enter deploy queue.

**Safe-class examples:** meta title/description, JSON-LD FAQ/Organization when evidenced, `llms.txt` option, empty image alts.

---

## 5. WordPress plugin API

**Auth:** `Authorization: Bearer <site_token>` or WP Application Password.

### `GET /ai-growth-os/v1/health`

Response (illustrative):

```json
{
  "ok": true,
  "plugin_version": "0.1.0",
  "wp_version": "6.x",
  "seo_plugin": "rank_math" | "yoast" | "none",
  "writable": true
}
```

### `POST /ai-growth-os/v1/apply_patch`

```json
{
  "patch_id": "uuid",
  "target": { "type": "post_meta", "post_id": 12, "key": "rank_math_title" },
  "after_state": { "value": "New Title" }
}
```

Plugin should persist enough to support rollback (or rely on platform-supplied `before_state` on rollback call).

### `POST /ai-growth-os/v1/rollback`

```json
{
  "patch_id": "uuid",
  "target": { "...": "..." },
  "before_state": { "value": "Old Title" }
}
```

Errors: `4xx` validation, `401` auth, `409` conflict, `5xx` WP failure — mapped to deployment `failed`.

---

## 6. Verify algorithm

```ts
async function verifyPatch(patch: PatchDto): Promise<'pass' | 'fail'> {
  // 1. Resolve live URL or llms.txt from target
  // 2. GET with timeout
  // 3. Assert after_state expectations (meta string, JSON-LD contains, option body)
  // 4. return pass | fail
}
```

| Result | Action |
|--------|--------|
| pass | deployment succeeded; if last patch in job → `job_run=done` |
| fail | deployment failed; if site `auto_rollback_safe` and class safe → enqueue rollback; else surface CTA |

---

## 7. Orchestrator transition table

| Current status | Event | Next status |
|----------------|-------|-------------|
| queued | worker_start_crawl | crawling |
| crawling | crawl_ok | auditing |
| crawling | crawl_fail | failed |
| auditing | audit_ok | proposing |
| auditing | audit_fail | failed |
| proposing | propose_ok + needs_approval | awaiting_approval |
| proposing | propose_ok + safe_auto | deploying |
| awaiting_approval | user_approve | deploying |
| awaiting_approval | user_reject | done (or cancelled) |
| deploying | apply_ok | verifying |
| deploying | apply_fail / health_fail | failed |
| verifying | verify_pass | done |
| verifying | verify_fail | failed |
| * | unrecoverable | failed |

Persist `error_code` / sanitized `error_message` on failure.

---

## 8. Data access

Map services to [SCHEMA-MVP](./SCHEMA-MVP.md) tables:

| Service | Primary tables |
|---------|----------------|
| Orgs | organizations, memberships, users |
| Sites | sites, credentials |
| Jobs | job_runs, crawls, pages |
| Audit/Propose | issues, proposals, patches |
| Deploy | deployments |
| Billing | subscriptions, usage_events |

**Credentials:** AES-GCM (`ENCRYPTION_KEY`); decrypt only in WP client; never log plaintext.

---

## 9. UI ↔ API mapping

| Screen ([APP-FLOW-MVP](./APP-FLOW-MVP.md)) | APIs |
|---------------------------------------------|------|
| Connect WordPress | `POST /sites/:id/connect`, `GET .../health` |
| Dashboard / Site list | `GET /sites`, recent `job_runs` |
| Site detail | issues, proposals |
| Fix review | proposal/patch payload; approve/reject |
| Job status | `GET /job-runs/:id` (poll) |
| Rollback | `POST /deployments/:id/rollback` |
| Billing | checkout / portal |

---

## 10. Error codes

| Code | When |
|------|------|
| `crawl_timeout` | Fetch exceeded limit |
| `health_failed` | Plugin health not ok before deploy |
| `verify_mismatch` | Live HTML ≠ after_state |
| `llm_rate_limited` | Provider 429 |
| `forbidden_change_class` | Attempt to deploy blocked/non-safe in auto path |
| `org_forbidden` | Cross-tenant access |
| `credential_invalid` | WP auth failed |

UI: toast + Mission Timeline failed step ([UI-UX-BRIEF-MVP](./UI-UX-BRIEF-MVP.md)).

---

## 11. Testing LLD (must before pilots)

| Case | Expected |
|------|----------|
| Unit: blocked patch in deploy request | Reject `forbidden_change_class` |
| Unit: idempotent apply same patch_id | Single WP write effect |
| Integration: apply → verify pass | `done` |
| Integration: apply → verify fail → rollback | `before_state` restored |
| API: member of org A cannot read org B site | 403 |
| Schedule: weekly job enqueued | New `job_run` |

---

## 12. Explicit non-goals

- `git_commit_sha` / `kubernetes_cluster_id` on deployments
- Per-agent microservice DB design
- GraphQL gateway
- DNS-first verification as primary connect path

---

## Document control

| Version | Date | Notes |
|---------|------|--------|
| v0.1 | 2026-07-29 | MVP LLD; patch/WP/verify contracts |
