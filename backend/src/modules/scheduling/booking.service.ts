import { DateTime } from "luxon";
import { Prisma, type Barbershop } from "@prisma/client";
import type { createBookingSchema } from "@navalha/shared";
import type { z } from "zod";
import { prisma } from "../../lib/prisma";
import { badRequest, conflict, notFound } from "../../lib/errors";
import { getAvailability } from "./availability.service";

type BookingInput = z.output<typeof createBookingSchema>;

interface CreateAppointmentOptions {
  barbershop: Barbershop;
  input: BookingInput;
  source: "public" | "panel";
}

/**
 * Cria um agendamento garantindo que o horário está livre.
 *
 * - Pelo link público: o horário precisa estar entre os slots calculados
 *   (respeita grade, antecedência mínima, bloqueios e conflitos).
 * - Pelo painel: o dono pode encaixar fora da grade, mas nunca sobrepor outro horário.
 *
 * A checagem final roda numa transação SERIALIZABLE: se dois clientes tentarem
 * o mesmo horário ao mesmo tempo, só um consegue.
 */
export async function createAppointment({ barbershop, input, source }: CreateAppointmentOptions) {
  const [service, professional] = await Promise.all([
    prisma.service.findFirst({ where: { id: input.serviceId, barbershopId: barbershop.id, active: true } }),
    prisma.professional.findFirst({
      where: {
        id: input.professionalId,
        barbershopId: barbershop.id,
        active: true,
        services: { some: { serviceId: input.serviceId } },
      },
    }),
  ]);
  if (!service) throw notFound("Serviço não encontrado");
  if (!professional) throw badRequest("Este profissional não realiza o serviço escolhido");

  const start = DateTime.fromISO(input.startsAt).setZone(barbershop.timezone);
  if (!start.isValid) throw badRequest("Horário inválido");
  const startsAt = start.toJSDate();
  const endsAt = start.plus({ minutes: service.durationMinutes }).toJSDate();

  if (source === "public") {
    const { slots } = await getAvailability({
      barbershop,
      serviceId: service.id,
      professionalId: professional.id,
      date: start.toISODate()!,
    });
    const ok = slots.some((s) => new Date(s.startsAt).getTime() === startsAt.getTime());
    if (!ok) throw conflict("Este horário não está mais disponível", "SLOT_UNAVAILABLE");
  }

  try {
    return await prisma.$transaction(
      async (tx) => {
        const clash = await tx.appointment.findFirst({
          where: {
            professionalId: professional.id,
            status: { not: "CANCELED" },
            startsAt: { lt: endsAt },
            endsAt: { gt: startsAt },
          },
          select: { id: true },
        });
        if (clash) throw conflict("Este horário não está mais disponível", "SLOT_UNAVAILABLE");

        return tx.appointment.create({
          data: {
            barbershopId: barbershop.id,
            professionalId: professional.id,
            serviceId: service.id,
            clientName: input.clientName,
            clientPhone: input.clientPhone,
            notes: input.notes ?? null,
            startsAt,
            endsAt,
            priceCents: service.priceCents,
            source,
          },
          include: {
            service: { select: { name: true, durationMinutes: true } },
            professional: { select: { name: true } },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034") {
      throw conflict("Este horário acabou de ser reservado, escolha outro", "SLOT_UNAVAILABLE");
    }
    throw err;
  }
}
