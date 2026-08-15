export type ExtractedImage = {
  src: string;
  alt: string | null;
};

export type ExtractedLink = {
  href: string;
  internal: boolean;
};

export type PageExtracted = {
  title: string | null;
  metaDescription: string | null;
  metaRobots: string | null;
  canonical: string | null;
  h1: string[];
  h2: string[];
  h3: string[];
  og: Record<string, string>;
  jsonLd: unknown[];
  images: ExtractedImage[];
  links: ExtractedLink[];
  scriptCount: number;
  stylesheetCount: number;
  textLength: number;
  hasViewport?: boolean;
  contentType?: string;
  headers?: Record<string, string>;
  bytes?: number;
  ttfbMs?: number;
  source?: "http" | "zip" | "github";
};

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function attr(tag: string, name: string): string | null {
  const re = new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i");
  const m = tag.match(re);
  return m ? decodeEntities(m[1]) : null;
}

export function extractFromHtml(
  html: string,
  pageUrl: string,
): PageExtracted {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decodeEntities(titleMatch[1].trim()) : null;

  let metaDescription: string | null = null;
  let metaRobots: string | null = null;
  const metaRe = /<meta\b[^>]*>/gi;
  let metaTag: RegExpExecArray | null;
  while ((metaTag = metaRe.exec(html))) {
    const tag = metaTag[0];
    const name = (attr(tag, "name") || attr(tag, "property") || "").toLowerCase();
    const content = attr(tag, "content");
    if (!content) continue;
    if (name === "description") metaDescription = content;
    if (name === "robots") metaRobots = content;
  }

  let canonical: string | null = null;
  const linkRe = /<link\b[^>]*>/gi;
  let linkTag: RegExpExecArray | null;
  while ((linkTag = linkRe.exec(html))) {
    const tag = linkTag[0];
    const rel = (attr(tag, "rel") || "").toLowerCase();
    if (rel.includes("canonical")) {
      canonical = attr(tag, "href");
    }
  }

  const headings = (level: number) => {
    const re = new RegExp(`<h${level}\\b[^>]*>([\\s\\S]*?)<\\/h${level}>`, "gi");
    const out: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(html))) {
      out.push(decodeEntities(m[1].replace(/<[^>]+>/g, "").trim()));
    }
    return out;
  };

  const og: Record<string, string> = {};
  const ogRe = /<meta\b[^>]*>/gi;
  let ogTag: RegExpExecArray | null;
  while ((ogTag = ogRe.exec(html))) {
    const tag = ogTag[0];
    const prop = (attr(tag, "property") || "").toLowerCase();
    const content = attr(tag, "content");
    if (prop.startsWith("og:") && content) og[prop] = content;
  }

  const jsonLd: unknown[] = [];
  const ldRe =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let ld: RegExpExecArray | null;
  while ((ld = ldRe.exec(html))) {
    try {
      jsonLd.push(JSON.parse(ld[1]));
    } catch {
      /* ignore invalid json-ld */
    }
  }

  const images: ExtractedImage[] = [];
  const imgRe = /<img\b[^>]*>/gi;
  let img: RegExpExecArray | null;
  while ((img = imgRe.exec(html))) {
    const tag = img[0];
    const src = attr(tag, "src");
    if (!src) continue;
    images.push({ src, alt: attr(tag, "alt") });
  }

  let baseHost = "";
  try {
    baseHost = new URL(pageUrl).host;
  } catch {
    baseHost = "";
  }

  const links: ExtractedLink[] = [];
  const aRe = /<a\b[^>]*>/gi;
  let a: RegExpExecArray | null;
  while ((a = aRe.exec(html))) {
    const href = attr(a[0], "href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
      continue;
    }
    let internal = false;
    try {
      const abs = new URL(href, pageUrl);
      internal = abs.host === baseHost;
      links.push({ href: abs.toString(), internal });
    } catch {
      links.push({ href, internal: href.startsWith("/") });
    }
  }

  const scriptCount = (html.match(/<script\b/gi) || []).length;
  const stylesheetCount = (html.match(/rel=["']stylesheet["']/gi) || []).length;
  const hasViewport = /<meta\b[^>]*name=["']viewport["'][^>]*>/i.test(html);
  const textOnly = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    title,
    metaDescription,
    metaRobots,
    canonical,
    h1: headings(1),
    h2: headings(2),
    h3: headings(3),
    og,
    jsonLd,
    images,
    links,
    scriptCount,
    stylesheetCount,
    textLength: textOnly.length,
    hasViewport,
  };
}
