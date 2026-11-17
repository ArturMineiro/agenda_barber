import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import {
  availabilityQuerySchema,
  cancelAppointmentSchema,
  createBookingSchema,
  rescheduleAvailabilityQuerySchema,
  rescheduleSchema,
  reviewSchema,
} from "@navalha/shared";
import { prisma } from "../../lib/prisma";
import { AUTH_COOKIE, verifyToken } from "../../lib/auth";
import { env } from "../../config/env";
import { AppError, notFound } from "../../lib/errors";
import { auditInfo } from "../../lib/audit";
import { getAvailability } from "../scheduling/availability.service";
import { createAppointment } from "../scheduling/booking.service";
import { getPublicQueue } from "../queue/queue.service";
import { notifyNewBooking } from "../push/push.service";
import { publicReviewSummary, reviewByClient } from "../reviews/reviews.service";
import {
  cancelByClient,
  findByToken,
  rescheduleAvailability,
  rescheduleByClient,
  toPublicAppointment,
} from "../scheduling/self-service.service";

export const publicRoutes = Router();

const bookingLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });

async function findActiveBarbershop(slug: string) {
  const barbershop = await prisma.barbershop.findUnique({ where: { slug } });
  if (!barbershop || barbershop.status === "REJECTED") throw notFound("Barbearia não encontrada");
  if (barbershop.status !== "ACTIVE") {
    throw new AppError(423, "Esta barbearia não está recebendo agendamentos no momento", "BARBERSHOP_UNAVAILABLE");
  }
  return barbershop;
}

/**
 * Modo prévia: antes da aprovação (ou suspensa/recusada), quem é da casa vê a página como ela vai ficar.
 * Vale para o dono, os barbeiros da equipe e o admin da plataforma, logados neste navegador.
 * Para qualquer outra pessoa a página continua fechada. Agendar nunca funciona na prévia.
 */
async function canPreview(req: Request, b: { id: string; ownerId: string }) {
  const header = req.headers.authorization;
  const token = req.cookies?.[AUTH_COOKIE] ?? (header?.startsWith("Bearer ") ? header.slice(7) : undefined);
  const payload = token ? verifyToken(token) : null;
  if (!payload) return false;
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, role: true, tokenVersion: true, professional: { select: { barbershopId: true } } },
  });
  // senha trocada depois deste login: o token antigo não vale
  if (!user || (payload.ver ?? 0) !== user.tokenVersion) return false;
  return user.role === "SUPER_ADMIN" || user.id === b.ownerId || user.professional?.barbershopId === b.id;
}

/** Barbearia ativa para todos; não ativa só em modo prévia para quem é da casa */
async function findViewableBarbershop(req: Request, res: Response, slug: string) {
  const barbershop = await prisma.barbershop.findUnique({ where: { slug } });
  if (barbershop && barbershop.status !== "ACTIVE" && (await canPreview(req, barbershop))) {
    // resposta depende de quem está logado: nunca guardar em cache compartilhado
    res.setHeader("Cache-Control", "private, no-store");
    return { b: barbershop, preview: true };
  }
  return { b: await findActiveBarbershop(slug), preview: false };
}

/** Configuração pública da plataforma (contato do suporte) */
publicRoutes.get("/config", (_req, res) => {
  res.json({ supportWhatsapp: env.SUPPORT_WHATSAPP || null });
});

/** Página pública: dados de vitrine + serviços + profissionais */
publicRoutes.get("/barbershops/:slug", async (req, res) => {
  const { b, preview } = await findViewableBarbershop(req, res, String(req.params.slug));
  const [services, professionals, reviews] = await Promise.all([
    prisma.service.findMany({
      where: { barbershopId: b.id, active: true, professionals: { some: { professional: { active: true } } } },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        durationMinutes: true,
        priceCents: true,
        photos: { orderBy: [{ position: "asc" }, { createdAt: "asc" }], select: { url: true, thumbUrl: true } },
      },
    }),
    prisma.professional.findMany({
      where: { barbershopId: b.id, active: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, bio: true, avatarUrl: true, services: { select: { serviceId: true } } },
    }),
    publicReviewSummary(b.id),
  ]);

  res.json({
    barbershop: {
      name: b.name,
      slug: b.slug,
      description: b.description,
      phone: b.phone,
      whatsapp: b.whatsapp,
      instagram: b.instagram,
      address: b.address,
      city: b.city,
      logoUrl: b.logoUrl,
      coverUrl: b.coverUrl,
      primaryColor: b.primaryColor,
      secondaryColor: b.secondaryColor,
      pageTheme: b.pageTheme,
      teamType: b.teamType,
      bookingMode: b.bookingMode,
      maxAdvanceDays: b.maxAdvanceDays,
      timezone: b.timezone,
    },
    /** página ainda não está no ar: só quem é da casa está vendo (não dá para agendar) */
    preview: preview ? { status: b.status } : null,
    services: services.map((s) => ({ ...s, rating: reviews.byService[s.id] ?? null })),
    reviews: { average: reviews.average, count: reviews.count, latest: reviews.latest },
    professionals: professionals.map(({ services: s, ...p }) => ({ ...p, serviceIds: s.map((x) => x.serviceId) })),
  });
});

/** Movimento da fila (modo ordem de chegada): quantos esperam e a espera estimada por barbeiro */
publicRoutes.get("/barbershops/:slug/queue", async (req, res) => {
  const { b } = await findViewableBarbershop(req, res, String(req.params.slug));
  res.json(await getPublicQueue(b));
});

function assertScheduleMode(b: { bookingMode: string }) {
  if (b.bookingMode !== "SCHEDULE") {
    throw new AppError(409, "Esta barbearia atende por ordem de chegada", "QUEUE_MODE");
  }
}

publicRoutes.get("/barbershops/:slug/availability", async (req, res) => {
  const { b } = await findViewableBarbershop(req, res, String(req.params.slug));
  assertScheduleMode(b);
  const query = availabilityQuerySchema.parse(req.query);
  res.json(await getAvailability({ barbershop: b, ...query }));
});

publicRoutes.post("/barbershops/:slug/bookings", bookingLimiter, async (req, res) => {
  const b = await findActiveBarbershop(String(req.params.slug));
  assertScheduleMode(b);
  const input = createBookingSchema.parse(req.body);
  const appt = await createAppointment({ barbershop: b, input, source: "public" });
  auditInfo(res, {
    barbershopId: b.id,
    actorName: appt.clientName,
    actorRole: "CLIENT",
    subject: `${appt.service.name} com ${appt.professional.name}`,
  });
  // avisa o celular do dono sem atrasar a resposta do cliente
  void notifyNewBooking({ ...appt, barbershop: b });
  res.status(201).json({
    id: appt.id,
    startsAt: appt.startsAt,
    endsAt: appt.endsAt,
    priceCents: appt.priceCents,
    service: appt.service.name,
    professional: appt.professional.name,
    /** link secreto para o cliente ver, cancelar ou remarcar */
    accessToken: appt.accessToken,
  });
});

// ---------- Link do cliente: /agendamento/:token ----------

/** Cliente pelo link: barbearia e nome para o log de atividades */
async function clientAudit(res: import("express").Response, token: string) {
  const a = await prisma.appointment.findUnique({ where: { accessToken: token }, select: { barbershopId: true, clientName: true } });
  if (a) auditInfo(res, { barbershopId: a.barbershopId, actorName: a.clientName, actorRole: "CLIENT" });
}

const manageLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false });

publicRoutes.get("/appointments/:token", manageLimiter, async (req, res) => {
  const appt = await findByToken(String(req.params.token));
  // profissionais que fazem o serviço (para remarcar com outro, se quiser)
  const professionals = await prisma.professional.findMany({
    where: { barbershopId: appt.barbershopId, active: true, services: { some: { serviceId: appt.serviceId } } },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, avatarUrl: true },
  });
  res.json({ ...toPublicAppointment(appt), professionals });
});

publicRoutes.post("/appointments/:token/cancel", manageLimiter, async (req, res) => {
  await clientAudit(res, String(req.params.token));
  const { reason } = cancelAppointmentSchema.parse(req.body);
  await cancelByClient(String(req.params.token), reason);
  res.json({ ok: true });
});

publicRoutes.get("/appointments/:token/availability", manageLimiter, async (req, res) => {
  const { date, professionalId } = rescheduleAvailabilityQuerySchema.parse(req.query);
  res.json(await rescheduleAvailability(String(req.params.token), date, professionalId));
});

publicRoutes.post("/appointments/:token/reschedule", manageLimiter, async (req, res) => {
  await clientAudit(res, String(req.params.token));
  const { startsAt, professionalId } = rescheduleSchema.parse(req.body);
  await rescheduleByClient(String(req.params.token), startsAt, professionalId);
  res.json({ ok: true });
});

/** Cliente avalia o atendimento (cria ou edita a própria avaliação) */
publicRoutes.post("/appointments/:token/review", manageLimiter, async (req, res) => {
  await clientAudit(res, String(req.params.token));
  const input = reviewSchema.parse(req.body);
  const review = await reviewByClient(String(req.params.token), input);
  res.json({ rating: review.rating, comment: review.comment });
});
