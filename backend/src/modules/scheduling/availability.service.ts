import { DateTime } from "luxon";
import type { AppointmentStatus, Barbershop } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { badRequest, notFound } from "../../lib/errors";
import { overlaps, startOfDayInZone, weekdayOf } from "../../lib/time";

/**
 * Status que ocupam a cadeira. Cancelado e "não veio" liberam o horário
 * (o dono pode encaixar alguém quando o cliente falta).
 */
export const BLOCKING_STATUSES: AppointmentStatus[] = ["CONFIRMED", "COMPLETED"];

export interface Slot {
  /** ISO com offset, ex.: 2026-11-05T14:30:00.000-03:00 */
  startsAt: string;
  /** "14:30" no fuso da barbearia */
  time: string;
  /** Profissionais livres nesse horário */
  professionalIds: string[];
}

interface AvailabilityOptions {
  barbershop: Barbershop;
  serviceId: string;
  date: string;
  professionalId?: string;
  /** Painel do dono: ignora antecedência mínima e limite de dias à frente */
  ignoreBookingWindow?: boolean;
  /** Ao remarcar: o próprio agendamento não conta como ocupado */
  ignoreAppointmentId?: string;
  now?: DateTime;
}

/**
 * Calcula os horários livres de um dia.
 *
 * Para cada profissional que faz o serviço:
 *   grade do dia da semana → fatia em passos de `slotIntervalMinutes`
 *   → remove o que não cabe a duração do serviço
 *   → remove conflitos com agendamentos e bloqueios
 *   → remove o que estiver antes da antecedência mínima
 */
export async function getAvailability(opts: AvailabilityOptions): Promise<{ slots: Slot[]; durationMinutes: number }> {
  const { barbershop, serviceId, date, professionalId } = opts;
  const zone = barbershop.timezone;
  const now = (opts.now ?? DateTime.now()).setZone(zone);

  const service = await prisma.service.findFirst({
    where: { id: serviceId, barbershopId: barbershop.id, active: true },
  });
  if (!service) throw notFound("Serviço não encontrado");

  let day: DateTime;
  try {
    day = startOfDayInZone(date, zone);
  } catch {
    throw badRequest("Data inválida");
  }
  const dayEnd = day.endOf("day");

  if (!opts.ignoreBookingWindow) {
    const lastDay = now.startOf("day").plus({ days: barbershop.maxAdvanceDays });
    if (dayEnd < now || day > lastDay) return { slots: [], durationMinutes: service.durationMinutes };
  }

  const professionals = await prisma.professional.findMany({
    where: {
      barbershopId: barbershop.id,
      active: true,
      ...(professionalId ? { id: professionalId } : {}),
      services: { some: { serviceId } },
    },
    select: {
      id: true,
      workingHours: { where: { weekday: weekdayOf(day) }, orderBy: { startMinute: "asc" } },
    },
  });
  if (professionals.length === 0) return { slots: [], durationMinutes: service.durationMinutes };

  const ids = professionals.map((p) => p.id);
  const rangeStart = day.toJSDate();
  const rangeEnd = dayEnd.toJSDate();

  const [appointments, timeOffs] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        professionalId: { in: ids },
        status: { in: BLOCKING_STATUSES },
        ...(opts.ignoreAppointmentId ? { id: { not: opts.ignoreAppointmentId } } : {}),
        startsAt: { lt: rangeEnd },
        endsAt: { gt: rangeStart },
      },
      select: { professionalId: true, startsAt: true, endsAt: true },
    }),
    prisma.timeOff.findMany({
      where: { professionalId: { in: ids }, startsAt: { lt: rangeEnd }, endsAt: { gt: rangeStart } },
      select: { professionalId: true, startsAt: true, endsAt: true },
    }),
  ]);

  const busyBy = new Map<string, { startsAt: Date; endsAt: Date }[]>();
  for (const b of [...appointments, ...timeOffs]) {
    const list = busyBy.get(b.professionalId) ?? [];
    list.push(b);
    busyBy.set(b.professionalId, list);
  }

  const earliest = opts.ignoreBookingWindow ? null : now.plus({ minutes: barbershop.minAdvanceMinutes });
  const step = barbershop.slotIntervalMinutes;
  const duration = service.durationMinutes;
  const slotMap = new Map<string, Slot>();

  for (const pro of professionals) {
    const busy = busyBy.get(pro.id) ?? [];
    for (const wh of pro.workingHours) {
      for (let m = wh.startMinute; m + duration <= wh.endMinute; m += step) {
        const start = day.plus({ minutes: m });
        if (earliest && start < earliest) continue;
        const startDate = start.toJSDate();
        const endDate = start.plus({ minutes: duration }).toJSDate();
        if (busy.some((b) => overlaps(startDate, endDate, b.startsAt, b.endsAt))) continue;

        const key = start.toISO()!;
        const slot = slotMap.get(key) ?? { startsAt: key, time: start.toFormat("HH:mm"), professionalIds: [] };
        slot.professionalIds.push(pro.id);
        slotMap.set(key, slot);
      }
    }
  }

  // "sem preferência" usa o primeiro da lista: quem tem menos clientes no dia vem antes (divide o movimento)
  const load = new Map<string, number>();
  for (const a of appointments) load.set(a.professionalId, (load.get(a.professionalId) ?? 0) + 1);
  const order = new Map(ids.map((id, i) => [id, i]));
  const byLoad = (a: string, b: string) => (load.get(a) ?? 0) - (load.get(b) ?? 0) || order.get(a)! - order.get(b)!;

  const slots = [...slotMap.values()]
    .map((s) => ({ ...s, professionalIds: s.professionalIds.sort(byLoad) }))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return { slots, durationMinutes: duration };
}
