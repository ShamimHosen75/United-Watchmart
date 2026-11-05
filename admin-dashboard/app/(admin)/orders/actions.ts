"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/data";
import { addPayment, createSale, refundOrder } from "@/lib/data/sales";
import { errorMessage, type FormState } from "@/lib/form";

const methods = ["cash", "card", "bank_transfer", "mobile_banking", "stripe", "trade_in", "other"] as const;
const money = z.coerce.number().min(0).max(10_000_000);

const saleSchema = z.object({
  branch_id: z.string().min(1, "Pick a branch."),
  customer_id: z.string().nullable(),
  new_customer: z.object({ full_name: z.string().trim(), phone: z.string().trim(), email: z.union([z.literal(""), z.email("Client email is not valid.")]) }).nullable(),
  channel: z.enum(["store", "online", "phone", "whatsapp"]),
  order_discount: money,
  notes: z.string().max(2000),
  items: z.array(z.object({ stock_item_id: z.string().min(1), unit_price: money, discount: money })).min(1, "Add at least one watch."),
  payments: z.array(z.object({ method: z.enum(methods), amount: money, reference: z.string().max(200) })),
});

export async function createSaleAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await getCurrentUser())) return { error: "Please sign in again." };
  let json: unknown;
  try {
    json = JSON.parse(String(formData.get("sale") ?? ""));
  } catch {
    return { error: "Could not read the sale. Please try again." };
  }
  const parsed = saleSchema.safeParse(json);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  let id: string;
  try {
    id = await createSale(parsed.data);
  } catch (e) {
    return { error: errorMessage(e, "Could not complete the sale.") };
  }
  for (const p of ["/orders", "/inventory", "/dashboard", "/customers", "/warranties", "/viewings", "/watches"]) revalidatePath(p);
  redirect(`/orders/${id}?new=1`);
}

const paymentSchema = z.object({ method: z.enum(methods), amount: z.coerce.number().positive("Enter an amount."), reference: z.string().trim().max(200) });

export async function addPaymentAction(orderId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await getCurrentUser())) return { error: "Please sign in again." };
  const parsed = paymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    await addPayment(orderId, parsed.data.method, parsed.data.amount, parsed.data.reference);
  } catch (e) {
    return { error: errorMessage(e, "Could not record the payment.") };
  }
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  revalidatePath("/dashboard");
  return { ok: "Payment recorded." };
}

export async function refundOrderAction(orderId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user || !["owner", "admin", "manager"].includes(user.role)) return { error: "Only a manager can refund or cancel." };
  if (formData.get("confirm") !== "on") return { error: "Tick the box to confirm." };
  try {
    await refundOrder(orderId, String(formData.get("reason") ?? "").trim());
  } catch (e) {
    return { error: errorMessage(e, "Could not refund the order.") };
  }
  for (const p of [`/orders/${orderId}`, "/orders", "/inventory", "/dashboard", "/warranties"]) revalidatePath(p);
  return { ok: "Done. The watches are back in stock and their warranties are void." };
}
