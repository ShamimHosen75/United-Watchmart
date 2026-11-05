import type { PaymentMethod } from "./types";

export const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: "card", label: "Card" },
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "mobile_banking", label: "Mobile banking (bKash, Nagad)" },
  { value: "stripe", label: "Online (Stripe)" },
  { value: "trade_in", label: "Trade-in credit" },
  { value: "other", label: "Other" },
];
export const paymentLabel = (m: string) => paymentMethods.find((p) => p.value === m)?.label ?? m;

export const channels = [
  { value: "store", label: "In store" },
  { value: "phone", label: "Phone" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "online", label: "Online" },
] as const;
