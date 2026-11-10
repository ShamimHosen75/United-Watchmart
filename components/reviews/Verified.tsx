/** Small "Verified purchase" mark with a check. */
export function Verified({ label }: { label: string }) {
  return (
    <span className="label inline-flex items-center gap-1.5 text-muted">
      <svg aria-hidden viewBox="0 0 16 16" className="size-3.5 text-gold">
        <circle cx="8" cy="8" r="7.25" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <path d="M5 8.2l2 2 4-4.4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </span>
  );
}
