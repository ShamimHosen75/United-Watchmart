import { PageHeader } from "@/components/ui/card";
import { SettingsNav } from "@/components/business/settings-nav";

export default function SettingsLayout({ children }: LayoutProps<"/settings">) {
  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid gap-6 lg:grid-cols-[13rem_1fr] [&>*]:min-w-0">
        <SettingsNav />
        <div className="min-w-0">{children}</div>
      </div>
    </>
  );
}
