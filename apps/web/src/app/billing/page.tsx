"use client";

import { useCallback, useEffect, useState } from "react";
import { BrandText } from "@/components/BrandText";
import { AppShell } from "@/components/AppShell";
import { useWorkspace } from "@/lib/use-workspace";
import {
  apiBilling,
  apiBillingCheckout,
  apiBillingConfirmLink,
  apiBillingPortal,
  TOKEN_KEY,
  type BillingSummaryDto,
} from "@/lib/api";

export default function BillingPage() {
  const { me, org, orgId, userLabel, ready } = useWorkspace();
  const [billing, setBilling] = useState<BillingSummaryDto | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (token: string, organizationId: string) => {
    const bill = await apiBilling(token, organizationId);
    setBilling(bill);
  }, []);

  useEffect(() => {
    if (!ready || !orgId) return;
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    load(token, orgId).catch((err) => {
      setError(err instanceof Error ? err.message : "Could not load billing");
    });
  }, [ready, orgId, load]);

  useEffect(() => {
    if (!ready || !orgId || !me) return;
    const params = new URLSearchParams(window.location.search);
    const billingFlag = params.get("billing");
    if (
      billingFlag !== "paid" &&
      billingFlag !== "stub_activated" &&
      billingFlag !== "cancel_requested" &&
      billingFlag !== "awaiting_payment"
    ) {
      return;
    }

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    if (billingFlag === "stub_activated") {
      setNotice(`Plan activated (stub): ${params.get("plan") ?? "starter"}`);
      load(token, orgId).catch(() => undefined);
      window.history.replaceState({}, "", "/billing");
      return;
    }
    if (billingFlag === "cancel_requested") {
      setNotice("Cancellation requested at cycle end.");
      window.history.replaceState({}, "", "/billing");
      return;
    }
    if (billingFlag === "awaiting_payment") {
      setNotice("Complete payment in Razorpay to activate your plan.");
      window.history.replaceState({}, "", "/billing");
      return;
    }

    const plid =
      params.get("razorpay_payment_link_id") ||
      sessionStorage.getItem("rzp_payment_link_id");
    if (!plid) {
      setNotice("Returned from Razorpay — confirming payment…");
      window.history.replaceState({}, "", "/billing");
      return;
    }

    let cancelled = false;
    apiBillingConfirmLink(token, orgId, plid)
      .then(async (res) => {
        if (cancelled) return;
        sessionStorage.removeItem("rzp_payment_link_id");
        if (res.activated) {
          setNotice(`Plan activated: ${res.plan ?? "starter"}`);
          await load(token, orgId);
        } else {
          setNotice(
            `Payment status: ${res.status}. Refresh after Razorpay confirms.`,
          );
        }
        window.history.replaceState({}, "", "/billing");
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not confirm payment");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [ready, orgId, me, load]);

  async function checkout(plan: "starter" | "agency") {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token || !orgId) return;
    setBusy(`checkout-${plan}`);
    setError(null);
    setNotice(null);
    try {
      const res = await apiBillingCheckout(token, orgId, plan);
      if (res.paymentLinkId) {
        sessionStorage.setItem("rzp_payment_link_id", res.paymentLinkId);
      }
      window.location.href = res.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setBusy(null);
    }
  }

  async function managePortal() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token || !orgId) return;
    setBusy("portal");
    setError(null);
    setNotice(null);
    try {
      const res = await apiBillingPortal(token, orgId);
      window.location.href = res.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Manage billing failed");
      setBusy(null);
    }
  }

  if (!ready || !me) {
    return (
      <div style={{ padding: 32, color: "var(--color-text-muted)" }}>
        Loading billing…
      </div>
    );
  }

  return (
    <AppShell orgId={org?.id} orgName={org?.name} userLabel={userLabel}>
      <header style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600 }}>Billing</h1>
        <p
          style={{
            margin: "10px 0 0",
            fontSize: 15,
            lineHeight: 1.55,
            color: "var(--color-text-muted)",
            maxWidth: "48ch",
          }}
        >
          Manage your <BrandText /> plan, usage limits, and Razorpay upgrades.
        </p>
      </header>

      {error && (
        <div role="alert" className="app-alert">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}
      {notice && (
        <div role="status" className="app-alert app-alert--warn">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)}>
            Dismiss
          </button>
        </div>
      )}

      <section
        className="app-panel"
        style={{
          padding: 22,
          borderRadius: 12,
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          maxWidth: 640,
        }}
      >
        <h2 style={{ margin: "0 0 10px", fontSize: 17, fontWeight: 600 }}>
          Current plan
        </h2>
        <p style={{ margin: "0 0 16px", fontSize: 15, lineHeight: 1.5 }}>
          <strong>{billing?.planLabel ?? org?.plan ?? "free"}</strong>
          {billing ? ` · ${billing.priceLabel}` : ""}
          {billing && !billing.razorpayConfigured
            ? " · stub mode (no Razorpay keys)"
            : ""}
        </p>

        {billing ? (
          <div style={{ display: "grid", gap: 16 }}>
            <p style={{ margin: 0, fontSize: 14, color: "var(--color-text-muted)" }}>
              Sites {billing.usage.sites}/{billing.limits.sites} · Scans (30d){" "}
              {billing.usage.scansThisPeriod}/{billing.limits.scansPerMonth}
            </p>

            <div style={{ display: "grid", gap: 12 }}>
              {billing.plans.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    padding: "14px 16px",
                    borderRadius: 10,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-bg)",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{p.label}</div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--color-text-muted)",
                        marginTop: 4,
                      }}
                    >
                      {p.priceLabel} · {p.sites} sites · {p.scansPerMonth} scans/mo
                    </div>
                  </div>
                  {p.id === "free" ? (
                    <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                      {billing.plan === "free" ? "Current" : ""}
                    </span>
                  ) : (
                    <button
                      type="button"
                      style={primaryBtn}
                      disabled={Boolean(busy) || billing.plan === p.id}
                      onClick={() =>
                        checkout(p.id === "agency" ? "agency" : "starter")
                      }
                    >
                      {busy === `checkout-${p.id}`
                        ? "…"
                        : billing.plan === p.id
                          ? "Current"
                          : `Upgrade ${p.label}`}
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              style={secondaryBtn}
              disabled={Boolean(busy)}
              onClick={managePortal}
            >
              {busy === "portal" ? "…" : "Cancel subscription"}
            </button>

            {billing.razorpayConfigured && (
              <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)" }}>
                Test keys open a Razorpay Payment Link. For recurring subscriptions,
                enable Subscriptions in Razorpay and set plan IDs on the API.
              </p>
            )}
          </div>
        ) : (
          <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
            Loading plan details…
          </p>
        )}
      </section>
    </AppShell>
  );
}

const primaryBtn: React.CSSProperties = {
  height: 40,
  padding: "0 14px",
  borderRadius: 10,
  border: "none",
  background: "var(--color-primary)",
  color: "#fff",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const secondaryBtn: React.CSSProperties = {
  height: 44,
  padding: "0 18px",
  borderRadius: 10,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  fontWeight: 500,
  fontSize: 14,
  cursor: "pointer",
  color: "var(--color-text)",
  width: "fit-content",
};
