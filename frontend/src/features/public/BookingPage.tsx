import * as React from "react";
import { toast } from "sonner";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarClock,
  CalendarPlus,
  Check,
  ChevronRight,
  Clock,
  MessageCircle,
  Scissors,
  Share2,
  Store,
  Users,
} from "lucide-react";
import { APP_NAME, createBookingSchema } from "@navalha/shared";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Avatar, FullPageSpinner, Skeleton } from "@/components/ui/misc";
import { DateStrip } from "@/components/DateStrip";
import { ApiError, errorMessage } from "@/lib/api";
import { brandVars, usePublicTheme } from "@/lib/theme";
import { saveBooking, upcomingBookings } from "@/lib/my-bookings";
import { addDaysToKey, cn, formatDuration, formatLongDate, formatMoney, formatTime, formatWeekdayShort, maskPhone, setDisplayTimeZone, todayKey, whatsappLink } from "@/lib/utils";
import type { Slot } from "@/types/api";
import { QueueView } from "./QueueView";
import { PreviewBanner } from "./PreviewBanner";
import { Hero } from "./Hero";
import { RatingInline, ReviewsSection } from "./Reviews";
import { CatalogCarousel, ServiceSheet, ServiceThumb, type CatalogService } from "./Catalog";
import { useCreateBooking, useMyAppointments, usePublicAvailability, usePublicBarbershop, type BookingResult, type PublicBarbershop } from "./api";

type Step = "service" | "professional" | "time" | "details" | "done";

const CLIENT_KEY = "navalha:client";

function loadClient() {
  try {
    return JSON.parse(localStorage.getItem(CLIENT_KEY) ?? "{}") as { name?: string; phone?: string };
  } catch {
    return {};
  }
}

export function BookingPage() {
  const { slug = "" } = useParams();
  const { data, isLoading, error } = usePublicBarbershop(slug);
  usePublicTheme(data?.barbershop);

  if (isLoading) return <FullPageSpinner />;
  if (error || !data) return <Unavailable error={error} />;
  setDisplayTimeZone(data.barbershop.timezone);

  return (
    <div style={brandVars(data.barbershop.primaryColor, data.barbershop.secondaryColor, data.barbershop.pageTheme)} className="min-h-dvh bg-zinc-50">
      {data.preview && <PreviewBanner status={data.preview.status} />}
      <Booking data={data} slug={slug} />
    </div>
  );
}

function Booking({ data, slug }: { data: PublicBarbershop; slug: string }) {
  if (data.barbershop.bookingMode === "QUEUE") return <QueueView data={data} slug={slug} />;
  return <ScheduleBooking data={data} slug={slug} />;
}

function ScheduleBooking({ data, slug }: { data: PublicBarbershop; slug: string }) {
  const { barbershop: shop, services, professionals } = data;
  const [step, setStep] = React.useState<Step>("service");
  const [serviceId, setServiceId] = React.useState<string>();
  const [professionalId, setProfessionalId] = React.useState<string>(); // undefined = sem preferência
  const [date, setDate] = React.useState(() => todayKey());
  const [slot, setSlot] = React.useState<Slot>();
  const [result, setResult] = React.useState<BookingResult>();
  const [viewing, setViewing] = React.useState<CatalogService | null>(null);
  const topRef = React.useRef<HTMLDivElement>(null);

  const service = services.find((s) => s.id === serviceId);
  const eligible = professionals.filter((p) => serviceId && p.serviceIds.includes(serviceId));
  const chosenPro = professionals.find((p) => p.id === (professionalId ?? (slot && slot.professionalIds[0])));

  const go = (s: Step) => {
    setStep(s);
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const pickService = (id: string) => {
    setServiceId(id);
    setSlot(undefined);
    setProfessionalId(undefined);
    const pros = professionals.filter((p) => p.serviceIds.includes(id));
    go(pros.length > 1 ? "professional" : "time");
  };

  const back = () => {
    if (step === "professional") go("service");
    else if (step === "time") go(eligible.length > 1 ? "professional" : "service");
    else if (step === "details") go("time");
  };

  return (
    <>
      <Hero shop={shop} compact={step !== "service"} rating={data.reviews} />

      <div ref={topRef} className="mx-auto max-w-xl scroll-mt-4 px-4 pt-5 pb-36">
        {step !== "service" && step !== "done" && (
          <button onClick={back} className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-zinc-900">
            <ArrowLeft className="size-4" /> Voltar
          </button>
        )}

        {step === "service" && (
          <section className="animate-in">
            <MyUpcoming slug={slug} />
            <CatalogCarousel services={services} onOpen={setViewing} />
            <h2 className="mb-3 text-lg font-semibold">Escolha o serviço</h2>
            <div className="space-y-2">
              {services.map((s) => (
                <button
                  key={s.id}
                  onClick={() => pickService(s.id)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white p-4 text-left shadow-xs transition hover:border-zinc-300 active:scale-[0.99]"
                >
                  <ServiceThumb service={s} onOpen={setViewing} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{s.name}</p>
                    {s.description && <p className="mt-0.5 line-clamp-2 text-sm text-zinc-500">{s.description}</p>}
                    <p className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" /> {formatDuration(s.durationMinutes)}
                      </span>
                      <RatingInline rating={s.rating} />
                    </p>
                  </div>
                  <span className="font-semibold">{formatMoney(s.priceCents)}</span>
                  <ChevronRight className="size-4 text-zinc-300" />
                </button>
              ))}
              {services.length === 0 && <p className="text-sm text-zinc-500">Nenhum serviço disponível no momento.</p>}
            </div>
            <ReviewsSection reviews={data.reviews} showProfessional={shop.teamType === "TEAM" && data.professionals.length > 1} />
          </section>
        )}

        {step === "professional" && (
          <section className="animate-in">
            <h2 className="mb-3 text-lg font-semibold">Com quem?</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <ProCard
                active={!professionalId}
                onClick={() => {
                  setProfessionalId(undefined);
                  setSlot(undefined);
                  go("time");
                }}
                icon={<Users className="size-5" />}
                name="Sem preferência"
                sub="Primeiro disponível"
              />
              {eligible.map((p) => (
                <ProCard
                  key={p.id}
                  active={professionalId === p.id}
                  onClick={() => {
                    setProfessionalId(p.id);
                    setSlot(undefined);
                    go("time");
                  }}
                  icon={<Avatar name={p.name} src={p.avatarUrl} className="size-12" />}
                  name={p.name}
                  sub={p.bio ?? undefined}
                />
              ))}
            </div>
          </section>
        )}

        {step === "time" && service && (
          <TimeStep
            slug={slug}
            serviceId={service.id}
            professionalId={professionalId}
            date={date}
            setDate={(d) => {
              setDate(d);
              setSlot(undefined);
            }}
            maxDays={shop.maxAdvanceDays}
            slot={slot}
            onPick={setSlot}
          />
        )}

        {step === "details" && service && slot && (
          <DetailsStep
            preview={!!data.preview}
            slug={slug}
            serviceId={service.id}
            professionalId={professionalId ?? slot.professionalIds[0]!}
            slot={slot}
            onDone={(r) => {
              saveBooking({ token: r.accessToken, slug, startsAt: r.startsAt });
              setResult(r);
              go("done");
            }}
            onSlotTaken={() => {
              setSlot(undefined);
              go("time");
            }}
          />
        )}

        {step === "done" && result && <Done result={result} shop={shop} />}
      </div>

      <ServiceSheet
        service={viewing}
        onClose={() => setViewing(null)}
        onBook={(s) => {
          setViewing(null);
          pickService(s.id);
        }}
      />

      {/* Resumo + ação fixos no rodapé (alcance do polegar) */}
      {service && (step === "time" || step === "professional" || step === "details") && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-200 bg-white/95 backdrop-blur-lg pb-safe">
          <div className="mx-auto flex max-w-xl items-center gap-3 px-4 pt-3">
            <div className="min-w-0 flex-1 text-sm">
              <p className="truncate font-medium">
                {service.name} · {formatMoney(service.priceCents)}
              </p>
              <p className="truncate text-zinc-500">
                {slot ? `${formatLongDate(slot.startsAt)} às ${slot.time}` : "Escolha um horário"}
                {chosenPro && eligible.length > 1 ? ` · ${chosenPro.name.split(" ")[0]}` : ""}
              </p>
            </div>
            {step === "time" && (
              <Button variant="brand" size="lg" disabled={!slot} onClick={() => go("details")}>
                Continuar
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function ProCard({ active, onClick, icon, name, sub }: { active: boolean; onClick: () => void; icon: React.ReactNode; name: string; sub?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center rounded-2xl border bg-white p-4 text-center shadow-xs transition active:scale-[0.98]",
        active ? "border-brand ring-2 ring-brand/30" : "border-zinc-200/80 hover:border-zinc-300",
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">{icon}</div>
      <p className="mt-2 line-clamp-1 text-sm font-medium">{name}</p>
      {sub && <p className="line-clamp-2 text-xs text-zinc-500">{sub}</p>}
    </button>
  );
}

function TimeStep(props: {
  slug: string;
  serviceId: string;
  professionalId?: string;
  date: string;
  setDate: (d: string) => void;
  maxDays: number;
  slot?: Slot;
  onPick: (s: Slot) => void;
}) {
  const { data, isLoading } = usePublicAvailability(props.slug, {
    serviceId: props.serviceId,
    professionalId: props.professionalId,
    date: props.date,
  });
  const today = todayKey();
  const max = addDaysToKey(today, props.maxDays);

  const periods = React.useMemo(() => {
    const slots = data?.slots ?? [];
    return [
      { label: "Manhã", items: slots.filter((s) => s.time < "12:00") },
      { label: "Tarde", items: slots.filter((s) => s.time >= "12:00" && s.time < "18:00") },
      { label: "Noite", items: slots.filter((s) => s.time >= "18:00") },
    ].filter((p) => p.items.length);
  }, [data]);

  return (
    <section className="animate-in space-y-5">
      <h2 className="text-lg font-semibold">Quando?</h2>
      <DateStrip value={props.date} onChange={props.setDate} min={today} max={max} activeClassName="bg-brand text-brand-foreground" />

      {isLoading ? (
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-11" />
          ))}
        </div>
      ) : periods.length ? (
        periods.map((p) => (
          <div key={p.label}>
            <p className="mb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">{p.label}</p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {p.items.map((s) => (
                <button
                  key={s.startsAt}
                  onClick={() => props.onPick(s)}
                  className={cn(
                    "h-11 rounded-xl text-sm font-medium tabular-nums transition active:scale-95",
                    props.slot?.startsAt === s.startsAt
                      ? "bg-brand text-brand-foreground shadow-md"
                      : "bg-white ring-1 ring-zinc-200 hover:ring-zinc-400",
                  )}
                >
                  {s.time}
                </button>
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-zinc-200">
          <p className="font-medium">Sem horários neste dia</p>
          <p className="mt-1 text-sm text-zinc-500">Tente outra data.</p>
        </div>
      )}
    </section>
  );
}

function DetailsStep(props: {
  /** prévia antes da aprovação: mostra o formulário, mas não agenda */
  preview: boolean;
  slug: string;
  serviceId: string;
  professionalId: string;
  slot: Slot;
  onDone: (r: BookingResult) => void;
  onSlotTaken: () => void;
}) {
  const saved = React.useMemo(loadClient, []);
  const [name, setName] = React.useState(saved.name ?? "");
  const [phone, setPhone] = React.useState(saved.phone ? maskPhone(saved.phone) : "");
  const [notes, setNotes] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const book = useCreateBooking(props.slug);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = createBookingSchema.safeParse({
      serviceId: props.serviceId,
      professionalId: props.professionalId,
      startsAt: props.slot.startsAt,
      clientName: name,
      clientPhone: phone,
      notes,
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
      return setErrors(errs);
    }
    setErrors({});
    book.mutate(parsed.data, {
      onSuccess: (r) => {
        try {
          localStorage.setItem(CLIENT_KEY, JSON.stringify({ name: parsed.data.clientName, phone: parsed.data.clientPhone }));
        } catch {
          /* modo privado: tudo bem */
        }
        props.onDone(r);
      },
    });
  };

  const slotTaken = book.error instanceof ApiError && book.error.code === "SLOT_UNAVAILABLE";

  return (
    <form onSubmit={submit} className="animate-in space-y-4">
      <h2 className="text-lg font-semibold">Seus dados</h2>
      {book.isError && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          {errorMessage(book.error)}
          {slotTaken && (
            <button type="button" onClick={props.onSlotTaken} className="mt-1 block font-semibold underline">
              Escolher outro horário
            </button>
          )}
        </div>
      )}
      <Field label="Nome" error={errors.clientName}>
        <Input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.clientName} />
      </Field>
      <Field label="WhatsApp" error={errors.clientPhone} hint="Usado só para falar sobre seu horário.">
        <Input
          inputMode="tel"
          autoComplete="tel"
          placeholder="(11) 99999-0000"
          value={phone}
          onChange={(e) => setPhone(maskPhone(e.target.value))}
          aria-invalid={!!errors.clientPhone}
        />
      </Field>
      <Field label="Alguma observação? (opcional)">
        <Textarea rows={2} className="min-h-0" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      {props.preview ? (
        <>
          <Button type="button" variant="brand" size="lg" className="w-full" disabled>
            Confirmar agendamento
          </Button>
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-center text-sm text-amber-900 ring-1 ring-amber-200">
            Isto é uma prévia: o cliente confirma aqui. Os agendamentos pelo link começam quando a barbearia for aprovada.
          </p>
        </>
      ) : (
        <Button type="submit" variant="brand" size="lg" className="w-full" loading={book.isPending}>
          Confirmar agendamento
        </Button>
      )}
    </form>
  );
}

function Done({ result, shop }: { result: BookingResult; shop: PublicBarbershop["barbershop"] }) {
  const gcal = () => {
    const fmt = (d: string) => new Date(d).toISOString().replace(/[-:]|\.\d{3}/g, "");
    const p = new URLSearchParams({
      action: "TEMPLATE",
      text: `${result.service} — ${shop.name}`,
      dates: `${fmt(result.startsAt)}/${fmt(result.endsAt)}`,
      details: `Com ${result.professional}`,
      location: [shop.address, shop.city].filter(Boolean).join(", "),
    });
    return `https://calendar.google.com/calendar/render?${p}`;
  };

  return (
    <section className="animate-in text-center">
      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <Check className="size-8" strokeWidth={3} />
      </div>
      <h2 className="mt-4 text-2xl font-semibold">Horário confirmado!</h2>
      <p className="mt-1 text-zinc-500">Te esperamos lá.</p>

      <div className="mt-6 space-y-3 rounded-2xl bg-white p-5 text-left ring-1 ring-zinc-200">
        <Row icon={<Scissors />} label="Serviço" value={`${result.service} · ${formatMoney(result.priceCents)}`} />
        <Row icon={<CalendarPlus />} label="Quando" value={<span className="inline-block first-letter:uppercase">{`${formatLongDate(result.startsAt)}, ${formatTime(result.startsAt)}`}</span>} />
        <Row icon={<Users />} label="Profissional" value={result.professional} />
      </div>

      {/* link para ver/remarcar/cancelar depois */}
      <div className="mt-5 rounded-2xl bg-zinc-900 p-4 text-left text-white">
        <p className="text-sm font-medium">Precisa remarcar ou cancelar?</p>
        <p className="mt-0.5 text-xs text-zinc-400">Use este link. Ele também fica salvo neste aparelho, na página da barbearia.</p>
        <div className="mt-3 flex gap-2">
          <Link to={`/agendamento/${result.accessToken}`} className="flex-1">
            <Button size="sm" className="w-full bg-white text-zinc-900 hover:bg-zinc-100">
              <CalendarClock /> Ver meu agendamento
            </Button>
          </Link>
          <Button
            size="sm"
            className="bg-white/10 hover:bg-white/20"
            onClick={async () => {
              const url = `${window.location.origin}/agendamento/${result.accessToken}`;
              if (navigator.share) await navigator.share({ title: shop.name, url }).catch(() => {});
              else {
                await navigator.clipboard.writeText(url);
                toast.success("Link copiado");
              }
            }}
          >
            <Share2 /> Salvar link
          </Button>
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        <a href={gcal()} target="_blank" rel="noreferrer">
          <Button variant="outline" size="lg" className="w-full">
            <CalendarPlus /> Adicionar à agenda
          </Button>
        </a>
        {shop.whatsapp && (
          <a href={whatsappLink(shop.whatsapp, `Olá! Acabei de agendar ${result.service} para ${formatLongDate(result.startsAt)} às ${formatTime(result.startsAt)}.`)} target="_blank" rel="noreferrer">
            <Button variant="ghost" size="lg" className="w-full text-emerald-700">
              <MessageCircle /> Falar com a barbearia
            </Button>
          </a>
        )}
      </div>
      <p className="mt-8 text-xs text-zinc-400">
        Agendamento por{" "}
        <Link to="/" className="font-medium hover:text-zinc-600">
          {APP_NAME}
        </Link>
      </p>
    </section>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="rounded-xl bg-zinc-100 p-2 text-zinc-500 [&_svg]:size-4">{icon}</span>
      <div>
        <p className="text-xs text-zinc-500">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}

function Unavailable({ error }: { error: unknown }) {
  const locked = error instanceof ApiError && error.status === 423;
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="rounded-2xl bg-zinc-100 p-4 text-zinc-500">
        <Store className="size-8" />
      </div>
      <h1 className="mt-4 text-xl font-semibold">{locked ? "Agenda indisponível" : "Página não encontrada"}</h1>
      <p className="mt-1 max-w-sm text-sm text-zinc-500">
        {locked ? "Esta barbearia não está recebendo agendamentos online no momento." : "Confira se o link está correto."}
      </p>
      <Link to="/" className="mt-6 text-sm font-medium text-zinc-900 underline underline-offset-4">
        Conhecer o {APP_NAME}
      </Link>
    </div>
  );
}

/** Próximos agendamentos feitos neste aparelho, com atalho para ver/remarcar/cancelar */
function MyUpcoming({ slug }: { slug: string }) {
  const saved = React.useMemo(() => upcomingBookings(slug), [slug]);
  const results = useMyAppointments(saved.map((s) => s.token));
  const items = results
    .map((r, i) => ({ data: r.data, token: saved[i]!.token }))
    .filter((x) => x.data && x.data.status === "CONFIRMED" && new Date(x.data.endsAt) > new Date());

  if (!items.length) return null;
  return (
    <div className="mb-6">
      <h2 className="mb-2 text-sm font-semibold tracking-wide text-zinc-500 uppercase">Seus agendamentos</h2>
      <div className="space-y-2">
        {items.map(({ data, token }) => (
          <Link
            key={token}
            to={`/agendamento/${token}`}
            className="flex items-center gap-3 rounded-2xl bg-brand-2 p-4 text-brand-2-foreground shadow-sm active:scale-[0.99]"
          >
            <div className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-white/10 py-1.5">
              <span className="text-[10px] uppercase opacity-70">{formatWeekdayShort(data!.startsAt)}</span>
              <span className="text-lg font-semibold tabular-nums">{formatTime(data!.startsAt)}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{data!.service.name}</p>
              <p className="truncate text-sm opacity-70 first-letter:uppercase">
                {formatLongDate(data!.startsAt)} · {data!.professional.name.split(" ")[0]}
              </p>
            </div>
            <span className="text-xs font-medium opacity-80">Ver</span>
            <ChevronRight className="size-4 opacity-60" />
          </Link>
        ))}
      </div>
    </div>
  );
}
