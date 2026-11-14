import * as React from "react";
import { Bell, CalendarCheck, Check, Clock, MessageCircle, MoreHorizontal, RotateCcw, Star, Timer, UserX, X } from "lucide-react";
import type { AppointmentStatus } from "@navalha/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { messages, sendWhatsApp } from "@/lib/messages";
import { cn, formatLongDate, formatMoney, formatPhone, formatTime, whatsappLink } from "@/lib/utils";
import type { Appointment } from "@/types/api";
import { useBarbershop, useCancelAppointment, useMarkReminder, useUpdateAppointmentStatus } from "../api";

export const STATUS_META: Record<AppointmentStatus, { label: string; tone: "info" | "danger" | "success" | "warning" }> = {
  CONFIRMED: { label: "Confirmado", tone: "info" },
  COMPLETED: { label: "Concluído", tone: "success" },
  CANCELED: { label: "Cancelado", tone: "danger" },
  NO_SHOW: { label: "Não veio", tone: "warning" },
};

export function AppointmentCard({ appt, showProfessional }: { appt: Appointment; showProfessional?: boolean }) {
  const [menu, setMenu] = React.useState(false);
  const [canceling, setCanceling] = React.useState(false);
  const update = useUpdateAppointmentStatus();
  const markReminder = useMarkReminder();
  const { data: shop } = useBarbershop();
  const meta = STATUS_META[appt.status];
  const inactive = appt.status === "CANCELED" || appt.status === "NO_SHOW";
  const upcoming = appt.status === "CONFIRMED" && new Date(appt.startsAt) > new Date();
  // já atendido (ou o horário passou): dá para pedir avaliação pelo link
  const reviewable = appt.status === "COMPLETED" || (appt.status === "CONFIRMED" && new Date(appt.endsAt) < new Date());

  const ctx = {
    clientName: appt.clientName,
    clientPhone: appt.clientPhone,
    startsAt: appt.startsAt,
    serviceName: appt.service.name,
    shopName: shop?.name ?? "",
    shopSlug: shop?.slug ?? "",
    token: appt.accessToken,
  };

  const act = (fn: () => void) => () => {
    setMenu(false);
    fn();
  };
  const setStatus = (status: AppointmentStatus) => update.mutate({ id: appt.id, status });

  return (
    <div className={cn("flex gap-3 rounded-2xl border border-zinc-200/80 bg-white p-3.5 shadow-xs sm:p-4", inactive && "opacity-60")}>
      <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-zinc-100 py-2">
        <span className="text-base font-semibold tabular-nums">{formatTime(appt.startsAt)}</span>
        <span className="text-[11px] text-zinc-500 tabular-nums">{formatTime(appt.endsAt)}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={cn("truncate font-medium", appt.status === "CANCELED" && "line-through")}>{appt.clientName}</p>
            <p className="truncate text-sm text-zinc-500">
              {appt.service.name}
              {showProfessional && ` · ${appt.professional.name}`}
            </p>
          </div>
          <div className="relative">
            <button
              onClick={() => setMenu((m) => !m)}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              aria-label="Ações"
            >
              <MoreHorizontal className="size-5" />
            </button>
            {menu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                <div className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg animate-in">
                  {upcoming && (
                    <>
                      <MenuLabel>Mensagem no WhatsApp</MenuLabel>
                      <MenuItem icon={<CalendarCheck />} onClick={act(() => sendWhatsApp(appt.clientPhone, messages.confirm(ctx)))}>
                        Confirmar horário
                      </MenuItem>
                      <MenuItem icon={<Bell />} onClick={act(() => {
                          sendWhatsApp(appt.clientPhone, messages.reminder(ctx));
                          markReminder.mutate(appt.id);
                        })}>
                        Enviar lembrete
                      </MenuItem>
                      <MenuItem icon={<Timer />} onClick={act(() => sendWhatsApp(appt.clientPhone, messages.delay(ctx, 15)))}>
                        Avisar atraso
                      </MenuItem>
                      <div className="my-1 border-t border-zinc-100" />
                    </>
                  )}
                  {reviewable && (
                    <>
                      <MenuItem icon={<Star />} onClick={act(() => sendWhatsApp(appt.clientPhone, messages.review(ctx)))}>
                        Pedir avaliação
                      </MenuItem>
                      <div className="my-1 border-t border-zinc-100" />
                    </>
                  )}
                  {appt.status !== "COMPLETED" && appt.status !== "CANCELED" && (
                    <MenuItem icon={<Check />} onClick={act(() => setStatus("COMPLETED"))}>
                      Marcar concluído
                    </MenuItem>
                  )}
                  {appt.status === "CONFIRMED" && (
                    <MenuItem icon={<UserX />} onClick={act(() => setStatus("NO_SHOW"))}>
                      Cliente não veio
                    </MenuItem>
                  )}
                  {appt.status !== "CONFIRMED" && (
                    <MenuItem icon={<RotateCcw />} onClick={act(() => setStatus("CONFIRMED"))}>
                      Voltar p/ confirmado
                    </MenuItem>
                  )}
                  {appt.status !== "CANCELED" && (
                    <MenuItem icon={<X />} danger onClick={act(() => setCanceling(true))}>
                      Desmarcar e avisar
                    </MenuItem>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge tone={meta.tone}>
            {appt.status === "CANCELED" && appt.canceledBy === "client" ? "Cancelado pelo cliente" : meta.label}
          </Badge>
          {appt.reminderSentAt && upcoming && (
            <Badge tone="success">
              <Bell className="size-3" /> Lembrado
            </Badge>
          )}
          {appt.rescheduleCount > 0 && appt.status === "CONFIRMED" && (
            <Badge tone="neutral">
              <Clock className="size-3" /> Remarcado
            </Badge>
          )}
          <span className="text-sm font-medium text-zinc-700">{formatMoney(appt.priceCents)}</span>
          <button
            onClick={() => sendWhatsApp(appt.clientPhone, `Olá ${appt.clientName.split(" ")[0]}!`)}
            className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline"
          >
            <MessageCircle className="size-3.5" />
            {formatPhone(appt.clientPhone)}
          </button>
        </div>
        {appt.status === "CANCELED" && appt.cancelReason && (
          <p className="mt-2 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs text-red-700">Motivo: {appt.cancelReason}</p>
        )}
        {appt.notes && <p className="mt-2 rounded-lg bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-600">“{appt.notes}”</p>}
      </div>

      <CancelDialog open={canceling} onClose={() => setCanceling(false)} appt={appt} ctx={ctx} />
    </div>
  );
}

const REASONS = ["Imprevisto do barbeiro", "Barbearia fechada nesse dia", "Problema de saúde", "Falta de energia/água"];

function CancelDialog({
  open,
  onClose,
  appt,
  ctx,
}: {
  open: boolean;
  onClose: () => void;
  appt: Appointment;
  ctx: Parameters<typeof messages.canceled>[0];
}) {
  const cancel = useCancelAppointment();
  const [reason, setReason] = React.useState("");
  const [notify, setNotify] = React.useState(true);

  const submit = () => {
    // abre a aba já no clique (senão o navegador do celular bloqueia como pop-up) e preenche depois
    const tab = notify ? window.open("", "_blank") : null;
    cancel.mutate(
      { id: appt.id, reason: reason || undefined },
      {
        onSuccess: () => {
          if (notify) {
            const url = whatsappLink(appt.clientPhone, messages.canceled(ctx, reason));
            if (tab) tab.location.href = url;
            else sendWhatsApp(appt.clientPhone, messages.canceled(ctx, reason));
          }
          setReason("");
          onClose();
        },
        onError: () => tab?.close(),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Desmarcar horário"
      description={`${appt.clientName} · ${formatLongDate(appt.startsAt)} às ${formatTime(appt.startsAt)}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none">
            Voltar
          </Button>
          <Button variant="danger" onClick={submit} loading={cancel.isPending} className="flex-1 sm:flex-none">
            Desmarcar{notify ? " e avisar" : ""}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Motivo (vai na mensagem para o cliente)">
          <div className="mb-2 flex flex-wrap gap-2">
            {REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs ring-1 transition",
                  reason === r ? "bg-zinc-900 text-white ring-zinc-900" : "ring-zinc-200 hover:ring-zinc-400",
                )}
              >
                {r}
              </button>
            ))}
          </div>
          <Textarea rows={2} className="min-h-0" placeholder="Ou escreva o motivo…" value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <Switch
          checked={notify}
          onChange={setNotify}
          label="Avisar o cliente pelo WhatsApp"
          description="Abre o WhatsApp com a mensagem pronta e o link para ele escolher outro horário."
        />
      </div>
    </Dialog>
  );
}

function MenuLabel({ children }: { children: React.ReactNode }) {
  return <p className="px-3 pt-1.5 pb-1 text-[10px] font-semibold tracking-wide text-zinc-400 uppercase">{children}</p>;
}

function MenuItem({ icon, children, onClick, danger }: { icon: React.ReactNode; children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-zinc-50 [&_svg]:size-4",
        danger ? "text-red-600" : "text-zinc-700",
      )}
    >
      {icon}
      {children}
    </button>
  );
}
