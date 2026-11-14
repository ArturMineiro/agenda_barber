import type { reviewSchema } from "@navalha/shared";
import type { z } from "zod";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { notifyBarbershop } from "../push/push.service";
import { canReview, findByToken } from "../scheduling/self-service.service";

/** "João Pedro Silva" → "João P." (privacidade na página pública) */
export function publicName(name: string) {
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0]!.toUpperCase()}.` : (first ?? "Cliente");
}

export async function reviewByClient(token: string, input: z.output<typeof reviewSchema>) {
  const appt = await findByToken(token);
  if (!canReview(appt)) {
    throw new AppError(403, "Este atendimento não pode mais ser avaliado", "REVIEW_CLOSED");
  }
  const data = { rating: input.rating, comment: input.comment ?? null };
  const existing = await prisma.review.findUnique({ where: { appointmentId: appt.id }, select: { id: true } });
  const review = await prisma.review.upsert({
    where: { appointmentId: appt.id },
    update: data,
    create: {
      ...data,
      appointmentId: appt.id,
      barbershopId: appt.barbershopId,
      professionalId: appt.professionalId,
      serviceId: appt.serviceId,
      clientName: appt.clientName,
    },
  });
  if (!existing) {
    void notifyBarbershop(appt.barbershopId, {
      title: `${"⭐".repeat(review.rating)} Nova avaliação`,
      body: `${appt.clientName} · ${appt.service.name}${review.comment ? ` — "${review.comment}"` : ""}`,
      url: "/painel/avaliacoes",
      tag: `review-${review.id}`,
    }); // avaliações ficam com o dono (barbeiro não acessa a tela)
  }
  return review;
}

/** Média e total por barbearia (só as visíveis), mais a média de cada serviço */
export async function publicReviewSummary(barbershopId: string) {
  const where = { barbershopId, hidden: false };
  const [all, byService, latest] = await Promise.all([
    prisma.review.aggregate({ where, _avg: { rating: true }, _count: true }),
    prisma.review.groupBy({ by: ["serviceId"], where, _avg: { rating: true }, _count: true }),
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        rating: true,
        comment: true,
        clientName: true,
        createdAt: true,
        service: { select: { name: true } },
        professional: { select: { name: true } },
      },
    }),
  ]);
  return {
    average: all._count ? round1(all._avg.rating ?? 0) : null,
    count: all._count,
    byService: Object.fromEntries(byService.map((s) => [s.serviceId, { average: round1(s._avg.rating ?? 0), count: s._count }])),
    // com comentário primeiro; nota sem texto também conta, mas aparece depois
    latest: latest
      .sort((a, b) => Number(!!b.comment) - Number(!!a.comment))
      .slice(0, 10)
      .map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        clientName: publicName(r.clientName),
        createdAt: r.createdAt,
        service: r.service.name,
        professional: r.professional.name,
      })),
  };
}

const round1 = (n: number) => Math.round(n * 10) / 10;
