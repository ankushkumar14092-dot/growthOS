export type RobotsRules = {
  fetched: boolean;
  disallow: string[];
  raw?: string;
};

export function parseRobotsTxt(text: string): RobotsRules {
  const disallow: string[] = [];
  let inStar = false;
  for (const lineRaw of text.split(/\r?\n/)) {
    const line = lineRaw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const [key, ...rest] = line.split(":");
    const value = rest.join(":").trim();
    const k = key.toLowerCase();
    if (k === "user-agent") {
      inStar = value === "*";
    } else if (k === "disallow" && inStar) {
      if (value) disallow.push(value);
    }
  }
  return { fetched: true, disallow };
}

export function isDisallowed(pathname: string, rules: RobotsRules): boolean {
  if (!rules.fetched) return false;
  for (const rule of rules.disallow) {
    if (rule === "/") return true;
    if (pathname.startsWith(rule)) return true;
  }
  return false;
}

export function parseSitemapUrls(xml: string, cap = 50): string[] {
  const urls: string[] = [];
  const locRe = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = locRe.exec(xml)) && urls.length < cap) {
    urls.push(m[1].trim());
  }
  return urls;
}
