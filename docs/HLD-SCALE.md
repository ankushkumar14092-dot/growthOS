# AI-Growth-OS — High-Level Design (Scale)

| Field | Value |
|-------|--------|
| **Document** | HLD-SCALE |
| **Status** | Draft v0.1 |
| **Companion** | [HLD-MVP](./HLD-MVP.md) · [TRD-SCALE](./TRD-SCALE.md) · [IMPL-SCALE](./IMPL-SCALE.md) |

> **Reference only** until [TRD-SCALE](./TRD-SCALE.md) triggers fire and [IMPL-MVP](./IMPL-MVP.md) pilots succeed.

---

## 1. Intent

Evolve the modular monolith into a **strangled** service landscape without rewriting the WP patch/verify/rollback contract.

```text
Control plane (API + UI)
    ↓
Job / event backbone (BullMQ → later Kafka)
    ↓
Crawl | Audit | Propose | Deploy | Verify | Monitor workers
    ↓
CMS adapters (WP, Shopify, Webflow, Git…)
```

---

## 2. Target capabilities

| Capability | Notes |
|------------|--------|
| Worker extract | Independent deploy/scale of crawl vs deploy |
| Multi-CMS | Additive adapters; WP remains patch-based |
| Growth Brain | Goal → plan → execute via existing deploy/verify |
| Data | pgvector first; Pinecone if needed |
| Security | RLS, SSO, Vault when deals require |
| Topology | K8s / multi-region only if SLOs + revenue justify |

---

## 3. Invariants

- `patches.before_state` / `after_state` / `change_class` remain the trust core for WordPress.
- No big-bang rewrite of Next.js/NestJS control plane.
- Growth Brain does not bypass human approval for non-safe classes.

---

## 4. References

[SCHEMA-SCALE](./SCHEMA-SCALE.md) · [APP-FLOW-VISION](./APP-FLOW-VISION.md) · [UI-UX-BRIEF-VISION](./UI-UX-BRIEF-VISION.md) · [LLD-SCALE](./LLD-SCALE.md)

---

## Document control

| Version | Date | Notes |
|---------|------|--------|
| v0.1 | 2026-07-29 | Scale HLD companion |
