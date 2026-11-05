import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/data";

export default async function PrintLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  if (!user || !user.is_active) redirect("/login");
  return <div className="min-h-screen bg-white text-black print:min-h-0">{children}</div>;
}
