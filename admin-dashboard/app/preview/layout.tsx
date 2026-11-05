import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/data";

export default async function PreviewLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  if (!user || !user.is_active) redirect("/login");
  return children;
}
