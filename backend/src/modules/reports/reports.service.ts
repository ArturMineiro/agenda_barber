import { DateTime } from "luxon";
import type { Barbershop } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { badRequest } from "../../lib/errors";
import { startOfDayInZone } from "../../lib/time";

/**
 * Relatório de um período (datas no fuso da barbearia):
 * faturamento, atendimentos, ticket médio, faltas, clientes novos,
 * e a divisão por profissional, serviço e dia da semana.
 *
 * Agenda: conta como atendido o "concluído" e o "confirmado" cujo horário já passou
 * (muitos donos não marcam concluído). Fila: conta o que foi concluído.
 */

interface Row {
  done: boolean;
  noShow: boolean;
  canceled: boolean;
  canceledByClient: boolean;
  upcoming: boolean;
  at: Date;
  priceCents: number;
  professionalId: string;
  serviceId: string | null;
  clientPhone: string | null;
}

const MAX_DAYS = 366;

export async function buildReport(shop: Barbershop, fromKey: string, toKey: string, professionalId?: string) {
  const from = startOfDayInZone(fromKey, shop.timezone);
  const to = startOfDayInZone(toKey, shop.timezone).endOf("day");
  if (to < from) throw badRequest("A data final precisa ser depois da inicial");
  const days = Math.round(to.diff(from, "days").days); // quantidade de dias do período
  if (days > MAX_DAYS) throw badRequest("Escolha um período de até 1 ano");

  // período anterior para comparar: mês inteiro → mês anterior inteiro; senão, os N dias antes
  const wholeMonth = from.day === 1 && to.day === to.daysInMonth && from.hasSame(to, "month");
  const prevFrom = wholeMonth ? from.minus({ months: 1 }).startOf("month") : from.minus({ days }).startOf("day");
  const prevTo = from.minus({ milliseconds: 1 });

  const [rows, prevRows, professionals, services, ratings] = await Promise.all([
    loadRows(shop, from.toJSDate(), to.toJSDate(), professionalId),
    loadRows(shop, prevFrom.toJSDate(), prevTo.toJSDate(), professionalId),
    prisma.professional.findMany({ where: { barbershopId: shop.id }, select: { id: true, name: true } }),
    prisma.service.findMany({ where: { barbershopId: shop.id }, select: { id: true, name: true } }),
    prisma.review.groupBy({
      by: ["professionalId"],
      where: {
        barbershopId: shop.id,
        createdAt: { gte: from.toJSDate(), lte: to.toJSDate() },
        ...(professionalId ? { professionalId } : {}),
      },
      _avg: { rating: true },
      _count: true,
    }),
  ]);

  const done = rows.filter((r) => r.done);
  const noShow = rows.filter((r) => r.noShow).length;
  const revenueCents = sum(done);
  const upcoming = rows.filter((r) => r.upcoming);

  // clientes atendidos no período e quantos vieram pela primeira vez
  const phones = [...new Set(done.map((r) => r.clientPhone).filter((p): p is string => !!p))];
  const newClients = phones.length ? await countNewClients(shop, phones, from.toJSDate()) : 0;

  const proName = new Map(professionals.map((p) => [p.id, p.name]));
  const serviceName = new Map(services.map((s) => [s.id, s.name]));
  const ratingBy = new Map(ratings.map((r) => [r.professionalId, { average: round1(r._avg.rating ?? 0), count: r._count }]));

  const byProfessional = group(done, (r) => r.professionalId).map(([id, list]) => ({
    id,
    name: proName.get(id) ?? "Profissional removido",
    done: list.length,
    revenueCents: sum(list),
    rating: ratingBy.get(id) ?? null,
  }));

  const byService = group(done, (r) => r.serviceId ?? "none").map(([id, list]) => ({
    id,
    name: id === "none" ? "Sem serviço informado" : (serviceName.get(id) ?? "Serviço removido"),
    done: list.length,
    revenueCents: sum(list),
  }));

  const byWeekday = Array.from({ length: 7 }, (_, weekday) => {
    const list = done.filter((r) => DateTime.fromJSDate(r.at).setZone(shop.timezone).weekday % 7 === weekday);
    return { weekday, done: list.length, revenueCents: sum(list) };
  });

  const prevDone = prevRows.filter((r) => r.done);

  return {
    from: from.toISODate(),
    to: to.toISODate(),
    mode: shop.bookingMode,
    totals: {
      done: done.length,
      revenueCents,
      ticketCents: done.length ? Math.round(revenueCents / done.length) : 0,
      noShow,
      /** faltas sobre (atendidos + faltas) */
      noShowRate: done.length + noShow ? noShow / (done.length + noShow) : 0,
      canceled: rows.filter((r) => r.canceled).length,
      canceledByClient: rows.filter((r) => r.canceledByClient).length,
      clients: phones.length,
      newClients,
      upcoming: upcoming.length,
      upcomingRevenueCents: sum(upcoming),
    },
    previous: { from: prevFrom.toISODate(), to: prevTo.toISODate(), done: prevDone.length, revenueCents: sum(prevDone) },
    byProfessional: byProfessional.sort((a, b) => b.revenueCents - a.revenueCents || b.done - a.done),
    byService: byService.sort((a, b) => b.revenueCents - a.revenueCents || b.done - a.done),
    byWeekday,
  };
}

async function loadRows(shop: Barbershop, from: Date, to: Date, professionalId?: string): Promise<Row[]> {
  const pro = professionalId ? { professionalId } : {};
  if (shop.bookingMode === "QUEUE") {
    const entries = await prisma.queueEntry.findMany({
      where: { barbershopId: shop.id, joinedAt: { gte: from, lte: to }, ...pro },
      select: { status: true, joinedAt: true, priceCents: true, professionalId: true, serviceId: true, clientPhone: true },
    });
    return entries.map((e) => ({
      done: e.status === "DONE",
      noShow: e.status === "NO_SHOW",
      canceled: e.status === "CANCELED",
      canceledByClient: false,
      upcoming: false,
      at: e.joinedAt,
      priceCents: e.priceCents,
      professionalId: e.professionalId,
      serviceId: e.serviceId,
      clientPhone: e.clientPhone,
    }));
  }

  const now = new Date();
  const appts = await prisma.appointment.findMany({
    where: { barbershopId: shop.id, startsAt: { gte: from, lte: to }, ...pro },
    select: { status: true, startsAt: true, endsAt: true, priceCents: true, professionalId: true, serviceId: true, clientPhone: true, canceledBy: true },
  });
  return appts.map((a) => ({
    done: a.status === "COMPLETED" || (a.status === "CONFIRMED" && a.endsAt < now),
    noShow: a.status === "NO_SHOW",
    canceled: a.status === "CANCELED",
    canceledByClient: a.status === "CANCELED" && a.canceledBy === "client",
    upcoming: a.status === "CONFIRMED" && a.endsAt >= now,
    at: a.startsAt,
    priceCents: a.priceCents,
    professionalId: a.professionalId,
    serviceId: a.serviceId,
    clientPhone: a.clientPhone,
  }));
}

/** Telefones cuja primeira visita (agenda ou fila) foi dentro do período */
async function countNewClients(shop: Barbershop, phones: string[], from: Date) {
  const [fromAgenda, fromQueue] = await Promise.all([
    prisma.appointment.groupBy({
      by: ["clientPhone"],
      where: { barbershopId: shop.id, clientPhone: { in: phones }, status: { in: ["CONFIRMED", "COMPLETED"] } },
      _min: { startsAt: true },
    }),
    prisma.queueEntry.groupBy({
      by: ["clientPhone"],
      where: { barbershopId: shop.id, clientPhone: { in: phones }, status: "DONE" },
      _min: { joinedAt: true },
    }),
  ]);
  const first = new Map<string, Date>();
  const keep = (phone: string | null, d: Date | null) => {
    if (!phone || !d) return;
    const cur = first.get(phone);
    if (!cur || d < cur) first.set(phone, d);
  };
  for (const r of fromAgenda) keep(r.clientPhone, r._min.startsAt);
  for (const r of fromQueue) keep(r.clientPhone, r._min.joinedAt);
  return phones.filter((p) => (first.get(p) ?? from) >= from).length;
}

const sum = (list: { priceCents: number }[]) => list.reduce((s, r) => s + r.priceCents, 0);
const round1 = (n: number) => Math.round(n * 10) / 10;

function group<T>(list: T[], key: (t: T) => string): [string, T[]][] {
  const map = new Map<string, T[]>();
  for (const item of list) {
    const k = key(item);
    const arr = map.get(k);
    if (arr) arr.push(item);
    else map.set(k, [item]);
  }
  return [...map.entries()];
}
