# 30-day company plan (post–Phase 6)

Core MVP is frozen. This is Track A: validate with real users before Phase 7.

## Weeks

| Week | Focus | Success |
|------|--------|---------|
| 1 | Real WordPress (no mocks) | Someone else completes connect→deploy→rollback |
| 2 | Onboarding TTFV &lt; 5 min | First scan + highlighted proposal without help |
| 3 | Marketing site + waitlist | Join Private Beta CTA live |
| 4 | Demo video + outreach | 10 beta conversations booked |

## Validation before Phase 7

| Metric | Goal |
|--------|------|
| Beta users | 10 |
| Connected websites | 30+ |
| Completed scans | 200+ |
| Proposal approval rate | &gt;60% |
| Deployment success rate | &gt;95% |
| Weekly active users | 15+ |
| Paying customers | 3–5 |

## Do not build this month

Shopify, Webflow, GitHub PR deploy, Growth Brain, AI blog writer, SSO, K8s, Kafka.

## Engineering checklists

See [LIVE-SITE-GUIDE.md](./LIVE-SITE-GUIDE.md) for the full live-site / Site scan walkthrough.  
See [PLUGIN-INSTALL.md](./PLUGIN-INSTALL.md) for staging WP.  
Funnel events: `POST /analytics/events` (and authenticated audit logs).  
Waitlist: `POST /waitlist`.
