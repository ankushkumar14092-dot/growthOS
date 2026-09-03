import { BrandText } from "@/components/BrandText";
import { BrandMark } from "./BrandMark";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/#start", label: "How to start" },
      { href: "/#demo", label: "Demo" },
      { href: "/pricing", label: "Pricing" },
      { href: "/compare", label: "Compare" },
    ],
  },
  {
    title: "Learn",
    links: [
      { href: "/ai-visibility", label: "AI visibility" },
      { href: "/seo-aeo-geo", label: "SEO · AEO · GEO" },
      { href: "/#faq", label: "FAQ" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/signup", label: "Start free" },
      { href: "/login", label: "Login" },
    ],
  },
] as const;

export function MarketingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="land-footer">
      <div className="land-footer-inner">
        <div className="land-footer-brand">
          <BrandMark variant="header" />
          <p className="land-footer-note">
            Approve before write. Verify after deploy. Built for SEO · AEO · GEO
            and AI visibility.
          </p>
        </div>

        {COLUMNS.map((col) => (
          <nav
            key={col.title}
            className="land-footer-col"
            aria-label={col.title}
          >
            <p className="land-footer-col-title">{col.title}</p>
            <ul className="land-footer-list">
              {col.links.map((link) => (
                <li key={link.href}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="land-footer-bottom">
        <span>
          © {year} <BrandText size="inherit" /> · grothos.in
        </span>
        <span>India · ₹ pricing</span>
      </div>
    </footer>
  );
}
