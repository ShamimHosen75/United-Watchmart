"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export function LoginForm({ next, demo }: { next: string; demo: boolean }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <Field label="Email">
        <Input name="email" type="email" autoComplete="email" required defaultValue={state.email ?? (demo ? "owner@unitedwatchmart.test" : "")} />
      </Field>
      <Field label="Password">
        <Input name="password" type="password" autoComplete="current-password" required minLength={6} defaultValue={demo ? "demo1234" : undefined} />
      </Field>
      {state.error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
      <Button type="submit" className="h-10 w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
