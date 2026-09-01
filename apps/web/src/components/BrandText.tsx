import { BRAND_NAME } from "@/lib/site";

type Props = {
  /** inherit = match surrounding text; sm/md/lg/hero/display = fixed scale */
  size?: "inherit" | "sm" | "md" | "lg" | "xl" | "hero" | "display";
  className?: string;
  /** Teal accent on "OS" — off for plain string contexts if needed */
  accent?: boolean;
};

export function BrandText({
  size = "inherit",
  className = "",
  accent = true,
}: Props) {
  const base = `brand-text brand-text--${size}${className ? ` ${className}` : ""}`;

  if (!accent) {
    return <span className={base}>{BRAND_NAME}</span>;
  }

  return (
    <span className={base}>
      <span className="brand-text-growth">growth</span>
      <span className="brand-text-os">OS</span>
    </span>
  );
}
