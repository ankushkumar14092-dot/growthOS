"use client";

import { FormEvent, useState } from "react";
import { joinWaitlist } from "@/lib/analytics";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onWaitlist(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await joinWaitlist({ email, name, company, role: "beta" });
      setMsg(res.message);
      setEmail("");
      setName("");
      setCompany("");
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Could not join waitlist");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="land-form" onSubmit={onWaitlist}>
      <input
        required
        type="email"
        placeholder="Work email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-label="Work email"
      />
      <input
        placeholder="Name (optional)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-label="Name"
      />
      <input
        placeholder="Company (optional)"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        aria-label="Company"
      />
      {err && (
        <p style={{ margin: 0, color: "var(--color-error)", fontSize: 13 }}>
          {err}
        </p>
      )}
      {msg && (
        <p style={{ margin: 0, color: "var(--color-success)", fontSize: 13 }}>
          {msg}
        </p>
      )}
      <button className="land-btn-primary" type="submit" disabled={busy}>
        {busy ? "Submitting…" : "Request beta access"}
      </button>
    </form>
  );
}
