"use client";

import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="py-24 text-center">
      <h1 className="font-serif text-3xl font-semibold">Something went wrong</h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{error.message || "The page could not be loaded."}</p>
      <Button variant="secondary" className="mt-6" onClick={reset}>Try again</Button>
    </div>
  );
}
