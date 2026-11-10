import type { Watch } from "@/data/products";
import { Link } from "@/i18n/navigation";
import { formatPrice } from "@/lib/format";
import { WatchVisual } from "./WatchVisual";

type Props = { watch: Watch; className?: string; headingLevel?: "h2" | "h3" };

export function WatchCard({ watch, className = "", headingLevel: Heading = "h3" }: Props) {
  return (
    <Link
      href={`/watch/${watch.slug}`}
      className={`group block focus-visible:outline-offset-4 ${className}`}
      data-strap={watch.strap}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-surface">
        <div className="absolute inset-0 transition-transform duration-700 ease-out-expo group-hover:scale-105">
          <WatchVisual slug={watch.slug} label={watch.name} className="absolute inset-0 size-full" />
          <WatchVisual
            slug={watch.slug}
            label=""
            angle="hover"
            decorative
            className="absolute inset-0 size-full opacity-0 transition-opacity duration-700 group-hover:opacity-100 group-focus-visible:opacity-100"
          />
        </div>
      </div>
      <div className="mt-5 flex items-start justify-between gap-4">
        <div>
          <Heading className="text-28 text-ivory">{watch.name}</Heading>
          <p className="label mt-1 text-muted tabular">{watch.ref}</p>
        </div>
        <p className="tabular pt-1 text-20 text-ivory">{formatPrice(watch.priceUsd)}</p>
      </div>
      <span
        aria-hidden
        className="mt-4 block h-px origin-[0%_50%] scale-x-[0.15] bg-gold transition-transform duration-500 ease-out-expo group-hover:scale-x-100 group-focus-visible:scale-x-100"
      />
    </Link>
  );
}
