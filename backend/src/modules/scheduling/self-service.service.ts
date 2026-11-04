import { DateTime } from "luxon";
import { Prisma, type Appointment, type Barbershop } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError, badRequest, conflict, notFound } from "../../lib/errors";
import { getAvailability } from "./availability.service";
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
    },
  });
  if (!appt) throw notFound("Agendamento não encontrado");
  return appt;
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

  try {
    const updated = await prisma.$transaction(
      async (tx) => {
        const clash = await tx.appointment.findFirst({
          where: {
            id: { not: appt.id },
            professionalId,
            status: { not: "CANCELED" },
            startsAt: { lt: endsAt },
            endsAt: { gt: startsAt },
          },
          select: { id: true },
        });
        if (clash) throw conflict("Este horário não está mais disponível", "SLOT_UNAVAILABLE");
        return tx.appointment.update({
          where: { id: appt.id },
          data: { startsAt, endsAt, professionalId, rescheduleCount: { increment: 1 } },
          include: { professional: { select: { name: true } } },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    void notifyReschedule({ ...appt, startsAt: updated.startsAt, professional: updated.professional }, appt.startsAt);
    return updated;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034") {
      throw conflict("Este horário acabou de ser reservado, escolha outro", "SLOT_UNAVAILABLE");
    }
    throw err;
  }
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
      maxAdvanceDays: b.maxAdvanceDays,
      teamType: b.teamType,
    },
  };
}
