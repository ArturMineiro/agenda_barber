import { DateTime } from "luxon";
import type { Appointment, Barbershop } from "@prisma/client";
import { REVIEW_WINDOW_DAYS } from "@navalha/shared";
import { prisma } from "../../lib/prisma";
import { AppError, badRequest, conflict, notFound } from "../../lib/errors";
import { getAvailability } from "./availability.service";
import { assertSlotFree, inSlotTransaction } from "./booking.service";
import { notifyCancel, notifyReschedule } from "../push/push.service";

/**
 * Autoatendimento do cliente pelo link secreto do agendamento (sem login):
 * ver, cancelar e remarcar, respeitando o prazo mínimo definido pela barbearia.
 */

export async function findByToken(token: string) {
  const appt = await prisma.appointment.findUnique({
    where: { accessToken: token },
    include: {
      barbershop: true,
      service: { select: { id: true, name: true, durationMinutes: true } },
      professional: { select: { id: true, name: true, avatarUrl: true } },
      review: { select: { rating: true, comment: true } },
    },
  });
  if (!appt) throw notFound("Agendamento não encontrado");
  return appt;
}

/**
 * Avaliações: o cliente avalia pelo link secreto depois do atendimento.
 * Vale para concluídos e para confirmados cujo horário já passou (muitos donos não marcam "concluído").
 */
export function canReview(appt: Pick<Appointment, "status" | "endsAt">) {
  if (appt.status !== "COMPLETED" && appt.status !== "CONFIRMED") return false;
  const end = DateTime.fromJSDate(appt.endsAt);
  const now = DateTime.now();
  // concluído pode ser avaliado mesmo se o dono marcou antes do fim do horário
  if (appt.status === "CONFIRMED" && end > now) return false;
  return now < end.plus({ days: REVIEW_WINDOW_DAYS });
}

/** Até quando o cliente pode mexer sozinho no agendamento */
export function selfServiceDeadline(appt: Appointment, shop: Barbershop) {
  return DateTime.fromJSDate(appt.startsAt).minus({ minutes: shop.cancelMinAdvanceMinutes });
}

export function canSelfManage(appt: Appointment, shop: Barbershop) {
  return appt.status === "CONFIRMED" && shop.status === "ACTIVE" && DateTime.now() < selfServiceDeadline(appt, shop);
}

function assertCanSelfManage(appt: Appointment, shop: Barbershop) {
  if (appt.status !== "CONFIRMED") throw badRequest("Este agendamento não pode mais ser alterado");
  if (!canSelfManage(appt, shop)) {
    throw new AppError(
      403,
      "O prazo para alterar pelo link já passou. Fale com a barbearia pelo WhatsApp.",
      "SELF_SERVICE_CLOSED",
    );
  }
}

export async function cancelByClient(token: string, reason?: string | null) {
  const appt = await findByToken(token);
  assertCanSelfManage(appt, appt.barbershop);
  const updated = await prisma.appointment.update({
    where: { id: appt.id },
    data: { status: "CANCELED", canceledAt: new Date(), canceledBy: "client", cancelReason: reason ?? null },
  });
  void notifyCancel(appt, reason);
  return updated;
}

export async function rescheduleAvailability(token: string, date: string, professionalId?: string) {
  const appt = await findByToken(token);
  assertCanSelfManage(appt, appt.barbershop);
  return getAvailability({
    barbershop: appt.barbershop,
    serviceId: appt.serviceId,
    professionalId,
    date,
    ignoreAppointmentId: appt.id,
  });
}

/** Mesmo serviço, novo horário. O horário precisa estar entre os livres (mesmas regras do agendamento). */
export async function rescheduleByClient(token: string, startsAtIso: string, professionalId: string) {
  const appt = await findByToken(token);
  const shop = appt.barbershop;
  assertCanSelfManage(appt, shop);

  const start = DateTime.fromISO(startsAtIso).setZone(shop.timezone);
  if (!start.isValid) throw badRequest("Horário inválido");
  const startsAt = start.toJSDate();
  const endsAt = start.plus({ minutes: appt.service.durationMinutes }).toJSDate();

  const { slots } = await getAvailability({
    barbershop: shop,
    serviceId: appt.serviceId,
    professionalId,
    date: start.toISODate()!,
    ignoreAppointmentId: appt.id,
  });
  const slot = slots.find((s) => new Date(s.startsAt).getTime() === startsAt.getTime());
  if (!slot || !slot.professionalIds.includes(professionalId)) {
    throw conflict("Este horário não está mais disponível", "SLOT_UNAVAILABLE");
  }

  const updated = await inSlotTransaction(async (tx) => {
    await assertSlotFree(tx, { professionalId, startsAt, endsAt, ignoreAppointmentId: appt.id });
    return tx.appointment.update({
      where: { id: appt.id },
      data: { startsAt, endsAt, professionalId, rescheduleCount: { increment: 1 } },
      include: { professional: { select: { name: true } } },
    });
  });
  void notifyReschedule({ ...appt, startsAt: updated.startsAt, professional: updated.professional }, appt.startsAt);
  return updated;
}

/** Formato público: sem dados internos da barbearia */
export function toPublicAppointment(appt: Awaited<ReturnType<typeof findByToken>>) {
  const b = appt.barbershop;
  return {
    id: appt.id,
    status: appt.status,
    startsAt: appt.startsAt,
    endsAt: appt.endsAt,
    priceCents: appt.priceCents,
    clientName: appt.clientName,
    notes: appt.notes,
    canceledBy: appt.canceledBy,
    cancelReason: appt.cancelReason,
    service: appt.service,
    professional: appt.professional,
    canManage: canSelfManage(appt, b),
    canReview: canReview(appt),
    review: appt.review,
    manageDeadline: selfServiceDeadline(appt, b).toISO(),
    cancelMinAdvanceMinutes: b.cancelMinAdvanceMinutes,
    barbershop: {
      name: b.name,
      slug: b.slug,
      phone: b.phone,
      whatsapp: b.whatsapp,
      address: b.address,
      city: b.city,
      logoUrl: b.logoUrl,
      coverUrl: b.coverUrl,
      primaryColor: b.primaryColor,
      secondaryColor: b.secondaryColor,
      pageTheme: b.pageTheme,
      maxAdvanceDays: b.maxAdvanceDays,
      teamType: b.teamType,
    },
  };
}
