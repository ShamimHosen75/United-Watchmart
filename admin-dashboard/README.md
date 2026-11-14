# United WatchMart Admin

Back office for United WatchMart: watches, serialised inventory per branch, sales, customers, viewings, repairs and reports.
Built with Next.js 16 (App Router), TypeScript, Tailwind CSS 4 and Supabase (Postgres, Auth, Storage, row level security).

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

With no Supabase keys the app runs in **demo mode**: sign in with anything, data is sample data kept in memory and resets when the server restarts.

## Connect Supabase

1. Create a Supabase project.
2. In the SQL editor run, in order: `supabase/migrations/0001_core_schema.sql`, `0002_security.sql`, `0003_stock_audit.sql`, `0004_sales.sql`, `0005_supply.sql`, `0006_service.sql`, `0007_business.sql`, `0008_site_content.sql`, `0009_store_modules.sql`, then optionally `supabase/seed.sql` for sample data.
   (Or with the Supabase CLI: `supabase link` then `supabase db push`.)
3. Authentication → Sign In / Providers: keep Email on. Turn **off** "Allow new users to sign up" after you have created your own account, then invite staff from **Users** in the admin. In URL Configuration add your site address to the redirect URLs.
4. Copy `.env.example` to `.env.local` and fill in the project URL and publishable (anon) key from Project Settings → API.
5. `npm run dev`, sign up the first account in Supabase Auth: **the first account becomes the active owner**. People you invite from Users join with the role and branch you picked. Anyone else who signs up starts inactive until an owner or admin approves them.

## Optional settings (environment variables)

| Variable | What it turns on |
|---|---|
| `NEXT_PUBLIC_STORE_URL` | Address for the sidebar's "Back to store" link. Falls back to the website set in Settings → Store. |
| `NEXT_PUBLIC_CURRENCY` | Currency for every amount, e.g. `BDT`. Defaults to `USD`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Invite emails from Users, and new-viewing alerts. Server only, never `NEXT_PUBLIC_`. |
| `RESEND_API_KEY`, `RESEND_FROM` | Email campaigns and alerts through Resend, e.g. `United WatchMart <hello@yourdomain.com>`. |
| `ALLOWED_ORIGIN` | Your website's address, so its "Request a viewing" form and content requests are allowed. |
| `SITE_REVALIDATE_URL`, `SITE_REVALIDATE_SECRET` | Tells the website to refresh a page the moment it's published. See `docs/website-content.md`. |

Settings → Integrations shows which of these are set.

## Roles

| Role | Can do |
|---|---|
| owner, admin | everything, including branches, settings, staff and deletes |
| manager | plus catalogue, suppliers, purchasing, reports and marketing |
| sales, technician | day-to-day: stock moves, orders, customers, viewings, repairs |

Rules are enforced in the database (`0002_security.sql`), not only in the UI.

## Structure

```
app/(admin)/        every admin screen (one folder per sidebar item; settings has a sub-page per tab)
app/print/          printable invoice and repair ticket
app/api/            public viewing-request endpoint and CSV report export
app/login           staff sign in
lib/data/           all data access; switches between Supabase and demo store
lib/demo-data.ts    sample data (also generates supabase/seed.sql: npm run seed:generate)
supabase/           migrations and seed
proxy.ts            refreshes the Supabase session and protects every page
```

## Website content

**Website → Pages** edits the text and images of each page of the public site, in English and Arabic, as a draft.
**Publish** puts it live; every publish is kept and can be rolled back. **Website → Media** holds uploaded images
(Supabase Storage bucket `site-media`). The website reads published content from `/api/public/content/<page>`;
see `docs/website-content.md` for the code to add to the website.

## Phases

1. **Foundation** (done): schema and security, sign in, admin shell, dashboard, watches catalogue, inventory by serial with history.
2. **Sales and clients** (done): point of sale by serial with split payments and deposits, orders with refunds, printable invoice with warranty cards, customers, viewing requests with watch holds, warranties.
3. **Supply** (done): suppliers, purchase orders (draft, ordered, part received, received), receiving by serial with landed cost (shipping spread by cost), transfers between branches with an in-transit state.
4. **Workshop** (done): repair board and list with overdue flags, intake with warranty check by serial, status steps from diagnosis to client approval to hand-back, costs and payment at collection, notes and history, WhatsApp and email messages to the client, printable repair ticket with workshop tag.
5. **Business** (done): reports (sales and margin by branch, staff, brand, collection and channel; stock value and age; workshop) with CSV export, branches, users with invites and approval, settings for account, store and invoice, catalogue, notifications, marketing campaigns by email or WhatsApp, and integrations.
6. **Website content** (done): page editor for every page of the public site (sections in English and Arabic, reorder, show or hide, search and sharing fields), media library with uploads, draft, preview, publish and roll back, and a public content API with instant refresh on publish.

7. **Store modules** (done): sidebar regrouped into Store, Storefront, Sales & delivery, Clients & service, Supply and Business. New: watch brands (with a brand filter and column on Watches), categories, checkout leads (abandoned checkouts to follow up), risk review for remote orders, home slider, review moderation (same `reviews` table the website reads), wrist try-on set-up per watch, coupons, shipping zones and shipping methods. Dashboard shows active, draft, low-stock and sold-out watches and all-time orders. Simple modules are described in `lib/resources.ts` and share one list, form and data layer (`app/(admin)/[resource]`, `lib/data/resources.ts`).

## Website viewing requests

The public site posts JSON to `POST /api/public/viewing-requests`:

```json
{ "name": "Jane Doe", "email": "jane@example.com", "phone": "+880…", "product_slug": "heritage-42", "preferred_at": "2026-11-10T15:00:00+06:00", "message": "…" }
```

Set `ALLOWED_ORIGIN` (for example `https://unitedwatchmart.com`) so browsers on the website may call it. Requests appear under Viewings → To confirm.
