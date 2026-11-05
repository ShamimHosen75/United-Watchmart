import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/data";
import { repairsReport, salesLines, stockReport, toCsv } from "@/lib/data/reports";
import { resolveRange } from "@/lib/report-range";

/** CSV export for the Reports page: /api/reports?type=sales|stock|repairs&from=YYYY-MM-DD&to=YYYY-MM-DD */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.is_active || !["owner", "admin", "manager"].includes(user.role)) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  const sp = request.nextUrl.searchParams;
  const range = resolveRange({ from: sp.get("from") ?? undefined, to: sp.get("to") ?? undefined });
  const type = sp.get("type");
  let csv: string;
  let name: string;

  if (type === "stock") {
    const s = await stockReport();
    csv = toCsv(
      ["Serial", "Watch", "Reference", "Branch", "Status", "Condition", "Received", "Days held", "Cost", "Price"],
      s.pieces.map((p) => [p.serial_number, p.product_name, p.ref_number, p.branch_name, p.status, p.condition, p.received_at.slice(0, 10), p.age, p.cost, p.price]),
    );
    name = `stock-${new Date().toISOString().slice(0, 10)}`;
  } else if (type === "repairs") {
    const r = await repairsReport(range);
    csv = toCsv(
      ["Job", "Client", "Watch", "Serial", "Technician", "Warranty", "Received", "Collected", "Final cost", "Paid", "Payment method"],
      r.jobs.map((j) => [j.number, j.customer_name, `${j.brand_text ?? ""} ${j.model_text ?? ""}`.trim(), j.serial_number, j.technician_name, j.under_warranty ? "yes" : "no",
        j.received_at.slice(0, 10), j.collected_at?.slice(0, 10), j.final_cost, j.paid_amount, j.payment_method]),
    );
    name = `repairs-${range.from}-to-${range.to}`;
  } else {
    const { lines } = await salesLines(range);
    csv = toCsv(
      ["Order", "Date", "Branch", "Staff", "Channel", "Brand", "Collection", "Watch", "Reference", "Sales (net)", "Cost", "Margin"],
      lines.map((l) => [l.number, l.placed_at.slice(0, 10), l.branch, l.staff, l.channel, l.brand, l.collection, l.product, l.ref_number, l.revenue, l.cost, l.margin]),
    );
    name = `sales-${range.from}-to-${range.to}`;
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="united-watchmart-${name}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
