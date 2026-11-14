import * as React from "react";
import { CalendarDays, Plus } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DateStrip } from "@/components/DateStrip";
import { EmptyState, PageHeader, Skeleton, Tabs } from "@/components/ui/misc";
import { formatDateKeyLong, formatMoney, todayKey } from "@/lib/utils";
import { useAppointments, useBarbershop, useProfessionals } from "../api";
import { AppointmentCard } from "../components/AppointmentCard";
import { NewAppointmentDialog } from "../components/NewAppointmentDialog";

export function AgendaPage() {
  // ?data=2026-11-05 (ao tocar numa notificação) abre direto no dia do horário
  const [params] = useSearchParams();
  const [date, setDate] = React.useState(() => {
    const d = params.get("data");
    return d && /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= todayKey() ? d : todayKey();
  });
  const [pro, setPro] = React.useState<string>("all");
  const [creating, setCreating] = React.useState(false);
  const { data: shop } = useBarbershop();
  const { data: pros } = useProfessionals();
  const { data: appts, isLoading } = useAppointments(date, pro === "all" ? undefined : pro);

  const active = appts?.filter((a) => a.status !== "CANCELED") ?? [];
  const total = active.reduce((s, a) => s + a.priceCents, 0);
  const isTeam = shop?.teamType === "TEAM" && (pros?.filter((p) => p.active).length ?? 0) > 1;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Agenda"
        description={<span className="inline-block first-letter:uppercase">{formatDateKeyLong(date)}</span>}
        actions={
          <Button onClick={() => setCreating(true)} className="hidden sm:inline-flex">
            <Plus /> Novo agendamento
          </Button>
        }
      />

      <DateStrip value={date} onChange={setDate} days={21} />

      {isTeam && (
        <Tabs
          value={pro}
          onChange={setPro}
          items={[{ value: "all", label: "Todos" }, ...(pros ?? []).filter((p) => p.active).map((p) => ({ value: p.id, label: p.name.split(" ")[0]! }))]}
        />
      )}

      {active.length > 0 && (
        <div className="flex gap-4 text-sm text-zinc-500">
          <span>
            <strong className="text-zinc-900">{active.length}</strong> atendimento(s)
          </span>
          <span>
            <strong className="text-zinc-900">{formatMoney(total)}</strong> previsto
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : appts?.length ? (
        <div className="space-y-2">
          {appts.map((a) => (
            <AppointmentCard key={a.id} appt={a} showProfessional={isTeam && pro === "all"} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<CalendarDays />}
          title="Dia livre"
          description="Nenhum agendamento para esta data."
          action={
            <Button variant="outline" onClick={() => setCreating(true)}>
              <Plus /> Agendar cliente
            </Button>
          }
        />
      )}

      {/* botão flutuante no celular */}
      <button
        onClick={() => setCreating(true)}
        className="fixed right-4 bottom-24 z-20 flex size-14 items-center justify-center rounded-full bg-zinc-900 text-white shadow-xl active:scale-95 sm:hidden"
        aria-label="Novo agendamento"
      >
        <Plus className="size-6" />
      </button>

      <NewAppointmentDialog open={creating} onClose={() => setCreating(false)} initialDate={date} />
    </div>
  );
}
