/** Reads a single string from Next.js searchParams. */
export const param = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
