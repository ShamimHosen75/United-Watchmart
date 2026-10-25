"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { products } from "@/data/products";
import { getDb } from "@/lib/db";
import { clientIp, loginLimiter } from "@/lib/rate-limit";
import { sendOrderEmails, sendShippedEmail } from "@/lib/shop/emails";
import {
  addNote,
  cancelPendingOrder,
  getOrder,
  markDelivered,
  markRefunded,
  markShipped,
  setStock,
} from "@/lib/shop/orders";
import { cancelIntents, getStripe } from "@/lib/stripe/server";
import { verifyPassword } from "./password";
import { adminConfigured, createSession, destroySession, requireAdmin } from "./session";

// ------------------------------------------------------------------ session

export async function login(formData: FormData) {
  if (!adminConfigured()) redirect("/admin/login?error=config");
  if (!loginLimiter(clientIp(await headers()))) redirect("/admin/login?error=rate");
  const password = String(formData.get("password") ?? "");
  const ok = password.length > 0 && (await verifyPassword(password, process.env.ADMIN_PASSWORD_HASH!));
  if (!ok) redirect("/admin/login?error=invalid");
  await createSession();
  redirect("/admin");
}

export async function logout() {
  await destroySession();
  redirect("/admin/login");
}

// ------------------------------------------------------------------ orders

const idSchema = z.string().uuid();
const orderPath = (id: string) => `/admin/orders/${id}`;

function done(id: string, flash: string): never {
  revalidatePath("/admin");
  redirect(`${orderPath(id)}?done=${flash}`);
}

export async function shipOrder(formData: FormData) {
  await requireAdmin();
  const input = z
    .object({ id: idSchema, carrier: z.string().trim().min(2).max(60), tracking: z.string().trim().min(3).max(80) })
    .safeParse({ id: formData.get("id"), carrier: formData.get("carrier"), tracking: formData.get("tracking") });
  if (!input.success) redirect(`${orderPath(String(formData.get("id")))}?error=ship`);
  const db = await getDb();
  const order = await markShipped(db, input.data.id, input.data.carrier, input.data.tracking);
  if (!order) redirect(`${orderPath(input.data.id)}?error=state`);
  try {
    await sendShippedEmail(order);
  } catch (err) {
    console.error("[admin] shipped email failed", err);
    await addNote(db, order.id, "Shipping email could not be sent.");
  }
  done(order.id, "shipped");
}

export async function deliverOrder(formData: FormData) {
  await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  const order = await markDelivered(await getDb(), id);
  if (!order) redirect(`${orderPath(id)}?error=state`);
  done(id, "delivered");
}

export async function cancelOrder(formData: FormData) {
  await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  const db = await getDb();
  const found = await getOrder(db, id);
  if (!found) redirect("/admin");
  const order = await cancelPendingOrder(db, { ref: found.order.ref }, "Canceled by the boutique.");
  if (!order) redirect(`${orderPath(id)}?error=state`);
  if (order.paymentIntentId) await cancelIntents([order.paymentIntentId]);
  done(id, "canceled");
}

export async function refundOrder(formData: FormData) {
  await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  if (formData.get("confirm") !== "yes") redirect(`${orderPath(id)}?error=confirm`);
  const restock = formData.get("restock") === "yes";
  const db = await getDb();
  const found = await getOrder(db, id);
  if (!found?.order.paymentIntentId || !["paid", "shipped", "delivered"].includes(found.order.status)) {
    redirect(`${orderPath(id)}?error=state`);
  }
  const stripe = getStripe();
  if (!stripe) redirect(`${orderPath(id)}?error=stripe`);
  try {
    await stripe.refunds.create(
      { payment_intent: found.order.paymentIntentId, reason: "requested_by_customer" },
      { idempotencyKey: `refund-${id}` },
    );
  } catch (err) {
    console.error("[admin] refund failed", err);
    redirect(`${orderPath(id)}?error=refund`);
  }
  await markRefunded(db, id, { restock, note: "Refunded in full by the boutique." });
  done(id, "refunded");
}

export async function addOrderNote(formData: FormData) {
  await requireAdmin();
  const input = z
    .object({ id: idSchema, note: z.string().trim().min(1).max(1000) })
    .safeParse({ id: formData.get("id"), note: formData.get("note") });
  if (!input.success) redirect(`${orderPath(String(formData.get("id")))}?error=note`);
  await addNote(await getDb(), input.data.id, `Note: ${input.data.note}`);
  done(input.data.id, "note");
}

export async function resendConfirmation(formData: FormData) {
  await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  const db = await getDb();
  const found = await getOrder(db, id);
  if (!found || found.order.status === "pending") redirect(`${orderPath(id)}?error=state`);
  try {
    await sendOrderEmails(found.order, found.items);
    await addNote(db, id, "Order confirmation re-sent.");
  } catch (err) {
    console.error("[admin] resend failed", err);
    redirect(`${orderPath(id)}?error=email`);
  }
  done(id, "resent");
}

// ------------------------------------------------------------------ inventory

export async function saveStock(formData: FormData) {
  await requireAdmin();
  const values = products.map((p) => ({
    slug: p.slug,
    stock: Math.floor(Number(formData.get(`stock_${p.slug}`))),
  }));
  if (values.some((v) => !Number.isFinite(v.stock) || v.stock < 0 || v.stock > 9999)) {
    redirect("/admin/inventory?error=invalid");
  }
  await setStock(await getDb(), values);
  revalidatePath("/admin/inventory");
  redirect("/admin/inventory?saved=1");
}
