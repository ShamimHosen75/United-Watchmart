import { products } from "@/data/products";
import type { DB } from "./index";
import { inventory } from "./schema";

/** Starting stock for watches that have no inventory row yet. Change real numbers in /admin/inventory. */
const initialStock: Record<string, number> = {
  "heritage-42": 4,
  "octane-gt": 3,
  "midnight-chrono": 3,
  aurelian: 2,
  verdant: 2,
  "tachy-skeleton": 2,
  "onyx-skeleton": 1,
  "maestro-tourbillon": 1,
  "blue-tourbillon": 1,
};

/** Adds a row for every product that is missing one. Never overwrites existing stock. */
export async function seedInventory(db: DB) {
  await db
    .insert(inventory)
    .values(products.map((p) => ({ slug: p.slug, stock: initialStock[p.slug] ?? 1 })))
    .onConflictDoNothing({ target: inventory.slug });
}
