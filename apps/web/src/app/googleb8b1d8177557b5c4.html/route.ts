import { NextResponse } from "next/server";

/** Exact Google Search Console HTML-file verification body. */
const BODY = "google-site-verification: googleb8b1d8177557b5c4.html";

export function GET() {
  return new NextResponse(BODY, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=UTF-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
