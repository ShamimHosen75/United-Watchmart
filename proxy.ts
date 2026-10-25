import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Skip API routes, the admin area (English only), Next internals, Vercel internals and files
  matcher: "/((?!api|admin|_next|_vercel|.*\\..*).*)",
};
