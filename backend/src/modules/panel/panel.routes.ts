import { Router, type Request } from "express";
import { DateTime } from "luxon";
import { z } from "zod";
import {
  agendaQuerySchema,
  cancelAppointmentSchema,
  availabilityQuerySchema,
  barbershopSettingsSchema,
  manualAppointmentSchema,
  professionalSchema,
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
import { getAvailability } from "../scheduling/availability.service";
import { createAppointment } from "../scheduling/booking.service";
import { deleteImage } from "../uploads/uploads.service";

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
  const position = await prisma.service.count({ where: { barbershopId: shop(req).id } });
  const service = await prisma.service.create({ data: { ...input, barbershopId: shop(req).id, position } });

  // barbearia solo: o serviço já entra para o único profissional
  if (shop(req).teamType === "SOLO") {
    const pros = await prisma.professional.findMany({ where: { barbershopId: shop(req).id }, select: { id: true } });
    await prisma.professionalService.createMany({
      data: pros.map((p) => ({ professionalId: p.id, serviceId: service.id })),
      skipDuplicates: true,
    });
  }
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
  const used = await prisma.appointment.count({ where: { serviceId: service.id } });
  // com histórico, apenas desativa para não quebrar relatórios
  if (used > 0) await prisma.service.update({ where: { id: service.id }, data: { active: false } });
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
  const used = await prisma.appointment.count({ where: { professionalId: pro.id } });
  if (used > 0) await prisma.professional.update({ where: { id: pro.id }, data: { active: false } });
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
  res.status(201).json(
    await prisma.timeOff.create({
      data: {
        professionalId: pro.id,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        reason: input.reason ?? null,
      },
    }),
  );
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
  const { date, professionalId } = agendaQuerySchema.parse(req.query);
  const day = startOfDayInZone(date, shop(req).timezone);
  res.json(
    await prisma.appointment.findMany({
      where: {
        barbershopId: shop(req).id,
        startsAt: { gte: day.toJSDate(), lte: day.endOf("day").toJSDate() },
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
  const { count } = await prisma.appointment.updateMany({
    where: { id: req.params.id, barbershopId: shop(req).id },
    data:
      status === "CANCELED"
        ? { status, canceledAt: new Date(), canceledBy: "barbershop" }
        : { status, canceledAt: null, canceledBy: null, cancelReason: null },
  });
  if (!count) throw notFound("Agendamento não encontrado");
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
  const search = q ? { OR: [{ clientName: { contains: q, mode: "insensitive" as const } }, { clientPhone: { contains: q } }] } : {};

  const [fromAgenda, fromQueue] = await Promise.all([
    prisma.appointment.groupBy({
      by: ["clientPhone"],
      where: { barbershopId: shop(req).id, status: { not: "CANCELED" }, ...search },
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
