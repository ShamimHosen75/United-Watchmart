import type { ComponentProps } from "react";
import { Link } from "@/i18n/navigation";

type Props = ComponentProps<typeof Link> & { variant?: "solid" | "outline" };

const base =
  "label inline-flex min-h-12 items-center justify-center gap-3 px-7 py-3 transition-colors duration-300";
const variants = {
  solid: "bg-ivory text-bg hover:bg-gold",
  outline: "border border-ivory/25 text-ivory hover:border-ivory hover:bg-ivory hover:text-bg",
};

export function ButtonLink({ variant = "solid", className = "", ...props }: Props) {
  return <Link data-magnetic className={`${base} ${variants[variant]} ${className}`} {...props} />;
}
