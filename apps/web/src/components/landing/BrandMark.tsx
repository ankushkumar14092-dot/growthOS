import Image from "next/image";
import { BRAND_NAME } from "@/lib/site";

type Props = {
  /** Compact nav size vs large hero lockup */
  variant?: "header" | "hero";
  /** Wrap in link to home — omit on hero when brand sits above the h1 */
  href?: string | null;
};

export function BrandMark({ variant = "header", href = "/" }: Props) {
  const isHero = variant === "hero";
  const iconSize = isHero ? 36 : 22;
  const markSize = isHero ? 64 : 36;

  const content = (
    <>
      <span
        className={`land-logo-mark${isHero ? " land-logo-mark--hero" : ""}`}
        style={isHero ? undefined : { width: markSize, height: markSize }}
        aria-hidden={isHero ? undefined : true}
      >
        <Image
          src="/icon-48.png"
          alt=""
          width={iconSize}
          height={iconSize}
          priority={isHero}
        />
      </span>
      <span className={isHero ? "land-brand-name" : "land-brand-name land-brand-name--header"}>
        {BRAND_NAME}
      </span>
    </>
  );

  const className = `land-brand-lockup${isHero ? " land-brand-lockup--hero" : " land-brand-lockup--header"}`;

  if (href) {
    return (
      <a href={href} className={`${className} land-brand-link`}>
        {content}
      </a>
    );
  }

  return <div className={className}>{content}</div>;
}