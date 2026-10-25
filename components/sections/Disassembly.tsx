import { getTranslations } from "next-intl/server";
import { stageSteps } from "@/data/hero";
import { DisassemblyStage } from "./DisassemblyStage";

/** Gathers the localized copy on the server and hands it to the client stage. */
export async function Disassembly() {
  const t = await getTranslations("home.stage");

  return (
    <DisassemblyStage
      label={t("label")}
      title={t("title")}
      visualLabel={t("label")}
      steps={stageSteps.map((s) => ({ id: s.id, title: t(`steps.${s.id}.title`), body: t(`steps.${s.id}.body`) }))}
    />
  );
}
