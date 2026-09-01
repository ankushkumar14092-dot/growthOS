"use server";

import { redirect } from "next/navigation";

function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}

export async function submitBetaWaitlist(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();

  if (!email) {
    redirect("/?beta=error#beta");
  }

  try {
    const res = await fetch(`${getApiUrl()}/waitlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, company, role: "beta" }),
    });
    if (!res.ok) {
      redirect("/?beta=error#beta");
    }
    redirect("/?beta=ok#beta");
  } catch {
    redirect("/?beta=error#beta");
  }
}
