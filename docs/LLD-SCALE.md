# AI-Growth-OS — Low-Level Design (Scale)

| Field | Value |
|-------|--------|
| **Document** | LLD-SCALE |
| **Status** | Draft v0.1 |
| **Companion** | [LLD-MVP](./LLD-MVP.md) · [HLD-SCALE](./HLD-SCALE.md) · [SCHEMA-SCALE](./SCHEMA-SCALE.md) |

> **Reference only.** No Day-1 implementation checklist. Extend LLD-MVP contracts; do not replace them for WordPress.

---

## 1. Growth OS data touchpoints

When Growth Brain ships, services read/write:

| Table | LLD use |
|-------|---------|
| `growth_goals` / `growth_tasks` | Planner persists roadmap; tasks link `job_run_id` |
| `ai_memory` | Post-verify learnings |
| `ai_decisions` | Model, cost, accepted, result |
| `ai_citations` | Visibility checks |
| `experiments` | Variant patch refs + winner |
| `rollback_events` | Ops metrics alongside `deployments` |

Estimates in JSON are labeled — not SLAs.

---

## 2. Agents vs job types

Prefer **named job types** / processors (`planner`, `crawl`, …) over mandatory `agents` + `agent_tasks` tables.

If productized “custom agents” appear later, store config in `agents` and executions as tasks **linked** to `job_runs`, reusing verify/deploy.

---

## 3. RLS pattern

```sql
SET app.current_organization = '<uuid>';
-- policies on tenant tables USING (organization_id = current_setting(...)::uuid)
```

Enable after app-layer isolation is proven.

---

## 4. Git / Next adapter (additive)

Optional side table, e.g. `git_deployments(repo, sha, patch_id)` for non-WP targets.

**Do not** require `git_commit_sha` on WP `deployments` rows.

---

## 5. Vectors

`vector_embeddings` via pgvector on Postgres; extract to Pinecone only on scale triggers.

---

## 6. Explicit non-goals for early SCALE PRs

Rewriting WP plugin contract; mandating Kafka before BullMQ pain; shipping Growth Brain without analytics connectors for business KPIs.

---

## Document control

| Version | Date | Notes |
|---------|------|--------|
| v0.1 | 2026-07-29 | Scale LLD companion |
