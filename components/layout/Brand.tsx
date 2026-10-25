import { Link } from "@/i18n/navigation";

type Props = { className?: string; onClick?: () => void };

const wordmarkClass = "inline-flex items-baseline gap-2 font-brand leading-none tracking-[0.04em] text-ivory";

/** The Latin wordmark as plain text (used in overlays). */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span dir="ltr" className={`${wordmarkClass} ${className}`}>
      <span>United</span>{" "}
      <span className="text-gold">WatchMart</span>
    </span>
  );
}

/** The wordmark as a home link (its visible text is its accessible name). Brand font in both languages. */
export function Brand({ className = "", onClick }: Props) {
  return (
    <Link
      href="/"
      onClick={onClick}
      dir="ltr"
      className={`${wordmarkClass} text-[1.5rem] ${className}`}
    >
      <span>United</span>{" "}
      <span className="text-gold">WatchMart</span>
    </Link>
  );
}
