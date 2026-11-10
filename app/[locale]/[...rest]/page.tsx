import { notFound } from "next/navigation";

// Any unknown page path renders the site's 404.
export default function CatchAll() {
  notFound();
}
