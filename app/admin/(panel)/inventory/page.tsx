import type { Metadata } from "next";
import { Flash, buttonClass, money } from "@/components/admin/ui";
import { products } from "@/data/products";
import { saveStock } from "@/lib/admin/actions";
import { requireAdmin } from "@/lib/admin/session";
import { getDb } from "@/lib/db";
import { getAvailability } from "@/lib/shop/orders";
import { toCents } from "@/lib/shop/config";

export const metadata: Metadata = { title: "Inventory" };

type Props = { searchParams: Promise<{ saved?: string; error?: string }> };

export default async function InventoryPage({ searchParams }: Props) {
  await requireAdmin();
  const { saved, error } = await searchParams;
  const availability = await getAvailability(await getDb());

  return (
    <>
      <h1 className="text-40">Inventory</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Stock is the number of pieces in the boutique and not yet sold. Pieces in an unpaid checkout are held for 30 minutes
        and shown separately.
      </p>
      <div className="mt-8">
        {saved && <Flash kind="ok" text="Stock saved." />}
        {error && <Flash kind="error" text="Stock must be a whole number from 0 to 9999." />}
      </div>

      <form action={saveStock}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-start">
            <caption className="sr-only">Stock per watch</caption>
            <thead>
              <tr className="hairline-b">
                {["Watch", "Price", "Stock", "Held in checkout", "Available"].map((h) => (
                  <th key={h} scope="col" className="label py-3 pe-4 text-start font-medium text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const a = availability[p.slug] ?? { stock: 0, held: 0, available: 0 };
                return (
                  <tr key={p.slug} className="hairline-b">
                    <th scope="row" className="py-3 pe-4 text-start font-normal">
                      {p.name} <span className="label tabular ms-2 text-muted">{p.ref}</span>
                    </th>
                    <td className="tabular py-3 pe-4 text-ivory/80">{money(toCents(p.priceUsd))}</td>
                    <td className="py-3 pe-4">
                      <label className="sr-only" htmlFor={`stock_${p.slug}`}>
                        Stock for {p.name}
                      </label>
                      <input
                        id={`stock_${p.slug}`}
                        name={`stock_${p.slug}`}
                        type="number"
                        min={0}
                        max={9999}
                        step={1}
                        required
                        defaultValue={a.stock}
                        className="tabular min-h-11 w-24 border border-gold/30 bg-bg px-3 text-ivory focus:border-gold focus:outline-none"
                      />
                    </td>
                    <td className="tabular py-3 pe-4 text-ivory/80">{a.held}</td>
                    <td className={`tabular py-3 pe-4 ${a.available === 0 ? "text-[#f2a7a0]" : "text-gold-light"}`}>
                      {a.available === 0 ? "Sold out" : a.available}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button className={`${buttonClass} mt-6`}>Save stock</button>
      </form>
    </>
  );
}
