import { Link } from "react-router-dom";
import { ArrowRight, Ban, BellRing, X, CalendarDays, CheckCircle2, Circle, Clock, DollarSign, ListOrdered, Pencil, TrendingUp } from "lucide-react";
import { EmptyState, PageHeader, Skeleton, StatCard } from "@/components/ui/misc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMe } from "@/features/auth/api";
import { Avatar } from "@/components/ui/misc";
import { cn, formatDuration, formatMoney } from "@/lib/utils";
import { useBarbershop, useDashboard, useProfessionals, useQueue, useReminders, useServices } from "../api";
import { AppointmentCard } from "../components/AppointmentCard";
import { ShareLinkCard } from "../components/ShareLinkCard";
import { hoursSummary, weekSchedule } from "../components/HoursEditor";
import { usePush } from "@/lib/push";
import * as React from "react";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

export function DashboardPage() {
  const { data: user } = useMe();
  const { data: shop } = useBarbershop();
  const { data, isLoading } = useDashboard();

  if (!shop) return null;
  const queueMode = shop.bookingMode === "QUEUE";

  return (
    <div className="space-y-6">
      <PageHeader title={`${greeting()}, ${user?.name.split(" ")[0] ?? ""}`} description="Veja como está o movimento hoje." />

      {shop.status === "PENDING" && user?.role !== "BARBER" && <Onboarding />}

      <ShareLinkCard shop={shop} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {isLoading || !data ? (
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)
        ) : (
          <>
            <StatCard label="Hoje" value={data.today.count} hint={queueMode ? "clientes na fila e atendidos" : "agendamentos"} icon={<CalendarDays />} />
            <StatCard label={queueMode ? "Valor hoje" : "Previsto hoje"} value={formatMoney(data.today.revenueCents)} icon={<DollarSign />} />
            <div className="col-span-2 lg:col-span-1">
              <StatCard
                label="Realizado no mês"
                value={formatMoney(data.month.revenueCents)}
                hint={`${data.month.count} atendimentos`}
                icon={<TrendingUp />}
              />
            </div>
          </>
        )}
      </div>

      {!queueMode && shop.status === "ACTIVE" && <TomorrowReminders />}

      {!queueMode && <NotificationsPrompt />}

      {!queueMode && <WorkScheduleCard />}

      {queueMode ? <QueueSummary /> : (
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Próximos atendimentos</h2>
          <Link to="/painel/agenda" className="inline-flex items-center gap-1 text-sm font-medium text-zinc-600 hover:text-zinc-900">
            Ver agenda <ArrowRight className="size-4" />
          </Link>
        </div>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : data?.upcoming.length ? (
          <div className="space-y-2">
            {data.upcoming.map((a) => (
              <AppointmentCard key={a.id} appt={a} showProfessional={shop.teamType === "TEAM"} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<CalendarDays />}
            title="Nenhum agendamento por vir"
            description="Compartilhe seu link no Instagram e no WhatsApp para os clientes agendarem."
          />
        )}
      </section>
      )}
    </div>
  );
}

/** Clientes de amanhã: atalho para mandar os lembretes (some quando todos foram lembrados) */
function TomorrowReminders() {
  const { data } = useReminders();
  const list = data?.appointments ?? [];
  const pending = list.filter((a) => !a.reminderSentAt).length;
  if (!pending) return null;
  return (
    <Link to="/painel/lembretes" className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 hover:bg-emerald-100/60">
      <span className="rounded-xl bg-emerald-500 p-2.5 text-white">
        <BellRing className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-emerald-950">
          Amanhã: {list.length} cliente{list.length > 1 ? "s" : ""}
        </p>
        <p className="text-sm text-emerald-800/80">
          {pending === list.length ? "Mande o lembrete no WhatsApp e evite faltas" : `${pending} ainda sem lembrete`}
        </p>
      </div>
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-800">
        Lembrar <ArrowRight className="size-4" />
      </span>
    </Link>
  );
}

/** Modo ordem de chegada: como está a fila de cada barbeiro agora */
function QueueSummary() {
  const { data: columns, isLoading } = useQueue();
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Fila agora</h2>
        <Link to="/painel/fila" className="inline-flex items-center gap-1 text-sm font-medium text-zinc-600 hover:text-zinc-900">
          Abrir fila <ArrowRight className="size-4" />
        </Link>
      </div>
      {isLoading ? (
        <Skeleton className="h-20" />
      ) : columns?.length ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {columns.map((c) => (
            <Link key={c.id} to="/painel/fila" className="flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs hover:border-zinc-300">
              <Avatar name={c.name} src={c.avatarUrl} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.name}</p>
                <p className="truncate text-xs text-zinc-500">
                  {!c.queueOpen ? "Fila fechada" : c.current ? `Atendendo ${c.current.clientName.split(" ")[0]}` : "Cadeira livre"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-semibold tabular-nums">{c.waiting.length}</p>
                <p className="text-[11px] text-zinc-500">~{formatDuration(c.estimatedWaitMinutes || 0)}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState icon={<ListOrdered />} title="Ninguém na fila" />
      )}
    </section>
  );
}

/** Checklist enquanto a barbearia aguarda aprovação */
function Onboarding() {
  const { data: shop } = useBarbershop();
  const { data: services } = useServices();
  const { data: pros } = useProfessionals();

  const steps = [
    { done: !!services?.some((s) => s.active), label: "Cadastre seus serviços e preços", to: "/painel/servicos" },
    ...(shop?.bookingMode === "QUEUE"
      ? []
      : [{ done: !!pros?.some((p) => p.workingHours.length > 0), label: "Defina seus horários de atendimento", to: "/painel/equipe" }]),
    { done: !!(shop?.description || shop?.logoUrl || shop?.coverUrl), label: "Personalize sua página", to: "/painel/configuracoes" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deixe tudo pronto para a aprovação</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {steps.map((s) => (
          <Link key={s.label} to={s.to} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-zinc-50">
            {s.done ? <CheckCircle2 className="size-5 text-emerald-600" /> : <Circle className="size-5 text-zinc-300" />}
            <span className={cn("flex-1 text-sm", s.done && "text-zinc-400 line-through")}>{s.label}</span>
            <ArrowRight className="size-4 text-zinc-400" />
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

/** Expediente sempre visível no início: fácil de achar onde muda horário e folga */
function WorkScheduleCard() {
  const { data: shop } = useBarbershop();
  const { data: pros } = useProfessionals();
  const { data: user } = useMe();
  // barbeiro: a grade é do dono; ele marca só as próprias folgas
  const barber = user?.role === "BARBER";
  const active = pros?.filter((p) => p.active) ?? [];
  if (!shop || !active.length) return null;
  const solo = active.length === 1;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-zinc-400" />
          <CardTitle>{solo ? "Seu expediente" : "Expediente da equipe"}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {solo ? (
          <ul className="divide-y divide-zinc-100 text-sm">
            {weekSchedule(active[0]!.workingHours).map((g) => (
              <li key={g.days} className="flex items-center justify-between gap-3 py-2">
                <span className="font-medium text-zinc-700">{g.days}</span>
                <span className={cn("text-right tabular-nums", g.hours ? "text-zinc-900" : "text-zinc-400")}>{g.hours ?? "Folga"}</span>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="divide-y divide-zinc-100 text-sm">
            {active.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                <span className="font-medium text-zinc-700">{p.name}</span>
                <span className="text-right text-zinc-500">{hoursSummary(p.workingHours)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className={cn("grid gap-2", barber ? "grid-cols-1" : "grid-cols-2")}>
          {!barber && (
            <Link to="/painel/equipe" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-zinc-900 text-sm font-medium text-white hover:bg-zinc-800">
              <Pencil className="size-4" /> Editar horários
            </Link>
          )}
          <Link
            to={barber ? "/painel/folgas?folga=1" : "/painel/equipe?folga=1"}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-200 text-sm font-medium hover:bg-zinc-50"
          >
            <Ban className="size-4" /> Marcar folga
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

const PROMPT_KEY = "navalha:hide-notifications-prompt";

/** Convite para ativar os avisos no celular, até ativar (ou dispensar) neste aparelho */
function NotificationsPrompt() {
  const push = usePush();
  const [hidden, setHidden] = React.useState(() => {
    try {
      return localStorage.getItem(PROMPT_KEY) === "1";
    } catch {
      return false;
    }
  });
  if (hidden || push.loading || push.state === "on" || push.state === "unsupported") return null;

  const dismiss = () => {
    try {
      localStorage.setItem(PROMPT_KEY, "1");
    } catch {
      /* sem storage: só esconde agora */
    }
    setHidden(true);
  };

  return (
    <div className="relative flex items-start gap-3 rounded-2xl bg-zinc-900 p-4 pr-10 text-white">
      <span className="rounded-xl bg-amber-400/15 p-2.5 text-amber-400">
        <BellRing className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Receba aviso de novo agendamento</p>
        <p className="mt-0.5 text-sm text-zinc-400">
          {push.state === "needs-install"
            ? "Adicione o Navalha à tela de início do iPhone e ative as notificações."
            : "Chega no celular quando alguém agendar, remarcar ou desmarcar, igual a um app."}
        </p>
        <Link
          to="/painel/notificacoes"
          className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-3.5 py-2 text-sm font-semibold text-zinc-900 hover:bg-amber-300"
        >
          Ver como ativar <ArrowRight className="size-4" />
        </Link>
      </div>
      <button onClick={dismiss} className="absolute top-3 right-3 rounded-lg p-1.5 text-zinc-500 hover:bg-white/10 hover:text-white" aria-label="Dispensar">
        <X className="size-4" />
      </button>
    </div>
  );
}
