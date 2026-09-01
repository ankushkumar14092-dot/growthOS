import Image from "next/image";
import { BrandText } from "@/components/BrandText";

type Props = {
  /** Compact nav · hero eyebrow · larger hero lockup */
  variant?: "header" | "hero";
  /** Wrap in link to home — omit on hero when brand sits in the h1 */
  href?: string | null;
};

export function BrandMark({ variant = "header", href = "/" }: Props) {
  const isHero = variant === "hero";
  const iconSize = isHero ? 28 : 24;

  const content = (
    <>
      <span
        className={`land-logo-mark${isHero ? " land-logo-mark--hero" : ""}`}
        aria-hidden
      >
        <Image
          src="/icon-48.png"
          alt=""
          width={iconSize}
          height={iconSize}
          priority={isHero}
        />
      </span>
      <BrandText size={isHero ? "xl" : "md"} />
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
