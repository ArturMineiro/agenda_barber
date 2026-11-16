import { Router } from "express";
import { DateTime } from "luxon";
import { z } from "zod";
import {
  approveBarbershopSchema,
  BARBERSHOP_STATUS,
  changeSubscriptionSchema,
  markPaymentPaidSchema,
  PAYMENT_STATUS,
  planSchema,
  rejectBarbershopSchema,
} from "@navalha/shared";
import { prisma } from "../../lib/prisma";
import { badRequest, notFound } from "../../lib/errors";
import { DEFAULT_TZ } from "../../lib/time";
import { requireAuth, requireRole } from "../../middlewares/auth";
import { refreshSubscriptionStanding, syncBilling } from "../billing/billing.service";
import { setTemporaryPassword } from "../auth/auth.service";

export const adminRoutes = Router();
adminRoutes.use(requireAuth, requireRole("SUPER_ADMIN"));

const ownerSelect = { select: { id: true, name: true, email: true, phone: true } } as const;

// ---------- Visão geral ----------

adminRoutes.get("/stats", async (_req, res) => {
  const [byStatus, mrr, overdue, paidThisMonth] = await Promise.all([
    prisma.barbershop.groupBy({ by: ["status"], _count: true }),
    prisma.subscription.aggregate({
      where: { status: { in: ["ACTIVE", "PAST_DUE"] }, barbershop: { status: "ACTIVE" } },
      _sum: { priceCents: true },
    }),
    prisma.payment.aggregate({ where: { status: "OVERDUE" }, _sum: { amountCents: true }, _count: true }),
    prisma.payment.aggregate({
      // início do mês no horário de Brasília (o servidor roda em UTC)
      where: { status: "PAID", paidAt: { gte: DateTime.now().setZone(DEFAULT_TZ).startOf("month").toJSDate() } },
      _sum: { amountCents: true },
    }),
  ]);

  const counts = Object.fromEntries(BARBERSHOP_STATUS.map((s) => [s, 0])) as Record<string, number>;
  for (const row of byStatus) counts[row.status] = row._count;

  res.json({
    barbershops: counts,
    mrrCents: mrr._sum.priceCents ?? 0,
    overdueCount: overdue._count,
    overdueCents: overdue._sum.amountCents ?? 0,
    receivedThisMonthCents: paidThisMonth._sum.amountCents ?? 0,
  });
});

// ---------- Barbearias ----------

adminRoutes.get("/barbershops", async (req, res) => {
  const query = z
    .object({ status: z.enum(BARBERSHOP_STATUS).optional(), q: z.string().trim().optional() })
    .parse(req.query);

  const barbershops = await prisma.barbershop.findMany({
    where: {
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" } },
              { slug: { contains: query.q, mode: "insensitive" } },
              { owner: { email: { contains: query.q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      owner: ownerSelect,
      subscription: { include: { plan: true } },
      _count: { select: { professionals: { where: { active: true } } } },
    },
  });

  const overdue = await prisma.payment.groupBy({
    by: ["subscriptionId"],
    where: { status: "OVERDUE" },
    _count: true,
  });
  const overdueBySub = new Map(overdue.map((o) => [o.subscriptionId, o._count]));

  res.json(
    barbershops.map((b) => ({
      ...b,
      overduePayments: b.subscription ? (overdueBySub.get(b.subscription.id) ?? 0) : 0,
    })),
  );
});

adminRoutes.get("/barbershops/:id", async (req, res) => {
  const barbershop = await prisma.barbershop.findUnique({
    where: { id: req.params.id },
    include: {
      owner: ownerSelect,
      subscription: { include: { plan: true, payments: { orderBy: { dueDate: "desc" } } } },
      _count: { select: { professionals: { where: { active: true } }, services: true, appointments: true } },
    },
  });
  if (!barbershop) throw notFound("Barbearia não encontrada");
  res.json(barbershop);
});

async function assertPlanFits(barbershopId: string, planId: string) {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) throw notFound("Plano não encontrado");
  if (plan.maxProfessionals !== null) {
    const active = await prisma.professional.count({ where: { barbershopId, active: true } });
    if (active > plan.maxProfessionals) {
      throw badRequest(
        `A barbearia tem ${active} profissionais ativos e o plano ${plan.name} permite ${plan.maxProfessionals}`,
      );
    }
  }
  return plan;
}

adminRoutes.post("/barbershops/:id/approve", async (req, res) => {
  const input = approveBarbershopSchema.parse(req.body);
  const barbershop = await prisma.barbershop.findUnique({ where: { id: req.params.id } });
  if (!barbershop) throw notFound("Barbearia não encontrada");
  if (barbershop.status !== "PENDING" && barbershop.status !== "REJECTED") {
    throw badRequest("Só é possível aprovar barbearias pendentes ou recusadas");
  }
  const plan = await assertPlanFits(barbershop.id, input.planId);

  const now = new Date();
  const trialEndsAt = input.trialDays > 0 ? DateTime.now().plus({ days: input.trialDays }).toJSDate() : null;
  const subData = {
    planId: plan.id,
    priceCents: input.priceCents ?? plan.priceCents,
    billingDay: input.billingDay,
    status: trialEndsAt ? ("TRIAL" as const) : ("ACTIVE" as const),
    trialEndsAt,
    startedAt: now,
    canceledAt: null,
  };

  await prisma.$transaction([
    prisma.barbershop.update({
      where: { id: barbershop.id },
      data: { status: "ACTIVE", approvedAt: now, statusReason: null },
    }),
    prisma.subscription.upsert({
      where: { barbershopId: barbershop.id },
      create: { barbershopId: barbershop.id, ...subData },
      update: subData,
    }),
  ]);
  await syncBilling();
  res.json({ ok: true });
});

adminRoutes.post("/barbershops/:id/reject", async (req, res) => {
  const { reason } = rejectBarbershopSchema.parse(req.body);
  await prisma.barbershop.update({
    where: { id: req.params.id },
    data: { status: "REJECTED", statusReason: reason ?? null },
  });
  res.json({ ok: true });
});

adminRoutes.post("/barbershops/:id/suspend", async (req, res) => {
  const { reason } = rejectBarbershopSchema.parse(req.body);
  await prisma.barbershop.update({
    where: { id: req.params.id },
    data: { status: "SUSPENDED", statusReason: reason ?? "Suspensa pelo administrador" },
  });
  res.json({ ok: true });
});

adminRoutes.post("/barbershops/:id/reactivate", async (req, res) => {
  const barbershop = await prisma.barbershop.findUnique({
    where: { id: req.params.id },
    include: { subscription: true },
  });
  if (!barbershop) throw notFound("Barbearia não encontrada");
  if (!barbershop.subscription) throw badRequest("Aprove a barbearia e defina um plano primeiro");
  await prisma.barbershop.update({
    where: { id: barbershop.id },
    data: { status: "ACTIVE", statusReason: null },
  });
  res.json({ ok: true });
});

/** "Esqueci minha senha": o admin gera uma senha temporária e manda para o dono pelo WhatsApp */
adminRoutes.post("/barbershops/:id/owner-password", async (req, res) => {
  const barbershop = await prisma.barbershop.findUnique({ where: { id: req.params.id }, select: { owner: ownerSelect } });
  if (!barbershop) throw notFound("Barbearia não encontrada");
  const tempPassword = await setTemporaryPassword(barbershop.owner.id);
  res.json({ tempPassword, owner: barbershop.owner });
});

adminRoutes.put("/barbershops/:id/subscription", async (req, res) => {
  const input = changeSubscriptionSchema.parse(req.body);
  const sub = await prisma.subscription.findUnique({ where: { barbershopId: req.params.id } });
  if (!sub) throw notFound("Assinatura não encontrada");
  const plan = await assertPlanFits(req.params.id, input.planId);

  await prisma.subscription.update({
    where: { id: sub.id },
    data: { planId: plan.id, priceCents: input.priceCents ?? plan.priceCents, billingDay: input.billingDay },
  });
  res.json({ ok: true });
});

// ---------- Mensalidades ----------

adminRoutes.get("/payments", async (req, res) => {
  const { status } = z.object({ status: z.enum(PAYMENT_STATUS).optional() }).parse(req.query);
  const payments = await prisma.payment.findMany({
    where: status ? { status } : {},
    orderBy: { dueDate: status === "PAID" ? "desc" : "asc" },
    take: 200,
    include: {
      subscription: {
        select: {
          plan: { select: { name: true } },
          barbershop: { select: { id: true, name: true, slug: true, status: true, owner: ownerSelect } },
        },
      },
    },
  });
  res.json(payments);
});

adminRoutes.post("/payments/:id/pay", async (req, res) => {
  const input = markPaymentPaidSchema.parse(req.body);
  const payment = await prisma.payment.update({
    where: { id: req.params.id },
    data: { status: "PAID", paidAt: new Date(), method: input.method, notes: input.notes ?? null },
  });
  await refreshSubscriptionStanding(payment.subscriptionId);
  res.json(payment);
});

/** Abona / cancela uma cobrança */
adminRoutes.post("/payments/:id/cancel", async (req, res) => {
  const payment = await prisma.payment.update({
    where: { id: req.params.id },
    data: { status: "CANCELED" },
  });
  await refreshSubscriptionStanding(payment.subscriptionId);
  res.json(payment);
});

adminRoutes.post("/billing/sync", async (_req, res) => {
  res.json(await syncBilling());
});

// ---------- Planos ----------

adminRoutes.get("/plans", async (_req, res) => {
  const plans = await prisma.plan.findMany({
    orderBy: { priceCents: "asc" },
    include: { _count: { select: { subscriptions: true } } },
  });
  res.json(plans);
});

adminRoutes.post("/plans", async (req, res) => {
  const input = planSchema.parse(req.body);
  res.status(201).json(await prisma.plan.create({ data: input }));
});

adminRoutes.put("/plans/:id", async (req, res) => {
  const input = planSchema.parse(req.body);
  res.json(await prisma.plan.update({ where: { id: req.params.id }, data: input }));
});

// ---------- Log de atividades ----------

const activityQuerySchema = z.object({
  /** paginação: traz o que veio antes desta data */
  before: z.iso.datetime({ offset: true }).optional(),
  /** OWNER | BARBER | SUPER_ADMIN | CLIENT */
  role: z.string().trim().optional(),
  /** só logins (inclusive os que falharam) */
  kind: z.enum(["all", "auth", "admin", "changes", "clients"]).default("all"),
  q: z.string().trim().optional(),
  barbershopId: z.string().optional(),
});

const KIND_FILTER = {
  all: {},
  auth: { action: { startsWith: "auth." } },
  admin: { actorRole: "SUPER_ADMIN" },
  changes: { action: { startsWith: "panel." } },
  clients: { actorRole: "CLIENT" },
} as const;

async function listActivity(query: z.infer<typeof activityQuerySchema>) {
  const PAGE = 50;
  const rows = await prisma.auditLog.findMany({
    where: {
      ...(query.barbershopId ? { barbershopId: query.barbershopId } : {}),
      ...(query.before ? { createdAt: { lt: new Date(query.before) } } : {}),
      ...(query.role ? { actorRole: query.role } : {}),
      ...KIND_FILTER[query.kind],
      ...(query.q
        ? {
            OR: [
              { summary: { contains: query.q, mode: "insensitive" as const } },
              { actorName: { contains: query.q, mode: "insensitive" as const } },
              { ip: { contains: query.q } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: PAGE + 1,
    include: { barbershop: { select: { id: true, name: true } } },
  });
  const items = rows.slice(0, PAGE);
  return { items, nextBefore: rows.length > PAGE ? items.at(-1)!.createdAt.toISOString() : null };
}

/** Tudo que aconteceu na plataforma (ou numa barbearia, com ?barbershopId=) */
adminRoutes.get("/activity", async (req, res) => {
  res.json(await listActivity(activityQuerySchema.parse(req.query)));
});

adminRoutes.get("/barbershops/:id/activity", async (req, res) => {
  res.json(await listActivity(activityQuerySchema.parse({ ...req.query, barbershopId: req.params.id })));
});

/** Resumo para o suporte: último acesso de cada pessoa, movimento recente e equipe com login */
adminRoutes.get("/barbershops/:id/insights", async (req, res) => {
  const shop = await prisma.barbershop.findUnique({ where: { id: req.params.id }, select: { id: true, ownerId: true, createdAt: true } });
  if (!shop) throw notFound("Barbearia não encontrada");
  const now = new Date();
  const since30 = DateTime.now().minus({ days: 30 }).toJSDate();
  const since7 = DateTime.now().minus({ days: 7 }).toJSDate();

  const [pros, clients, last30, upcoming, reviews, lastActivity, failed7] = await Promise.all([
    prisma.professional.findMany({
      where: { barbershopId: shop.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, active: true, user: { select: { id: true, email: true, mustChangePassword: true } } },
    }),
    prisma.appointment.groupBy({ by: ["clientPhone"], where: { barbershopId: shop.id } }),
    prisma.appointment.groupBy({
      by: ["status"],
      where: { barbershopId: shop.id, startsAt: { gte: since30, lte: now } },
      _count: true,
      _sum: { priceCents: true },
    }),
    prisma.appointment.count({ where: { barbershopId: shop.id, startsAt: { gt: now }, status: "CONFIRMED" } }),
    prisma.review.aggregate({ where: { barbershopId: shop.id }, _avg: { rating: true }, _count: true }),
    prisma.auditLog.findFirst({ where: { barbershopId: shop.id }, orderBy: { createdAt: "desc" }, select: { createdAt: true, summary: true, actorName: true } }),
    prisma.auditLog.count({ where: { barbershopId: shop.id, action: "auth.login_failed", createdAt: { gte: since7 } } }),
  ]);

  // último login de cada pessoa com acesso (dono + barbeiros)
  const userIds = [shop.ownerId, ...pros.flatMap((p) => (p.user ? [p.user.id] : []))];
  const logins = await prisma.auditLog.groupBy({
    by: ["actorId"],
    where: { actorId: { in: userIds }, action: "auth.login" },
    _max: { createdAt: true },
  });
  const lastLogin = (id: string) => logins.find((l) => l.actorId === id)?._max.createdAt ?? null;
  const byStatus = (s: string) => last30.find((x) => x.status === s);

  res.json({
    ownerLastLoginAt: lastLogin(shop.ownerId),
    failedLogins7d: failed7,
    lastActivity,
    clients: clients.length,
    upcoming,
    last30Days: {
      completed: (byStatus("COMPLETED")?._count ?? 0) + (byStatus("CONFIRMED")?._count ?? 0),
      noShow: byStatus("NO_SHOW")?._count ?? 0,
      canceled: byStatus("CANCELED")?._count ?? 0,
      revenueCents: (byStatus("COMPLETED")?._sum.priceCents ?? 0) + (byStatus("CONFIRMED")?._sum.priceCents ?? 0),
    },
    reviews: { average: reviews._count ? Math.round((reviews._avg.rating ?? 0) * 10) / 10 : null, count: reviews._count },
    team: pros.map((p) => ({
      id: p.id,
      name: p.name,
      active: p.active,
      email: p.user?.email ?? null,
      pendingPassword: p.user?.mustChangePassword ?? false,
      lastLoginAt: p.user ? lastLogin(p.user.id) : null,
    })),
  });
});
