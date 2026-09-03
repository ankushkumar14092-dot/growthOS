import Image from "next/image";
import { BrandText } from "@/components/BrandText";

type Props = {
  variant?: "header" | "hero";
  href?: string | null;
};

/** Original GrowthOS mark in a circular badge. */
export function BrandMark({ variant = "header", href = "/" }: Props) {
  const isHero = variant === "hero";

  const content = (
    <>
      <span
        className={`land-logo-mark${isHero ? " land-logo-mark--hero" : ""}`}
      >
        <Image
          src="/logo-mark.png"
          alt="GrowthOS logo"
          width={466}
          height={338}
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
