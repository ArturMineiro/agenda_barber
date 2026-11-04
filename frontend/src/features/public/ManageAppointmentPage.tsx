import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { CalendarClock, CalendarPlus, CalendarX2, Check, Clock, MapPin, MessageCircle, Scissors, User } from "lucide-react";
import { APP_NAME } from "@navalha/shared";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/input";
import { Avatar, FullPageSpinner, Skeleton } from "@/components/ui/misc";
import { DateStrip } from "@/components/DateStrip";
import { ApiError, errorMessage } from "@/lib/api";
import { updateSavedBooking } from "@/lib/my-bookings";
import { brandVars, readableOn, usePublicTheme } from "@/lib/theme";
import { addDays, cn, formatDateTime, formatLongDate, formatMoney, formatTime, fromDateKey, toDateKey, whatsappLink } from "@/lib/utils";
import type { Slot } from "@/types/api";
import { useCancelMine, useMyAppointment, useRescheduleAvailability, useRescheduleMine, type MyAppointment } from "./api";

/** Página do link secreto do agendamento: o cliente vê, remarca ou cancela sem precisar de conta */
export function ManageAppointmentPage() {
  const { token = "" } = useParams();
  const { data: appt, isLoading, error } = useMyAppointment(token);
  usePublicTheme(appt?.barbershop);

  if (isLoading) return <FullPageSpinner />;
  if (error || !appt) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <CalendarX2 className="size-10 text-zinc-400" />
        <h1 className="mt-4 text-xl font-semibold">Agendamento não encontrado</h1>
        <p className="mt-1 text-sm text-zinc-500">Confira se o link está completo.</p>
      </div>
    );
  }

  const shop = appt.barbershop;
  return (
    <div style={brandVars(shop.primaryColor, shop.secondaryColor, shop.pageTheme)} className="min-h-dvh bg-zinc-50">
      <header className="bg-brand-2 text-brand-2-foreground">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-4">
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-cover bg-center text-lg font-bold ring-2 ring-white/20"
            style={{ backgroundColor: shop.primaryColor, color: readableOn(shop.primaryColor), backgroundImage: shop.logoUrl ? `url(${shop.logoUrl})` : undefined }}
          >
            {!shop.logoUrl && shop.name[0]}
          </div>
          <div className="min-w-0">
            <p className="text-xs opacity-70">Seu agendamento em</p>
            <Link to={`/${shop.slug}`} className="block truncate font-semibold hover:underline">
              {shop.name}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-xl space-y-4 px-4 py-5 pb-16">
        <Content appt={appt} token={token} />
        <p className="pt-4 text-center text-xs text-zinc-400">
          Agendamento por{" "}
          <Link to="/" className="font-medium hover:text-zinc-600">
            {APP_NAME}
          </Link>
        </p>
      </main>
    </div>
  );
}

function Content({ appt, token }: { appt: MyAppointment; token: string }) {
  const [mode, setMode] = React.useState<"view" | "reschedule">("view");
  const [canceling, setCanceling] = React.useState(false);
  const shop = appt.barbershop;
  const past = new Date(appt.endsAt) < new Date();

  if (appt.status === "CANCELED") {
    return (
      <>
        <div className="rounded-2xl bg-red-50 p-5 ring-1 ring-red-200">
          <div className="flex items-center gap-2 font-semibold text-red-800">
            <CalendarX2 className="size-5" /> Agendamento cancelado
          </div>
          <p className="mt-1 text-sm text-red-700">
            {appt.canceledBy === "barbershop" ? "A barbearia desmarcou este horário." : "Você cancelou este horário."}
            {appt.cancelReason && <> Motivo: {appt.cancelReason}</>}
          </p>
        </div>
        <Summary appt={appt} muted />
        <Link to={`/${shop.slug}`}>
          <Button variant="brand" size="lg" className="w-full">
            Agendar outro horário
          </Button>
        </Link>
      </>
    );
  }

  if (mode === "reschedule") {
    return <Reschedule appt={appt} token={token} onDone={() => setMode("view")} />;
  }

  return (
    <>
      {appt.status === "CONFIRMED" && !past && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">
          <Check className="size-4" /> Horário confirmado
        </div>
      )}
      {appt.status === "COMPLETED" && <Notice>Atendimento concluído. Obrigado pela visita!</Notice>}
      {appt.status === "NO_SHOW" && <Notice>Este horário foi marcado como não comparecido.</Notice>}

      <Summary appt={appt} />

      {appt.status === "CONFIRMED" && !past && (
        <>
          {appt.canManage ? (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="brand" size="lg" onClick={() => setMode("reschedule")}>
                <CalendarClock /> Remarcar
              </Button>
              <Button variant="outline" size="lg" className="text-red-600" onClick={() => setCanceling(true)}>
                <CalendarX2 /> Cancelar
              </Button>
              <p className="col-span-2 text-center text-xs text-zinc-500">Dá para alterar por aqui até {formatDateTime(appt.manageDeadline)}.</p>
            </div>
          ) : (
            <Notice>O prazo para alterar pelo link já passou. Se precisar, fale com a barbearia.</Notice>
          )}

          <div className="grid gap-2">
            <a href={googleCalendarUrl(appt)} target="_blank" rel="noreferrer">
              <Button variant="outline" size="lg" className="w-full">
                <CalendarPlus /> Adicionar à minha agenda
              </Button>
            </a>
          </div>
        </>
      )}

      {shop.whatsapp && (
        <a href={whatsappLink(shop.whatsapp, `Olá! Sobre meu horário de ${formatLongDate(appt.startsAt)} às ${formatTime(appt.startsAt)}:`)} target="_blank" rel="noreferrer">
          <Button variant="ghost" size="lg" className="w-full text-emerald-700">
            <MessageCircle /> Falar com a barbearia
          </Button>
        </a>
      )}

      <CancelDialog open={canceling} onClose={() => setCanceling(false)} token={token} />
    </>
  );
}

function Summary({ appt, muted }: { appt: MyAppointment; muted?: boolean }) {
  const shop = appt.barbershop;
  const location = [shop.address, shop.city].filter(Boolean).join(", ");
  return (
    <div className={cn("overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-200", muted && "opacity-70")}>
      <div className="border-b border-zinc-100 p-5">
        <p className="text-sm text-zinc-500 first-letter:uppercase">{formatLongDate(appt.startsAt)}</p>
        <p className="mt-0.5 text-4xl font-semibold tracking-tight tabular-nums">{formatTime(appt.startsAt)}</p>
      </div>
      <div className="space-y-3 p-5">
        <Row icon={<Scissors />} label="Serviço" value={`${appt.service.name} · ${formatMoney(appt.priceCents)}`} />
        <Row icon={<User />} label="Profissional" value={appt.professional.name} />
        <Row icon={<Clock />} label="Duração" value={`${appt.service.durationMinutes} min`} />
        {location && (
          <Row
            icon={<MapPin />}
            label="Endereço"
            value={
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
                {location}
              </a>
            }
          />
        )}
      </div>
    </div>
  );
}

function Reschedule({ appt, token, onDone }: { appt: MyAppointment; token: string; onDone: () => void }) {
  const today = toDateKey(new Date());
  const [date, setDate] = React.useState(() => (toDateKey(new Date(appt.startsAt)) < today ? today : toDateKey(new Date(appt.startsAt))));
  const [proId, setProId] = React.useState<string | undefined>(appt.professional.id);
  const [slot, setSlot] = React.useState<Slot>();
  const { data, isFetching } = useRescheduleAvailability(token, { date, professionalId: proId }, true);
  const reschedule = useRescheduleMine(token);
  const max = toDateKey(addDays(new Date(), appt.barbershop.maxAdvanceDays));
  const current = new Date(appt.startsAt).getTime();
  const slots = data?.slots.filter((s) => new Date(s.startsAt).getTime() !== current || (proId && proId !== appt.professional.id)) ?? [];

  const confirm = () => {
    if (!slot) return;
    const professionalId = proId ?? slot.professionalIds[0]!;
    reschedule.mutate(
      { startsAt: slot.startsAt, professionalId },
      {
        onSuccess: () => {
          updateSavedBooking(token, slot.startsAt);
          toast.success("Horário remarcado!");
          onDone();
        },
      },
    );
  };

  const slotTaken = reschedule.error instanceof ApiError && reschedule.error.code === "SLOT_UNAVAILABLE";

  return (
    <div className="space-y-5 animate-in">
      <div>
        <h2 className="text-lg font-semibold">Escolha o novo horário</h2>
        <p className="text-sm text-zinc-500">
          Atual: <span className="first-letter:uppercase">{formatLongDate(appt.startsAt)}</span> às {formatTime(appt.startsAt)}
        </p>
      </div>

      {appt.professionals.length > 1 && (
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {[{ id: undefined, name: "Qualquer um", avatarUrl: null }, ...appt.professionals].map((p) => (
            <button
              key={p.id ?? "any"}
              onClick={() => {
                setProId(p.id);
                setSlot(undefined);
              }}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full py-1.5 pr-3.5 pl-1.5 text-sm ring-1 transition",
                proId === p.id ? "bg-brand text-brand-foreground ring-transparent" : "bg-white ring-zinc-200",
              )}
            >
              <Avatar name={p.name} src={p.avatarUrl} className="size-7 text-[10px]" />
              {p.name.split(" ")[0]}
            </button>
          ))}
        </div>
      )}

      <DateStrip
        value={date}
        onChange={(d) => {
          setDate(d);
          setSlot(undefined);
        }}
        min={today}
        max={max}
        activeClassName="bg-brand text-brand-foreground"
      />

      {isFetching ? (
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-11" />
          ))}
        </div>
      ) : slots.length ? (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {slots.map((s) => (
            <button
              key={s.startsAt}
              onClick={() => setSlot(s)}
              className={cn(
                "h-11 rounded-xl text-sm font-medium tabular-nums transition active:scale-95",
                slot?.startsAt === s.startsAt ? "bg-brand text-brand-foreground shadow-md" : "bg-white ring-1 ring-zinc-200 hover:ring-zinc-400",
              )}
            >
              {s.time}
            </button>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-zinc-500 ring-1 ring-zinc-200">
          Sem horários em <span className="first-letter:uppercase">{formatLongDate(fromDateKey(date))}</span>. Tente outro dia.
        </p>
      )}

      {reschedule.isError && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          {errorMessage(reschedule.error)}
          {slotTaken && " Escolha outro horário."}
        </p>
      )}

      <div className="flex gap-2">
        <Button variant="outline" size="lg" onClick={onDone}>
          Voltar
        </Button>
        <Button variant="brand" size="lg" className="flex-1" disabled={!slot} loading={reschedule.isPending} onClick={confirm}>
          {slot ? `Confirmar ${slot.time}` : "Escolha um horário"}
        </Button>
      </div>
    </div>
  );
}

function CancelDialog({ open, onClose, token }: { open: boolean; onClose: () => void; token: string }) {
  const [reason, setReason] = React.useState("");
  const cancel = useCancelMine(token);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Cancelar agendamento?"
      description="O horário fica livre para outra pessoa."
      footer={
        <>
          <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none">
            Manter horário
          </Button>
          <Button
            variant="danger"
            loading={cancel.isPending}
            className="flex-1 sm:flex-none"
            onClick={() => cancel.mutate(reason || undefined, { onSuccess: onClose, onError: (e) => toast.error(errorMessage(e)) })}
          >
            Cancelar horário
          </Button>
        </>
      }
    >
      <Field label="Quer contar o motivo? (opcional)">
        <Textarea rows={2} className="min-h-0" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: surgiu um compromisso" />
      </Field>
    </Dialog>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl bg-zinc-100 px-4 py-3 text-sm text-zinc-600">{children}</div>;
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="rounded-xl bg-zinc-100 p-2 text-zinc-500 [&_svg]:size-4">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-zinc-500">{label}</p>
        <div className="truncate font-medium">{value}</div>
      </div>
    </div>
  );
}

function googleCalendarUrl(a: { startsAt: string; endsAt: string; service: { name: string } | string; professional: { name: string } | string; barbershop?: { name: string; address: string | null; city: string | null } }, shopName?: string, location?: string) {
  const fmt = (d: string) => new Date(d).toISOString().replace(/[-:]|\.\d{3}/g, "");
  const service = typeof a.service === "string" ? a.service : a.service.name;
  const pro = typeof a.professional === "string" ? a.professional : a.professional.name;
  const name = shopName ?? a.barbershop?.name ?? "";
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: `${service} — ${name}`,
    dates: `${fmt(a.startsAt)}/${fmt(a.endsAt)}`,
    details: `Com ${pro}`,
    location: location ?? [a.barbershop?.address, a.barbershop?.city].filter(Boolean).join(", "),
  });
  return `https://calendar.google.com/calendar/render?${p}`;
}
