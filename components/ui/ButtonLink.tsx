import type { ComponentProps } from "react";
import { Link } from "@/i18n/navigation";

type Props = ComponentProps<typeof Link> & { variant?: "solid" | "outline" };

const base =
  "label inline-flex min-h-12 items-center justify-center gap-3 px-7 py-3 transition-colors duration-300";
const variants = {
  solid: "bg-gold text-bg hover:bg-gold-light",
  outline: "border border-gold/50 text-ivory hover:border-gold hover:bg-gold/10",
};

export function ButtonLink({ variant = "solid", className = "", ...props }: Props) {
  return <Link data-magnetic className={`${base} ${variants[variant]} ${className}`} {...props} />;
}
