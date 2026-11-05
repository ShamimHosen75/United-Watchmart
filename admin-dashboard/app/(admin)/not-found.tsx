import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="py-24 text-center">
      <h1 className="font-serif text-3xl font-semibold">Not found</h1>
      <p className="mt-2 text-sm text-muted">That record does not exist or was removed.</p>
      <ButtonLink href="/dashboard" variant="secondary" className="mt-6">Back to dashboard</ButtonLink>
    </div>
  );
}
