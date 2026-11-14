import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { DateStrip } from "@/components/DateStrip";
import { cn, formatDuration, formatMoney, maskPhone, zonedDateTimeToISO } from "@/lib/utils";
import { createBookingSchema } from "@navalha/shared";
import { useBarbershop, useCreateAppointment, usePanelAvailability, useProfessionals, useServices } from "../api";

interface Props {
  open: boolean;
  onClose: () => void;
  initialDate: string;
}

/** Lançamento manual (cliente que ligou ou chegou na hora) */
export function NewAppointmentDialog({ open, onClose, initialDate }: Props) {
  const { data: services } = useServices();
  const { data: pros } = useProfessionals();
  const { data: shop } = useBarbershop();
  const create = useCreateAppointment();

  const [serviceId, setServiceId] = React.useState("");
  const [professionalId, setProfessionalId] = React.useState("");
  const [date, setDate] = React.useState(initialDate);
  const [slot, setSlot] = React.useState<{ startsAt: string; pro: string } | null>(null);
  // "outro horário": o barbeiro encaixa em qualquer hora, fora da grade/expediente
  const [freeTime, setFreeTime] = React.useState(false);
  const [customTime, setCustomTime] = React.useState("");
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open) {
      setDate(initialDate);
      setSlot(null);
      setFreeTime(false);
      setCustomTime("");
      setErrors({});
    }
  }, [open, initialDate]);

  const activeServices = services?.filter((s) => s.active) ?? [];
  const eligiblePros = (pros ?? []).filter((p) => p.active && (!serviceId || p.serviceIds.includes(serviceId)));
  const { data: avail, isFetching } = usePanelAvailability({
    serviceId: serviceId || undefined,
    professionalId: professionalId || undefined,
    date,
  });

  // no horário livre não há slot para escolher o profissional: usa o selecionado (ou o único)
  const freePro = professionalId || (eligiblePros.length === 1 ? eligiblePros[0]!.id : "");

  const submit = () => {
    const startsAt = freeTime
      ? customTime && shop
        ? zonedDateTimeToISO(date, customTime, shop.timezone)
        : ""
      : (slot?.startsAt ?? "");
    const parsed = createBookingSchema.safeParse({
      serviceId,
      professionalId: freeTime ? freePro : (slot?.pro ?? ""),
      startsAt,
      clientName: name,
      clientPhone: phone,
      notes,
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
      if (!startsAt) errs.startsAt = freeTime ? "Informe a hora" : "Escolha um horário";
      if (freeTime && !freePro) errs.professionalId = "Escolha o profissional";
      return setErrors(errs);
    }
    create.mutate(parsed.data, {
      onSuccess: () => {
        setName("");
        setPhone("");
        setNotes("");
        setSlot(null);
        setCustomTime("");
        onClose();
      },
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Novo agendamento"
      description="Para clientes que ligaram, mandaram mensagem ou chegaram sem agendar."
      footer={
        <>
          <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none">
            Cancelar
          </Button>
          <Button onClick={submit} loading={create.isPending} className="flex-1 sm:flex-none">
            Agendar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Serviço" error={errors.serviceId}>
          <Select
            value={serviceId}
            onChange={(e) => {
              const id = e.target.value;
              setServiceId(id);
              setSlot(null);
              // o profissional escolhido pode não fazer o serviço novo
              if (professionalId && !pros?.some((p) => p.id === professionalId && p.serviceIds.includes(id))) setProfessionalId("");
            }}
          >
            <option value="">Selecione…</option>
            {activeServices.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {formatDuration(s.durationMinutes)} · {formatMoney(s.priceCents)}
              </option>
            ))}
          </Select>
        </Field>

        {eligiblePros.length > 1 && (
          <Field label="Profissional" error={errors.professionalId}>
            <Select
              value={professionalId}
              onChange={(e) => {
                setProfessionalId(e.target.value);
                setSlot(null);
              }}
            >
              <option value="">{freeTime ? "Selecione…" : "Qualquer um"}</option>
              {eligiblePros.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <DateStrip
          value={date}
          onChange={(d) => {
            setDate(d);
            setSlot(null);
          }}
        />

        <Field label="Horário" error={errors.startsAt}>
          <div className="mb-2 grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1 text-sm font-medium">
            {[
              { free: false, label: "Horários livres" },
              { free: true, label: "Outro horário" },
            ].map((o) => (
              <button
                key={o.label}
                type="button"
                onClick={() => {
                  setFreeTime(o.free);
                  setSlot(null);
                  setErrors({});
                }}
                className={cn("rounded-lg py-1.5 transition", freeTime === o.free ? "bg-white shadow-sm" : "text-zinc-500")}
              >
                {o.label}
              </button>
            ))}
          </div>
          {freeTime ? (
            <div className="space-y-1.5">
              <Input
                type="time"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                aria-invalid={!!errors.startsAt}
                className="w-40 tabular-nums"
              />
              <p className="text-xs text-zinc-500">Qualquer hora, mesmo fora do expediente. Só não pode bater com outro cliente.</p>
            </div>
          ) : !serviceId ? (
            <p className="text-sm text-zinc-500">Escolha o serviço para ver os horários livres.</p>
          ) : isFetching ? (
            <Spinner />
          ) : avail?.slots.length ? (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {avail.slots.map((s) => (
                <button
                  key={s.startsAt}
                  type="button"
                  onClick={() => setSlot({ startsAt: s.startsAt, pro: s.professionalIds[0]! })}
                  className={cn(
                    "rounded-xl py-2 text-sm font-medium tabular-nums ring-1 transition",
                    slot?.startsAt === s.startsAt ? "bg-zinc-900 text-white ring-zinc-900" : "ring-zinc-200 hover:ring-zinc-400",
                  )}
                >
                  {s.time}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Sem horários livres nesta data.</p>
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome do cliente" error={errors.clientName}>
            <Input value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.clientName} />
          </Field>
          <Field label="WhatsApp" error={errors.clientPhone}>
            <Input
              inputMode="tel"
              placeholder="(11) 99999-0000"
              value={phone}
              onChange={(e) => setPhone(maskPhone(e.target.value))}
              aria-invalid={!!errors.clientPhone}
            />
          </Field>
        </div>
        <Field label="Observação (opcional)">
          <Textarea rows={2} className="min-h-0" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
    </Dialog>
  );
}
