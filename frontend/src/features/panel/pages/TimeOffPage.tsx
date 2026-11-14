import { PageHeader } from "@/components/ui/misc";
import { useProfessionals } from "../api";
import { TimeOffSection } from "../components/TimeOffSection";

/** Barbeiro da equipe: marca as próprias folgas (a grade de horários fica com o dono) */
export function TimeOffPage() {
  const { data: pros } = useProfessionals();
  return (
    <div className="space-y-6">
      <PageHeader title="Minhas folgas" description="Folga numa data, férias ou compromisso. Ninguém agenda com você nesses horários." />
      <TimeOffSection pros={pros ?? []} />
    </div>
  );
}
