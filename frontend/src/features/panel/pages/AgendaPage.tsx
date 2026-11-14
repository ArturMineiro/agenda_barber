import * as React from "react";
import { CalendarDays, ChevronRight, Plus } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DateStrip } from "@/components/DateStrip";
import { EmptyState, PageHeader, Skeleton, Tabs } from "@/components/ui/misc";
import { addDaysToKey, cn, dateKeyInZone, formatDateKeyLong, formatDateKeyShort, formatMoney, fromDateKey, todayKey } from "@/lib/utils";
import type { Appointment } from "@/types/api";
import { useAppointments, useBarbershop, useProfessionals } from "../api";
import { AppointmentCard } from "../components/AppointmentCard";
import { NewAppointmentDialog } from "../components/NewAppointmentDialog";

type View = "day" | "week";
const VIEW_KEY = "navalha:agenda-view";

/** última visão usada neste aparelho */
function loadView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === "week" ? "week" : "day";
  } catch {
    return "day";
  }
}

/** Segunda-feira da semana da data */
const weekStartOf = (key: string) => addDaysToKey(key, -((fromDateKey(key).getDay() + 6) % 7));

const revenue = (list: Appointment[]) => list.reduce((s, a) => s + a.priceCents, 0);
const notCanceled = (list: Appointment[]) => list.filter((a) => a.status !== "CANCELED");

export function AgendaPage() {
  // ?data=2026-11-05 (ao tocar numa notificação) abre direto no dia do horário
  const [params] = useSearchParams();
  const [date, setDate] = React.useState(() => {
    const d = params.get("data");
    return d && /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= todayKey() ? d : todayKey();
  });
  const [view, setViewState] = React.useState<View>(() => (params.get("visao") === "semana" ? "week" : loadView()));
  const [pro, setPro] = React.useState<string>("all");
  const [creating, setCreating] = React.useState(false);
  const { data: shop } = useBarbershop();
  const { data: pros } = useProfessionals();

  const setView = (v: View) => {
    setViewState(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* sem storage: vale só agora */
    }
  };

  const weekStart = weekStartOf(date);
  const { data: appts, isLoading } = useAppointments(
    view === "week" ? weekStart : date,
    pro === "all" ? undefined : pro,
    view === "week" ? 7 : 1,
  );

  const active = notCanceled(appts ?? []);
  const isTeam = shop?.teamType === "TEAM" && (pros?.filter((p) => p.active).length ?? 0) > 1;

  const openDay = (key: string) => {
    setDate(key);
    setView("day");
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Agenda"
        description={
          <span className="inline-block first-letter:uppercase">
            {view === "day" ? formatDateKeyLong(date) : `Semana de ${formatDateKeyShort(weekStart)} a ${formatDateKeyShort(addDaysToKey(weekStart, 6))}`}
          </span>
        }
        actions={
          <Button onClick={() => setCreating(true)} className="hidden sm:inline-flex">
            <Plus /> Novo agendamento
          </Button>
        }
      />

      <div className="flex items-center justify-between gap-3">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1 text-sm font-medium">
          {(
            [
              { v: "day", label: "Dia" },
              { v: "week", label: "Semana" },
            ] as const
          ).map((o) => (
            <button
              key={o.v}
              onClick={() => setView(o.v)}
              className={cn("rounded-lg px-4 py-1.5 transition", view === o.v ? "bg-white shadow-sm" : "text-zinc-500 hover:text-zinc-800")}
            >
              {o.label}
            </button>
          ))}
        </div>
        {active.length > 0 && (
          <p className="text-right text-sm text-zinc-500">
            <strong className="text-zinc-900">{active.length}</strong> atendimento(s) ·{" "}
            <strong className="text-zinc-900">{formatMoney(revenue(active))}</strong>
            <span className="hidden sm:inline"> previsto{view === "week" ? " na semana" : ""}</span>
          </p>
        )}
      </div>

      <DateStrip value={date} onChange={setDate} days={21} />

      {isTeam && (
        <Tabs
          value={pro}
          onChange={setPro}
          items={[{ value: "all", label: "Todos" }, ...(pros ?? []).filter((p) => p.active).map((p) => ({ value: p.id, label: p.name.split(" ")[0]! }))]}
        />
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : view === "week" ? (
        <WeekView start={weekStart} appts={appts ?? []} showProfessional={isTeam && pro === "all"} onOpenDay={openDay} />
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

/** Semana de segunda a domingo: cada dia com seus clientes; tocar no dia abre a visão do dia */
function WeekView({
  start,
  appts,
  showProfessional,
  onOpenDay,
}: {
  start: string;
  appts: Appointment[];
  showProfessional: boolean;
  onOpenDay: (key: string) => void;
}) {
  const today = todayKey();
  const days = Array.from({ length: 7 }, (_, i) => addDaysToKey(start, i));

  return (
    <div className="space-y-5">
      {days.map((key) => {
        const list = appts.filter((a) => dateKeyInZone(a.startsAt) === key);
        const live = notCanceled(list);
        return (
          <section key={key}>
            <button
              onClick={() => onOpenDay(key)}
              className="mb-2 flex w-full items-center justify-between gap-3 rounded-xl px-1 py-1 text-left hover:bg-zinc-100"
            >
              <span className="flex items-center gap-2">
                <span className={cn("font-semibold first-letter:uppercase", key < today && "text-zinc-400")}>{formatDateKeyShort(key)}</span>
                {key === today && <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold text-white uppercase">Hoje</span>}
              </span>
              <span className="flex items-center gap-1 text-sm text-zinc-500">
                {live.length ? `${live.length} · ${formatMoney(revenue(live))}` : "Livre"}
                <ChevronRight className="size-4" />
              </span>
            </button>
            {list.length > 0 && (
              <div className="space-y-2">
                {list.map((a) => (
                  <AppointmentCard key={a.id} appt={a} showProfessional={showProfessional} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
