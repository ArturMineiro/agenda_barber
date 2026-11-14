import * as React from "react";
import { Link } from "react-router-dom";
import { BellRing, Check, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, Skeleton } from "@/components/ui/misc";
import { messages, sendWhatsApp } from "@/lib/messages";
import { addDaysToKey, cn, formatDateKeyLong, formatTime, todayKey } from "@/lib/utils";
import { useBarbershop, useMarkReminder, useReminders, type ReminderItem } from "../api";

/**
 * Lembretes do dia seguinte: um toque abre o WhatsApp do cliente com a mensagem pronta
 * e marca como lembrado. O aviso no celular ("amanhã você tem N clientes") traz o dono até aqui.
 */
export function RemindersPage() {
  const today = todayKey();
  const tomorrow = addDaysToKey(today, 1);
  const [date, setDate] = React.useState(tomorrow);
  const { data: shop } = useBarbershop();
  const { data, isLoading } = useReminders(date);
  const mark = useMarkReminder();

  const list = data?.appointments ?? [];
  const done = list.filter((a) => a.reminderSentAt).length;
  const next = list.find((a) => !a.reminderSentAt);
  const showPro = shop?.teamType === "TEAM" && new Set(list.map((a) => a.professional.name)).size > 1;

  const remind = (a: ReminderItem) => {
    if (!shop) return;
    // abre o WhatsApp no próprio toque (senão o celular bloqueia como pop-up) e marca em seguida
    sendWhatsApp(
      a.clientPhone,
      messages.reminder({
        clientName: a.clientName,
        clientPhone: a.clientPhone,
        startsAt: a.startsAt,
        serviceName: a.service.name,
        shopName: shop.name,
        shopSlug: shop.slug,
        token: a.accessToken,
      }),
    );
    mark.mutate(a.id);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Lembretes" description="Mande o lembrete no WhatsApp de cada cliente. Menos faltas, sem custo nenhum." />

      <div className="grid w-fit grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1 text-sm font-medium">
        {[
          { v: tomorrow, label: "Amanhã" },
          { v: today, label: "Hoje" },
        ].map((o) => (
          <button
            key={o.label}
            onClick={() => setDate(o.v)}
            className={cn("rounded-lg px-4 py-1.5 transition", date === o.v ? "bg-white shadow-sm" : "text-zinc-500 hover:text-zinc-800")}
          >
            {o.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-28" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : !list.length ? (
        <EmptyState
          icon={<BellRing />}
          title={date === tomorrow ? "Ninguém marcado para amanhã" : "Ninguém marcado para hoje"}
          description={<span className="first-letter:uppercase">{formatDateKeyLong(date)}</span>}
        />
      ) : (
        <>
          {/* progresso + atalho para o próximo da fila: dá para lembrar todos em sequência */}
          <div className="rounded-2xl bg-zinc-900 p-5 text-white">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm text-zinc-400 first-letter:uppercase">{formatDateKeyLong(date)}</p>
              <p className="text-sm font-medium tabular-nums">
                {done} de {list.length} lembrados
              </p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${(done / list.length) * 100}%` }} />
            </div>
            {next ? (
              <Button size="lg" className="mt-4 w-full bg-emerald-500 text-white hover:bg-emerald-600" onClick={() => remind(next)}>
                <Send /> Lembrar {next.clientName.split(" ")[0]} · {formatTime(next.startsAt)}
              </Button>
            ) : (
              <p className="mt-4 flex items-center gap-2 text-sm font-medium text-emerald-400">
                <Check className="size-4" /> Todos lembrados. Bom trabalho!
              </p>
            )}
          </div>

          <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white">
            {list.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                <span className="w-12 shrink-0 text-base font-semibold tabular-nums">{formatTime(a.startsAt)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{a.clientName}</p>
                  <p className="truncate text-xs text-zinc-500">
                    {a.service.name}
                    {showPro && ` · ${a.professional.name.split(" ")[0]}`}
                  </p>
                </div>
                {a.reminderSentAt ? (
                  <button
                    onClick={() => remind(a)}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                    title="Mandar de novo"
                  >
                    <Check className="size-3.5" /> Lembrado {formatTime(a.reminderSentAt)}
                  </button>
                ) : (
                  <Button size="sm" variant="success" onClick={() => remind(a)}>
                    <MessageCircle /> Lembrar
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {shop && (
        <p className="text-center text-xs text-zinc-500">
          {shop.reminderDigestHour === null ? "Aviso no celular desligado" : `Você recebe um aviso no celular às ${shop.reminderDigestHour}h com os clientes do dia seguinte`}
          {" · "}
          <Link to="/painel/configuracoes" className="font-medium underline underline-offset-2">
            mudar
          </Link>
        </p>
      )}
    </div>
  );
}
