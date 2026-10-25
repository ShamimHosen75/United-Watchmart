import { notFound } from "next/navigation";

// Any unknown path under /en or /ar renders the localized 404.
export default function CatchAll() {
  notFound();
}
