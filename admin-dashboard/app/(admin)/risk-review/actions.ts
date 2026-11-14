"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/data";
import { saveRiskReview } from "@/lib/data/risk";
import type { RiskStatus } from "@/lib/types";

const STATUSES: RiskStatus[] = ["pending", "approved", "held", "cancelled"];

export async function reviewOrderAction(orderId: string, status: RiskStatus, formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user?.is_active || !["owner", "admin", "manager"].includes(user.role) || !STATUSES.includes(status)) return;
  const note = String(formData.get("note") ?? "").trim() || null;
  await saveRiskReview(orderId, status, note, user.id);
  revalidatePath("/risk-review");
}
