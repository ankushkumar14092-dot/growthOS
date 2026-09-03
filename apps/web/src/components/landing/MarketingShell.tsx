import { BrandText } from "@/components/BrandText";
import { BrandMark } from "./BrandMark";
import { VisitorTracker } from "./VisitorTracker";

export function MarketingShell({
  path,
  children,
}: {
  path: string;
  children: React.ReactNode;
}) {
  return (
    <main className="land-page">
      <VisitorTracker path={path} />
      <header className="land-header">
        <div className="land-top">
          <BrandMark variant="header" />
          <nav className="land-nav">
            <a href="/#how">Product</a>
            <a href="/pricing">Pricing</a>
            <a href="/seo-aeo-geo">SEO · AEO · GEO</a>
            <a className="land-nav-login" href="/login">
              Login
            </a>
          </nav>
        </div>
      </header>
      {children}
      <footer className="land-footer">
        <BrandMark variant="header" />
        <nav style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <a href="/#how">Product</a>
          <a href="/pricing">Pricing</a>
          <a href="/seo-aeo-geo">SEO · AEO · GEO</a>
          <a href="/#faq">FAQ</a>
          <a href="/signup">Signup</a>
          <a href="/login">Login</a>
          <a href="/llms.txt">llms.txt</a>
          <a href="/sitemap.xml">Sitemap</a>
        </nav>
        <span className="land-footer-note">
          <BrandText /> private beta · Multi-connect scan · Multi-mode deploy
        </span>
      </footer>
    </main>
  );
}
