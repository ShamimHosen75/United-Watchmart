import "./globals.css";
import Link from "next/link";
import { fontVariables } from "@/lib/fonts";

// Fallback 404 for anything the proxy does not route into app/[locale].
export default function RootNotFound() {
  return (
    <html lang="en" className={fontVariables}>
      <body className="grid min-h-svh place-items-center px-6 text-center">
        <main>
          <p className="label text-gold">404</p>
          <h1 className="mt-4 text-64">This page has stopped.</h1>
          <Link href="/" className="label mt-10 inline-block text-gold hover:text-gold-light">
            Back to home
          </Link>
        </main>
      </body>
    </html>
  );
}
