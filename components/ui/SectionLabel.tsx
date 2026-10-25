type Props = { children: React.ReactNode; className?: string; as?: "p" | "span" | "h2"; reveal?: boolean };

/** Small uppercase gold label with a leading hairline. */
export function SectionLabel({ children, className = "", as: Tag = "p", reveal = false }: Props) {
  return (
    <Tag data-reveal={reveal ? "" : undefined} className={`label flex items-center gap-3 text-gold ${className}`}>
      <span aria-hidden className="h-px w-8 bg-gold/60" />
      {children}
    </Tag>
  );
}
