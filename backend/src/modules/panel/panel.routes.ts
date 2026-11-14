import { Router, type Request } from "express";
import { DateTime } from "luxon";
import { z } from "zod";
import {
  agendaQuerySchema,
  cancelAppointmentSchema,
  dateStringSchema,
  availabilityQuerySchema,
  barbershopSettingsSchema,
  manualAppointmentSchema,
  professionalSchema,
  reviewVisibilitySchema,
  serviceSchema,
  timeOffSchema,
  updateAppointmentStatusSchema,
  workingHoursSchema,
} from "@navalha/shared";
import { prisma } from "../../lib/prisma";
import { env } from "../../config/env";
import { badRequest, conflict, forbidden, notFound } from "../../lib/errors";
import { startOfDayInZone } from "../../lib/time";
import { loadOwnerBarbershop, requireAuth, requireRole } from "../../middlewares/auth";
import { isSlugAvailable } from "../auth/auth.service";
import { BLOCKING_STATUSES, getAvailability } from "../scheduling/availability.service";
import { assertSlotFree, createAppointment, inSlotTransaction } from "../scheduling/booking.service";
import { deleteImage } from "../uploads/uploads.service";
import { listReminders, markReminderSent } from "../reminders/reminders.service";

export const panelRoutes = Router();
panelRoutes.use(requireAuth, requireRole("OWNER"), loadOwnerBarbershop);

const shop = (req: Request) => req.barbershop!;

// ---------- Barbearia ----------

panelRoutes.get("/barbershop", async (req, res) => {
  const barbershop = await prisma.barbershop.findUnique({
    where: { id: shop(req).id },
    include: {
      subscription: {
        include: {
          plan: true,
          payments: { where: { status: { in: ["PENDING", "OVERDUE"] } }, orderBy: { dueDate: "asc" } },
        },
      },
      _count: { select: { professionals: { where: { active: true } } } },
    },
  });
  res.json(barbershop);
});

panelRoutes.put("/barbershop", async (req, res) => {
  const input = barbershopSettingsSchema.parse(req.body);
  if (!(await isSlugAvailable(input.slug, shop(req).id))) throw conflict("Este link já está em uso", "SLUG_TAKEN");
  const before = shop(req);

  // no modo fila a agenda some do painel: clientes já marcados ficariam "invisíveis" para o dono
  if (before.bookingMode === "SCHEDULE" && input.bookingMode === "QUEUE") {
    const future = await prisma.appointment.count({
      where: { barbershopId: before.id, status: "CONFIRMED", startsAt: { gte: new Date() } },
    });
    if (future > 0) {
      throw conflict(
        `Você tem ${future} agendamento(s) marcado(s) daqui pra frente. Atenda ou desmarque antes de mudar para ordem de chegada.`,
        "HAS_FUTURE_APPOINTMENTS",
      );
    }
  }
  const updated = await prisma.barbershop.update({ where: { id: before.id }, data: input });
  // imagem trocada ou removida: apaga o arquivo antigo do disco
  if (before.logoUrl !== updated.logoUrl) await deleteImage(before.logoUrl, before.id);
  if (before.coverUrl !== updated.coverUrl) await deleteImage(before.coverUrl, before.id);
  res.json(updated);
});

// ---------- Dashboard ----------

panelRoutes.get("/dashboard", async (req, res) => {
  const b = shop(req);
  const now = DateTime.now().setZone(b.timezone);
  const todayStart = now.startOf("day").toJSDate();
  const todayEnd = now.endOf("day").toJSDate();
  const monthStart = now.startOf("month").toJSDate();

  // ordem de chegada: números vêm da fila (atendidos), não da agenda
  if (b.bookingMode === "QUEUE") {
    const [today, month] = await Promise.all([
      prisma.queueEntry.aggregate({
        where: { barbershopId: b.id, joinedAt: { gte: todayStart }, status: { in: ["DONE", "IN_SERVICE", "WAITING"] } },
        _count: true,
        _sum: { priceCents: true },
      }),
      prisma.queueEntry.aggregate({
        where: { barbershopId: b.id, joinedAt: { gte: monthStart }, status: "DONE" },
        _count: true,
        _sum: { priceCents: true },
      }),
    ]);
    return res.json({
      today: { count: today._count, revenueCents: today._sum.priceCents ?? 0 },
      month: { count: month._count, revenueCents: month._sum.priceCents ?? 0 },
      upcoming: [],
    });
  }

  const notCanceled = { status: { not: "CANCELED" as const } };
  const [today, month, upcoming] = await Promise.all([
    prisma.appointment.aggregate({
      where: { barbershopId: b.id, startsAt: { gte: todayStart, lte: todayEnd }, ...notCanceled },
      _count: true,
      _sum: { priceCents: true },
    }),
    prisma.appointment.aggregate({
      where: { barbershopId: b.id, startsAt: { gte: monthStart, lte: now.toJSDate() }, status: { in: ["CONFIRMED", "COMPLETED"] } },
      _count: true,
      _sum: { priceCents: true },
    }),
    prisma.appointment.findMany({
      where: { barbershopId: b.id, startsAt: { gte: now.toJSDate() }, status: "CONFIRMED" },
      orderBy: { startsAt: "asc" },
      take: 5,
      include: { service: { select: { name: true } }, professional: { select: { name: true } } },
    }),
  ]);

  res.json({
    today: { count: today._count, revenueCents: today._sum.priceCents ?? 0 },
    month: { count: month._count, revenueCents: month._sum.priceCents ?? 0 },
    upcoming,
  });
});

// ---------- Serviços ----------

panelRoutes.get("/services", async (req, res) => {
  res.json(
    await prisma.service.findMany({
      where: { barbershopId: shop(req).id },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      include: { photos: { orderBy: [{ position: "asc" }, { createdAt: "asc" }], select: { id: true, url: true, thumbUrl: true } } },
    }),
  );
});

panelRoutes.post("/services", async (req, res) => {
  const input = serviceSchema.parse(req.body);
  const barbershopId = shop(req).id;
  const [position, pros] = await Promise.all([
    prisma.service.count({ where: { barbershopId } }),
    prisma.professional.findMany({ where: { barbershopId, active: true }, select: { id: true } }),
  ]);
  // já entra para os profissionais ativos: serviço sem ninguém que faça não aparece na página pública.
  // Na equipe, o dono tira de quem não faz em Equipe → Editar.
  const service = await prisma.service.create({
    data: { ...input, barbershopId, position, professionals: { create: pros.map((p) => ({ professionalId: p.id })) } },
  });
  res.status(201).json(service);
});

async function findOwnService(req: Request) {
  const service = await prisma.service.findFirst({ where: { id: String(req.params.id), barbershopId: shop(req).id } });
  if (!service) throw notFound("Serviço não encontrado");
  return service;
}

panelRoutes.put("/services/:id", async (req, res) => {
  const service = await findOwnService(req);
  const input = serviceSchema.parse(req.body);
  res.json(await prisma.service.update({ where: { id: service.id }, data: input }));
});

panelRoutes.delete("/services/:id", async (req, res) => {
  const service = await findOwnService(req);
  const [appointments, queueEntries] = await Promise.all([
    prisma.appointment.count({ where: { serviceId: service.id } }),
    prisma.queueEntry.count({ where: { serviceId: service.id } }),
  ]);
  // com histórico (agenda ou fila), apenas desativa para não quebrar relatórios
  if (appointments + queueEntries > 0) await prisma.service.update({ where: { id: service.id }, data: { active: false } });
  else {
    // apaga também os arquivos das fotos (os registros saem em cascata)
    const photos = await prisma.servicePhoto.findMany({ where: { serviceId: service.id } });
    await prisma.service.delete({ where: { id: service.id } });
    await Promise.all(photos.flatMap((p) => [deleteImage(p.url, service.barbershopId), deleteImage(p.thumbUrl, service.barbershopId)]));
  }
  res.status(204).end();
});

// ---------- Profissionais ----------

async function assertProfessionalLimit(req: Request, excludeId?: string) {
  const sub = await prisma.subscription.findUnique({
    where: { barbershopId: shop(req).id },
    include: { plan: true },
  });
  const max = sub?.plan.maxProfessionals ?? (shop(req).teamType === "SOLO" ? 1 : null);
  if (max === null) return;
  const active = await prisma.professional.count({
    where: { barbershopId: shop(req).id, active: true, ...(excludeId ? { id: { not: excludeId } } : {}) },
  });
  if (active >= max) {
    throw forbidden(
      `Seu plano permite ${max} profissional(is) ativo(s). Fale com o suporte${supportSuffix()} para fazer upgrade.`,
    );
  }
}

const professionalInclude = {
  services: { select: { serviceId: true } },
  workingHours: { orderBy: [{ weekday: "asc" as const }, { startMinute: "asc" as const }] },
};

panelRoutes.get("/professionals", async (req, res) => {
  const pros = await prisma.professional.findMany({
    where: { barbershopId: shop(req).id },
    orderBy: { createdAt: "asc" },
    include: professionalInclude,
  });
  res.json(pros.map(({ services, ...p }) => ({ ...p, serviceIds: services.map((s) => s.serviceId) })));
});

async function assertOwnServices(req: Request, ids: string[]) {
  if (!ids.length) return;
  const count = await prisma.service.count({ where: { id: { in: ids }, barbershopId: shop(req).id } });
  if (count !== new Set(ids).size) throw badRequest("Serviço inválido");
}

panelRoutes.post("/professionals", async (req, res) => {
  const { serviceIds, ...data } = professionalSchema.parse(req.body);
  if (data.active) await assertProfessionalLimit(req);
  await assertOwnServices(req, serviceIds);
  const pro = await prisma.professional.create({
    data: {
      ...data,
      barbershopId: shop(req).id,
      services: { create: serviceIds.map((serviceId) => ({ serviceId })) },
    },
  });
  res.status(201).json(pro);
});

async function findOwnProfessional(req: Request) {
  const pro = await prisma.professional.findFirst({ where: { id: String(req.params.id), barbershopId: shop(req).id } });
  if (!pro) throw notFound("Profissional não encontrado");
  return pro;
}

panelRoutes.put("/professionals/:id", async (req, res) => {
  const pro = await findOwnProfessional(req);
  const { serviceIds, ...data } = professionalSchema.parse(req.body);
  if (data.active && !pro.active) await assertProfessionalLimit(req, pro.id);
  await assertOwnServices(req, serviceIds);

  await prisma.$transaction([
    prisma.professional.update({ where: { id: pro.id }, data }),
    prisma.professionalService.deleteMany({ where: { professionalId: pro.id } }),
    prisma.professionalService.createMany({
      data: serviceIds.map((serviceId) => ({ professionalId: pro.id, serviceId })),
    }),
  ]);
  if (pro.avatarUrl !== (data.avatarUrl ?? null)) await deleteImage(pro.avatarUrl, shop(req).id);
  res.json({ ok: true });
});

panelRoutes.delete("/professionals/:id", async (req, res) => {
  const pro = await findOwnProfessional(req);
  // com histórico (agenda ou fila), só desativa: apagar levaria junto atendimentos e faturamento
  const [appointments, queueEntries] = await Promise.all([
    prisma.appointment.count({ where: { professionalId: pro.id } }),
    prisma.queueEntry.count({ where: { professionalId: pro.id } }),
  ]);
  if (appointments + queueEntries > 0) await prisma.professional.update({ where: { id: pro.id }, data: { active: false } });
  else {
    await prisma.professional.delete({ where: { id: pro.id } });
    await deleteImage(pro.avatarUrl, shop(req).id);
  }
  res.status(204).end();
});

panelRoutes.put("/professionals/:id/hours", async (req, res) => {
  const pro = await findOwnProfessional(req);
  const { hours } = workingHoursSchema.parse(req.body);
  await prisma.$transaction([
    prisma.workingHour.deleteMany({ where: { professionalId: pro.id } }),
    prisma.workingHour.createMany({ data: hours.map((h) => ({ ...h, professionalId: pro.id })) }),
  ]);
  res.json({ ok: true });
});

// ---------- Bloqueios ----------

panelRoutes.get("/time-offs", async (req, res) => {
  res.json(
    await prisma.timeOff.findMany({
      where: { professional: { barbershopId: shop(req).id }, endsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      include: { professional: { select: { name: true } } },
    }),
  );
});

panelRoutes.post("/time-offs", async (req, res) => {
  const input = timeOffSchema.parse(req.body);
  const pro = await prisma.professional.findFirst({
    where: { id: input.professionalId, barbershopId: shop(req).id },
  });
  if (!pro) throw notFound("Profissional não encontrado");
  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);
  const [timeOff, conflicts] = await Promise.all([
    prisma.timeOff.create({ data: { professionalId: pro.id, startsAt, endsAt, reason: input.reason ?? null } }),
    // a folga não desmarca ninguém sozinha: avisa quantos clientes já estavam marcados no período
    prisma.appointment.count({
      where: { professionalId: pro.id, status: "CONFIRMED", startsAt: { lt: endsAt }, endsAt: { gt: startsAt } },
    }),
  ]);
  res.status(201).json({ ...timeOff, conflicts });
});

panelRoutes.delete("/time-offs/:id", async (req, res) => {
  const { count } = await prisma.timeOff.deleteMany({
    where: { id: req.params.id, professional: { barbershopId: shop(req).id } },
  });
  if (!count) throw notFound();
  res.status(204).end();
});

// ---------- Agenda ----------

panelRoutes.get("/appointments", async (req, res) => {
  const { date, professionalId, days } = agendaQuerySchema.parse(req.query);
  const day = startOfDayInZone(date, shop(req).timezone);
  const last = day.plus({ days: days - 1 }).endOf("day");
  res.json(
    await prisma.appointment.findMany({
      where: {
        barbershopId: shop(req).id,
        startsAt: { gte: day.toJSDate(), lte: last.toJSDate() },
        ...(professionalId ? { professionalId } : {}),
      },
      orderBy: { startsAt: "asc" },
      include: {
        service: { select: { name: true, durationMinutes: true } },
        professional: { select: { name: true } },
      },
    }),
  );
});

panelRoutes.get("/availability", async (req, res) => {
  const query = availabilityQuerySchema.parse(req.query);
  res.json(await getAvailability({ barbershop: shop(req), ...query, ignoreBookingWindow: true }));
});

panelRoutes.post("/appointments", async (req, res) => {
  const input = manualAppointmentSchema.parse(req.body);
  res.status(201).json(await createAppointment({ barbershop: shop(req), input, source: "panel" }));
});

panelRoutes.patch("/appointments/:id/status", async (req, res) => {
  const { status } = updateAppointmentStatusSchema.parse(req.body);
  const appt = await prisma.appointment.findFirst({ where: { id: String(req.params.id), barbershopId: shop(req).id } });
  if (!appt) throw notFound("Agendamento não encontrado");

  const data =
    status === "CANCELED"
      ? { status, canceledAt: new Date(), canceledBy: "barbershop" }
      : { status, canceledAt: null, canceledBy: null, cancelReason: null };

  // cancelado/"não veio" liberou a cadeira: ao voltar a ocupar, não pode bater com quem entrou no lugar
  const reoccupies = BLOCKING_STATUSES.includes(status) && !BLOCKING_STATUSES.includes(appt.status);
  if (!reoccupies) {
    await prisma.appointment.update({ where: { id: appt.id }, data });
    return res.json({ ok: true });
  }
  await inSlotTransaction(async (tx) => {
    await assertSlotFree(tx, {
      professionalId: appt.professionalId,
      startsAt: appt.startsAt,
      endsAt: appt.endsAt,
      ignoreAppointmentId: appt.id,
      message: "Outro cliente já está nesse horário. Remarque um dos dois antes.",
    });
    await tx.appointment.update({ where: { id: appt.id }, data });
  });
  res.json({ ok: true });
});

// ---------- Lembretes (dia seguinte) ----------

panelRoutes.get("/reminders", async (req, res) => {
  const { date } = z.object({ date: dateStringSchema.optional() }).parse(req.query);
  res.json(await listReminders(shop(req), date));
});

/** O dono abriu o WhatsApp com o lembrete: marca como lembrado */
panelRoutes.post("/appointments/:id/reminder", async (req, res) => {
  await markReminderSent(shop(req).id, String(req.params.id));
  res.json({ ok: true });
});

/** Dono desmarca, com motivo (vai na mensagem de aviso ao cliente) */
panelRoutes.post("/appointments/:id/cancel", async (req, res) => {
  const { reason } = cancelAppointmentSchema.parse(req.body);
  const { count } = await prisma.appointment.updateMany({
    where: { id: String(req.params.id), barbershopId: shop(req).id, status: { not: "CANCELED" } },
    data: { status: "CANCELED", canceledAt: new Date(), canceledBy: "barbershop", cancelReason: reason ?? null },
  });
  if (!count) throw notFound("Agendamento não encontrado ou já cancelado");
  res.json({ ok: true });
});

/** Histórico de clientes (agrupado por telefone), somando agenda e fila */
panelRoutes.get("/clients", async (req, res) => {
  const { q } = z.object({ q: z.string().trim().optional() }).parse(req.query);
  // telefone fica salvo só com dígitos: "(11) 9999" também precisa achar
  const digits = q?.replace(/\D/g, "") ?? "";
  const search = q
    ? {
        OR: [
          { clientName: { contains: q, mode: "insensitive" as const } },
          ...(digits ? [{ clientPhone: { contains: digits } }] : []),
        ],
      }
    : {};

  const [fromAgenda, fromQueue] = await Promise.all([
    prisma.appointment.groupBy({
      by: ["clientPhone"],
      // falta e cancelamento não contam como visita nem somam no total gasto
      where: { barbershopId: shop(req).id, status: { in: ["CONFIRMED", "COMPLETED"] }, ...search },
      _count: true,
      _max: { startsAt: true, clientName: true },
      _sum: { priceCents: true },
    }),
    // na fila o telefone é opcional: só entra no histórico quem informou
    prisma.queueEntry.groupBy({
      by: ["clientPhone"],
      where: { barbershopId: shop(req).id, status: "DONE", clientPhone: { not: null }, ...search },
      _count: true,
      _max: { joinedAt: true, clientName: true },
      _sum: { priceCents: true },
    }),
  ]);

  const byPhone = new Map<string, { phone: string; name: string | null; visits: number; lastVisit: Date; totalCents: number }>();
  const add = (phone: string, name: string | null, visits: number, last: Date | null, total: number | null) => {
    const cur = byPhone.get(phone);
    const lastVisit = last ?? new Date(0);
    if (!cur) return byPhone.set(phone, { phone, name, visits, lastVisit, totalCents: total ?? 0 });
    cur.visits += visits;
    cur.totalCents += total ?? 0;
    if (lastVisit > cur.lastVisit) Object.assign(cur, { lastVisit, name: name ?? cur.name });
  };
  for (const r of fromAgenda) add(r.clientPhone, r._max.clientName, r._count, r._max.startsAt, r._sum.priceCents);
  for (const r of fromQueue) add(r.clientPhone!, r._max.clientName, r._count, r._max.joinedAt, r._sum.priceCents);

  res.json([...byPhone.values()].sort((a, b) => b.lastVisit.getTime() - a.lastVisit.getTime()).slice(0, 100));
});

/** " no WhatsApp (21) 96735-5884" quando o número do suporte está configurado */
function supportSuffix() {
  const d = env.SUPPORT_WHATSAPP;
  if (d.length === 11) return ` no WhatsApp (${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  return d ? ` no WhatsApp ${d}` : "";
}

// ---------- Avaliações ----------

/** Todas as avaliações (inclusive ocultas), com média e distribuição de estrelas */
panelRoutes.get("/reviews", async (req, res) => {
  const where = { barbershopId: shop(req).id };
  const [reviews, stats, dist] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        service: { select: { name: true } },
        professional: { select: { name: true } },
        appointment: { select: { startsAt: true, clientPhone: true } },
      },
    }),
    prisma.review.aggregate({ where, _avg: { rating: true }, _count: true }),
    prisma.review.groupBy({ by: ["rating"], where, _count: true }),
  ]);
  res.json({
    average: stats._count ? Math.round((stats._avg.rating ?? 0) * 10) / 10 : null,
    count: stats._count,
    distribution: Object.fromEntries([1, 2, 3, 4, 5].map((n) => [n, dist.find((d) => d.rating === n)?._count ?? 0])),
    reviews,
  });
});

panelRoutes.patch("/reviews/:id", async (req, res) => {
  const { hidden } = reviewVisibilitySchema.parse(req.body);
  const { count } = await prisma.review.updateMany({ where: { id: String(req.params.id), barbershopId: shop(req).id }, data: { hidden } });
  if (!count) throw notFound("Avaliação não encontrada");
  res.json({ ok: true });
});
