"use client";

import { CURRENCY } from "@/lib/format";
import { useActionState, useState } from "react";
import { saveProductAction, type ProductFormState } from "@/app/(admin)/watches/actions";
import { Card, CardHeader } from "@/components/ui/card";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button, ButtonLink } from "@/components/ui/button";
import type { Brand, Collection, Product } from "@/lib/types";
import { money } from "@/lib/format";

const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function ProductForm({ product, brands, collections, defaultWarranty = 24 }: { product?: Product; brands: Brand[]; collections: Collection[]; defaultWarranty?: number }) {
  const action = saveProductAction.bind(null, product?.id ?? null);
  const [state, formAction, pending] = useActionState<ProductFormState, FormData>(action, {});
  const v = (key: keyof Product) => state.values?.[key] ?? (product?.[key] == null ? "" : String(product[key]));
  const err = (key: string) => state.fieldErrors?.[key];

  const [slug, setSlug] = useState(v("slug"));
  const [slugTouched, setSlugTouched] = useState(Boolean(product));
  const [cost, setCost] = useState(v("cost_price"));
  const [price, setPrice] = useState(v("price"));
  const margin = Number(price) > 0 ? ((Number(price) - Number(cost)) / Number(price)) * 100 : null;

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-3 [&>*]:min-w-0">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader title="Model" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Name" error={err("name")} className="sm:col-span-2">
              <Input name="name" required defaultValue={v("name")} onChange={(e) => !slugTouched && setSlug(slugify(e.target.value))} />
            </Field>
            <Field label="Reference number" hint="Manufacturer reference, e.g. UW-H42-NV" error={err("ref_number")}>
              <Input name="ref_number" required defaultValue={v("ref_number")} />
            </Field>
            <Field label="SKU" error={err("sku")}>
              <Input name="sku" required defaultValue={v("sku")} />
            </Field>
            <Field label="Website slug" hint="Used in the website address /watch/slug" error={err("slug")}>
              <Input name="slug" required value={slug} onChange={(e) => { setSlugTouched(true); setSlug(e.target.value); }} />
            </Field>
            <Field label="Gender" error={err("gender")}>
              <Select name="gender" defaultValue={v("gender")}>
                <option value="">Not set</option>
                <option value="men">Men</option>
                <option value="women">Women</option>
                <option value="unisex">Unisex</option>
              </Select>
            </Field>
            <Field label="Brand">
              <Select name="brand_id" defaultValue={v("brand_id")}>
                <option value="">None</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </Field>
            <Field label="Category">
              <Select name="collection_id" defaultValue={v("collection_id")}>
                <option value="">None</option>
                {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Tagline" className="sm:col-span-2">
              <Input name="tagline" defaultValue={v("tagline")} />
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <Textarea name="description" rows={4} defaultValue={v("description")} />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Specifications" />
          <div className="grid gap-4 p-5 sm:grid-cols-3">
            <Field label="Case size (mm)" error={err("case_mm")}><Input name="case_mm" inputMode="decimal" defaultValue={v("case_mm")} /></Field>
            <Field label="Case material"><Input name="case_material" defaultValue={v("case_material")} /></Field>
            <Field label="Bezel"><Input name="bezel" defaultValue={v("bezel")} /></Field>
            <Field label="Dial"><Input name="dial" defaultValue={v("dial")} /></Field>
            <Field label="Movement">
              <Select name="movement" defaultValue={v("movement")}>
                <option value="">Not set</option>
                <option value="automatic">Automatic</option>
                <option value="manual">Manual wind</option>
                <option value="quartz">Quartz</option>
                <option value="solar">Solar</option>
                <option value="spring_drive">Spring Drive</option>
              </Select>
            </Field>
            <Field label="Calibre"><Input name="calibre" defaultValue={v("calibre")} /></Field>
            <Field label="Power reserve (h)" error={err("power_reserve_h")}><Input name="power_reserve_h" inputMode="numeric" defaultValue={v("power_reserve_h")} /></Field>
            <Field label="Water resistance (m)" error={err("water_resistance_m")}><Input name="water_resistance_m" inputMode="numeric" defaultValue={v("water_resistance_m")} /></Field>
            <Field label="Strap">
              <Select name="strap" defaultValue={v("strap")}>
                <option value="">Not set</option>
                <option value="bracelet">Bracelet</option>
                <option value="leather">Leather</option>
                <option value="rubber">Rubber</option>
                <option value="fabric">Fabric</option>
                <option value="other">Other</option>
              </Select>
            </Field>
            <Field label="Strap detail" className="sm:col-span-3"><Input name="strap_detail" defaultValue={v("strap_detail")} /></Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Images" subtitle="One image URL per line. Uploading to Supabase Storage comes with the media library." />
          <div className="p-5">
            <Textarea name="images" rows={3} defaultValue={state.values?.images ?? product?.images.join("\n") ?? ""} placeholder="https://…" />
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader title="Status" />
          <div className="space-y-4 p-5">
            <Field label="Status">
              <Select name="status" defaultValue={v("status") || "draft"}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </Select>
            </Field>
            <Checkbox name="is_published" label="Show on the website" defaultChecked={state.values ? state.values.is_published === "on" : product?.is_published ?? false} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Pricing" />
          <div className="space-y-4 p-5">
            <Field label={`Selling price (${CURRENCY})`} error={err("price")}>
              <Input name="price" inputMode="decimal" required value={price} onChange={(e) => setPrice(e.target.value)} />
            </Field>
            <Field label="Compare-at price" hint="Optional, shown as the old price" error={err("compare_at_price")}>
              <Input name="compare_at_price" inputMode="decimal" defaultValue={v("compare_at_price")} />
            </Field>
            <Field label="Default cost price" error={err("cost_price")}>
              <Input name="cost_price" inputMode="decimal" required value={cost} onChange={(e) => setCost(e.target.value)} />
            </Field>
            <p className="rounded-lg bg-surface-2 px-3 py-2 text-xs text-muted">
              Margin: {margin === null ? "—" : `${margin.toFixed(1)}% (${money(Number(price) - Number(cost))} per watch)`}
            </p>
            <Field label="Warranty (months)" error={err("warranty_months")}>
              <Input name="warranty_months" inputMode="numeric" required defaultValue={v("warranty_months") || String(defaultWarranty)} />
            </Field>
          </div>
        </Card>

        {state.error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={pending} className="flex-1">{pending ? "Saving…" : product ? "Save changes" : "Create watch"}</Button>
          <ButtonLink href={product ? `/watches/${product.id}` : "/watches"} variant="secondary">Cancel</ButtonLink>
        </div>
      </div>
    </form>
  );
}
