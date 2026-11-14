import type { z } from "zod";

export interface FormState {
  error?: string;
  ok?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
}

export const formValues = (fd: FormData) =>
  Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string").map(([k, v]) => [k, String(v)]));

export function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) out[String(issue.path[0])] ??= issue.message;
  return out;
}

export const errorMessage = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);
