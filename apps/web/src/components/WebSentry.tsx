"use client";

import { useEffect } from "react";
import { initWebSentry } from "@/lib/sentry";

export function WebSentry() {
  useEffect(() => {
    void initWebSentry();
  }, []);
  return null;
}
