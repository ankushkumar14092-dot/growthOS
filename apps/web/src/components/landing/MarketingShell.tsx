import { BrandMark } from "./BrandMark";
import { MarketingFooter } from "./MarketingFooter";
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
            <a href="/#start">Product</a>
            <a href="/#demo">Demo</a>
            <a href="/ai-visibility">AI visibility</a>
            <a href="/pricing">Pricing</a>
            <a href="/compare">Compare</a>
            <a className="land-nav-login" href="/signup">
              Start free
            </a>
          </nav>
        </div>
      </header>
      {children}
      <MarketingFooter />
    </main>
  );
}
