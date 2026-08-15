# AI-Growth-OS — Implementation Plan (Scale)

| Field | Value |
|-------|--------|
| **Product** | AI Growth Operating System (AI-Growth-OS) |
| **Document** | IMPL-SCALE |
| **Status** | Draft v0.1 |
| **Horizon** | After agency pilots / Phase B–D |
| **Companion** | [IMPL-MVP](./IMPL-MVP.md) · [TRD-SCALE](./TRD-SCALE.md) · [SCHEMA-SCALE](./SCHEMA-SCALE.md) |

> **Execution rule:** Do **not** start this plan until [IMPL-MVP](./IMPL-MVP.md) Phase 8 exit criteria are met (trusted WP write loop + pilots). This document orders post-PMF work only.

---

## 1. Triggers (when to pull from this backlog)

Start a SCALE workstream when one or more hold ([TRD-SCALE](./TRD-SCALE.md)):

- Job/audit SLOs missed at higher site volume
- Enterprise deals require SSO, SOC2, deep RBAC, or API keys
- Multi-CMS demand (Shopify / Webflow / GitHub) validated
- AI visibility / Growth Brain UI demanded by paying agencies
- Vector/RAG or multi-region needs proven by usage

---

## 2. Ordered follow-ons

| Order | Work | Docs |
|-------|------|------|
| 1 | Shopify (and/or Webflow) adapter — same patch/verify contract where possible | PRD Phase B, TRD-SCALE |
| 2 | Human-approved content + internal linking apply | PRD Phase B |
| 3 | `ai_citations` + thin multi-engine visibility UI | SCHEMA-SCALE, APP-FLOW Should→Vision |
| 4 | Growth Brain / Strategy UI + `growth_goals` / `growth_tasks` | APP-FLOW-VISION, UI-UX-BRIEF-VISION, SCHEMA-SCALE |
| 5 | `ai_memory`, `experiments`, `ai_decisions` + analytics connectors | SCHEMA-SCALE |
| 6 | Enterprise: roles matrix, api_keys, webhooks, RLS | SCHEMA-SCALE, TRD-SCALE |
| 7 | pgvector in Postgres; Pinecone only if needed | SCHEMA-SCALE |
| 8 | Extract BullMQ workers → services; Kafka if required | TRD-SCALE |
| 9 | Kubernetes / multi-region only if SLOs and revenue justify | TRD-SCALE |

**Invariant:** Never replace WP `patches` / rollback with Argo-only deploys for WordPress sites. Git/K8s adapters are additive for other CMSs.

---

## 3. What not to do early

- Introducing Nx solely for fashion
- Argo CD for MVP WordPress writes
- Building Growth Brain before deploy/rollback trust
- Guaranteeing lead/revenue lifts in implementation milestones

---

## 4. References

- [IMPL-MVP](./IMPL-MVP.md) — execute first
- [TRD-SCALE](./TRD-SCALE.md) — architecture triggers
- [SCHEMA-SCALE](./SCHEMA-SCALE.md) — growth + enterprise tables
- [APP-FLOW-VISION](./APP-FLOW-VISION.md) · [UI-UX-BRIEF-VISION](./UI-UX-BRIEF-VISION.md) — Command Center UX

---

## Document control

| Version | Date | Notes |
|---------|------|--------|
| v0.1 | 2026-07-29 | Post-pilot implementation ordering |
