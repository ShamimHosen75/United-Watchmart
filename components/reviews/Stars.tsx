type Props = { rating: number; label: string; className?: string; size?: "sm" | "md" };

const STAR = "M10 1.6l2.47 5.3 5.8.68-4.28 3.97 1.13 5.73L10 14.4l-5.12 2.88 1.13-5.73L1.73 7.58l5.8-.68z";

/** Five gold stars; partial ratings fill the last star proportionally. */
export function Stars({ rating, label, className = "", size = "sm" }: Props) {
  const px = size === "md" ? "size-5" : "size-3.5";
  return (
    <span role="img" aria-label={label} className={`inline-flex items-center gap-0.5 ${className}`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, rating - i));
        return (
          <span key={i} aria-hidden className={`relative ${px}`}>
            <svg viewBox="0 0 20 20" className="absolute inset-0 size-full text-gold/25">
              <path d={STAR} fill="currentColor" />
            </svg>
            {fill > 0 && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <svg viewBox="0 0 20 20" className={`${px} text-gold`}>
                  <path d={STAR} fill="currentColor" />
                </svg>
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
