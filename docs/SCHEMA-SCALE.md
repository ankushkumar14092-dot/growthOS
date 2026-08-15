# AI-Growth-OS — Database Schema (Scale / Growth OS)

| Field | Value |
|-------|--------|
| **Product** | AI Growth Operating System (AI-Growth-OS) |
| **Document** | SCHEMA-SCALE |
| **Status** | Draft v0.1 |
| **Horizon** | Post–MVP trust / Phase C–D |
| **Companion** | [SCHEMA-MVP](./SCHEMA-MVP.md) · [TRD-SCALE](./TRD-SCALE.md) · [APP-FLOW-VISION](./APP-FLOW-VISION.md) |

> **DDL rule:** Reference-only until scale or Growth Brain triggers. Evolve [SCHEMA-MVP](./SCHEMA-MVP.md) via strangler migrations. **Never break** `patches.before_state` / `after_state` / `change_class` or WP deploy semantics.

**Stack evolution:** Postgres 15 + **pgvector** first; Redis + BullMQ remain. Introduce Pinecone, Timescale, Kafka only when triggers in TRD-SCALE fire.

---

## 1. Why this document

SCHEMA-MVP models the **technical trust loop** (audit → patch → verify). The product vision is a **Growth Operating System**. This doc adds entities for goals, plans, memory, experiments, citations, and enterprise multi-tenant controls — without requiring them on Day 1.

---

## 2. Growth OS entities

Estimates and impact fields are **observational / directional**, not SLAs.

### growth_goals

| Column | Type | Notes |
|--------|------|--------|
| id | uuid PK | |
| organization_id | uuid FK | |
| site_id | uuid FK | Nullable = org-wide |
| goal | varchar | e.g. more_leads, ai_visibility |
| target_value | numeric | Nullable |
| target_unit | varchar | percent, count, … |
| deadline | date | Nullable |
| status | varchar | active/completed/cancelled |
| created_at | timestamptz | |

### growth_tasks

| Column | Type | Notes |
|--------|------|--------|
| id | uuid PK | |
| goal_id | uuid FK | |
| priority | int | |
| title | varchar | |
| impact_band | varchar | low/medium/high |
| estimated_gain | jsonb | Labeled estimates only |
| status | varchar | pending/running/done/failed |
| linked_job_run_id | uuid FK | Nullable |
| completed_at | timestamptz | |

### ai_memory

| Column | Type | Notes |
|--------|------|--------|
| id | uuid PK | |
| organization_id / site_id | uuid FK | |
| observation | text | What happened |
| reason | text | Why it matters |
| confidence | numeric | 0–1 |
| related_patch_id | uuid FK | Nullable |
| created_at | timestamptz | |

### experiments

| Column | Type | Notes |
|--------|------|--------|
| id | uuid PK | |
| site_id | uuid FK | |
| hypothesis | text | |
| variant_a / variant_b | jsonb | Patch refs or content |
| winner | varchar | Nullable |
| impact | jsonb | Measured after connectors exist |
| status | varchar | |

### ai_citations

| Column | Type | Notes |
|--------|------|--------|
| id | uuid PK | |
| site_id | uuid FK | |
| provider | varchar | chatgpt, gemini, claude, perplexity, … |
| query | text | Prompt used |
| mentioned | boolean | |
| position | int | Nullable |
| citation_url | text | Nullable |
| checked_at | timestamptz | |

Thin AI Visibility in MVP Should can start as rows here or as `usage_events`/json until this table is migrated.

### ai_decisions

| Column | Type | Notes |
|--------|------|--------|
| id | uuid PK | |
| organization_id / site_id | uuid FK | |
| reason | text | |
| confidence | numeric | |
| model | varchar | |
| cost_cents | numeric | Nullable |
| accepted | boolean | Nullable |
| result | jsonb | Post-hoc outcome |
| proposal_id / patch_id | uuid FK | Nullable |
| created_at | timestamptz | |

### rollback_events

| Column | Type | Notes |
|--------|------|--------|
| id | uuid PK | |
| deployment_id | uuid FK | The rollback deployment |
| reason | text | verify_fail, user, auto_safe |
| trigger | varchar | system/user |
| restored_patch_id | uuid FK | |
| recovery_ms | int | Nullable |
| created_at | timestamptz | |

Complements MVP `deployments` with action=`rollback`; does not replace it.

---

## 3. Enterprise extensions (from full schema drafts)

Add when GTM/security demand it:

| Area | Tables / notes |
|------|----------------|
| RBAC matrix | `roles`, `permissions`, `role_permissions`; expand beyond owner/member |
| API access | `api_keys` (hashed keys, scopes, revoke) |
| Webhooks / notifications | `webhooks`, `notifications` (email/slack/webhook; SMS later) |
| Prompt registry | `ai_prompt_templates`, `ai_prompt_versions` |
| Billing depth | `billing_events`, `invoices` (or keep Stripe + sync) |
| Audit hardening | Immutable `audit_logs` (INSERT-only trigger) |

### Agent model

Prefer **pipeline stages as job types** + `ai_decisions` over early multi-agent table sprawl.

If productized later:

```text
agents (workspace config)
  → agent_tasks (execution linked to job_runs / scans)
```

Map conceptually: Planner → Crawler → Audit → Content → Deploy → Verify → Learning — implemented as workers, not necessarily one row type per agent on Day 1 of SCALE.

---

## 4. Vectors: pgvector first

```text
vector_embeddings (
  id, site_id, url, chunk_index,
  embedding vector(N),
  created_at,
  UNIQUE(site_id, url, chunk_index)
)
```

- Keep RLS/tenant keys in the same DB as site data.
- **Pinecone** (or similar) only after QPS/ops triggers — extract, don’t start there.

---

## 5. RLS pattern (when enabling)

Application still sets org context; policies defend defense-in-depth:

```sql
-- Example
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_isolation ON sites
  USING (organization_id = current_setting('app.current_organization')::uuid);

CREATE POLICY org_insert ON sites
  FOR INSERT
  WITH CHECK (organization_id = current_setting('app.current_organization')::uuid);
```

Enable after MVP app-layer checks are proven. Same pattern for tenant-scoped tables.

---

## 6. Deploy adapters (future)

- **WordPress:** keep MVP patch tables forever for WP sites.
- **Git / Next.js adapter (later):** optional columns or side table `git_deployments(sha, repo, …)` — do not overload WP `deployments` with required k8s fields.

---

## 7. Migration notes

1. Ship SCHEMA-MVP; prove deploy/rollback.
2. Add `ai_citations` / thin visibility if product Should demands.
3. Add `growth_goals` / `growth_tasks` when Growth Brain UI ships.
4. Add `ai_memory`, `experiments`, `ai_decisions` with analytics connectors.
5. Add RBAC matrix, api_keys, webhooks for enterprise.
6. Enable pgvector → optional Pinecone.
7. Consider Timescale only if time-series volume hurts plain Postgres.

**Invariant:** patch/rollback contract unchanged across migrations.

---

## 8. Deferred first-class tables

Competitors, content calendar, weekly reports, growth milestones — start as **JSON reports** or files; promote to tables only when query patterns demand.

---

## Document control

| Version | Date | Notes |
|---------|------|--------|
| v0.1 | 2026-07-29 | Scale/Growth OS schema; MVP remains DDL authority |
