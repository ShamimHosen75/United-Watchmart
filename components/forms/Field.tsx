import type { ReactNode } from "react";

type Props = {
  id: string;
  label: string;
  error?: string;
  className?: string;
  children: (a11y: { id: string; "aria-invalid": boolean; "aria-describedby"?: string }) => ReactNode;
};

/** Label, control and inline error, wired together for screen readers. */
export function Field({ id, label, error, className = "", children }: Props) {
  const errorId = `${id}-error`;
  return (
    <div className={className}>
      <label htmlFor={id} className="label block text-muted">
        {label}
      </label>
      {children({ id, "aria-invalid": Boolean(error), "aria-describedby": error ? errorId : undefined })}
      {error && (
        <p id={errorId} className="mt-2 text-14 text-[#f2a7a0]">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputClass =
  "mt-2 block min-h-12 w-full border-0 border-b border-gold/35 bg-transparent px-0 py-2 text-ivory placeholder:text-muted/60 transition-colors focus:border-gold focus:outline-none focus-visible:outline-none aria-[invalid=true]:border-[#f2a7a0]";
