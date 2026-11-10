# United WatchMart

A clean white, gold-accented luxury watch website in English and Arabic (RTL). The home page takes a watch apart layer by layer as you scroll; the rest of the site covers the collection, each watch, how a watch is made, prices and private viewing requests.

Built with Next.js 16 (App Router), TypeScript, Tailwind CSS 4, GSAP (ScrollTrigger, SplitText, Flip) with Lenis, Three.js via React Three Fiber, next-intl, React Hook Form + Zod, Resend and Cloudflare Turnstile.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in what you have; see below
npm run dev
```

Open http://localhost:3000 (redirects to `/en`; Arabic is at `/ar`).

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / serve it |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm run db:generate` / `npm run db:migrate` | Create / apply database migrations (Drizzle) |
| `npm run admin:hash -- "passphrase"` | Print `ADMIN_PASSWORD_HASH` and `ADMIN_SESSION_SECRET` |

## Environment

All settings are listed in [`.env.example`](.env.example).

- **Viewing requests:** `RESEND_API_KEY`, `ENQUIRY_FROM_EMAIL`, `BOUTIQUE_EMAIL`, and Turnstile keys. Set `ENQUIRY_DRY_RUN=true` locally to log emails instead of sending them.
- **Database:** `DATABASE_URL` (Supabase Postgres in production). Leave it empty locally to use an embedded database stored in `.data/`.
- **Admin** (`/admin`): `ADMIN_PASSWORD_HASH` and `ADMIN_SESSION_SECRET`.
- **Online shop (optional):** cart and checkout stay hidden until `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set, together with `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.

## Content and assets

- Watches: [`data/products.ts`](data/products.ts) (Arabic copy in `data/products.ar.ts`); anatomy chapters: [`data/anatomy.ts`](data/anatomy.ts).
- Interface text: [`messages/en.json`](messages/en.json) and [`messages/ar.json`](messages/ar.json).
- The 3D watch is a placeholder built in code. To use a real model, add `public/models/hero.glb` (mesh names as in `data/hero.ts`) and set `heroModel.ready = true`. A frame sequence goes in `public/frames/hero/` with `heroFrames.count` set.
- Watch images are gradient placeholders until real photography is added.

## Deploying

Designed for Vercel. Set the environment variables in the project settings, run `npm run db:migrate` against the production database once, and redeploy after changing any `NEXT_PUBLIC_` variable.
