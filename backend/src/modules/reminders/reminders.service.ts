import { DateTime } from "luxon";
import type { Barbershop } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { notFound } from "../../lib/errors";
import { startOfDayInZone } from "../../lib/time";
import { notifyBarbershop, pushEnabled } from "../push/push.service";

/**
 * Lembrete do dia seguinte, sem API paga de WhatsApp:
 * no horário escolhido o dono recebe "amanhã você tem N clientes" no celular,
 * abre a lista e manda o lembrete de cada um com um toque (wa.me já escrito).
 */

/** Amanhã ("YYYY-MM-DD") no fuso da barbearia */
export const tomorrowKey = (shop: Pick<Barbershop, "timezone">, now: DateTime = DateTime.now()) =>
  now.setZone(shop.timezone).plus({ days: 1 }).toISODate()!;

/** Agendamentos confirmados do dia (padrão: amanhã), com quem já foi lembrado */
export async function listReminders(shop: Barbershop, date?: string, professionalId?: string) {
  const key = date ?? tomorrowKey(shop);
  const day = startOfDayInZone(key, shop.timezone);
  const appointments = await prisma.appointment.findMany({
    where: {
      barbershopId: shop.id,
      status: "CONFIRMED",
      startsAt: { gte: day.toJSDate(), lte: day.endOf("day").toJSDate() },
      ...(professionalId ? { professionalId } : {}),
    },
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      clientName: true,
      clientPhone: true,
      startsAt: true,
      accessToken: true,
      reminderSentAt: true,
      service: { select: { name: true } },
      professional: { select: { name: true } },
    },
  });
  return { date: key, appointments };
}

export async function markReminderSent(shopId: string, appointmentId: string, professionalId?: string) {
  const { count } = await prisma.appointment.updateMany({
    where: { id: appointmentId, barbershopId: shopId, ...(professionalId ? { professionalId } : {}) },
    data: { reminderSentAt: new Date() },
  });
  if (!count) throw notFound("Agendamento não encontrado");
}

/**
 * Roda a cada 10 min: para cada barbearia que chegou na hora do aviso (e ainda não recebeu hoje),
 * manda a notificação se houver clientes de amanhã sem lembrete.
 */
export async function runReminderDigests(nowInput: DateTime = DateTime.now()) {
  if (!pushEnabled) return { sent: 0 };
  const shops = await prisma.barbershop.findMany({
    where: {
      status: "ACTIVE",
      bookingMode: "SCHEDULE",
      reminderDigestHour: { not: null },
      pushSubscriptions: { some: {} },
    },
  });

  let sent = 0;
  for (const shop of shops) {
    const local = nowInput.setZone(shop.timezone);
    const today = local.toISODate()!;
    // só entre a hora escolhida e o fim do dia (servidor fora do ar às 19h não manda às 3h da manhã)
    if (local.hour < shop.reminderDigestHour! || shop.reminderDigestOn === today) continue;

    // marca antes de enviar: duas instâncias da API não mandam o aviso em dobro
    const { count: claimed } = await prisma.barbershop.updateMany({
      where: { id: shop.id, OR: [{ reminderDigestOn: null }, { reminderDigestOn: { not: today } }] },
      data: { reminderDigestOn: today },
    });
    if (!claimed) continue;

    const { appointments } = await listReminders(shop, tomorrowKey(shop, nowInput));
    const pending = appointments.filter((a) => !a.reminderSentAt).length;
    if (!pending) continue;

    await notifyBarbershop(shop.id, {
      title: `📅 Amanhã: ${appointments.length} cliente${appointments.length > 1 ? "s" : ""}`,
      body:
        pending === appointments.length
          ? "Toque para mandar o lembrete no WhatsApp de cada um. Menos faltas!"
          : `${pending} ainda sem lembrete. Toque para mandar no WhatsApp.`,
      url: "/painel/lembretes",
      tag: `lembretes-${today}`,
    });
    sent++;
  }
  return { sent };
}

export function startReminderScheduler() {
  const run = () =>
    runReminderDigests()
      .then((r) => {
        if (r.sent) console.log("📅 Avisos de lembrete enviados:", r.sent);
      })
      .catch((err) => console.error("Erro na rotina de lembretes:", err));
  run();
  return setInterval(run, 10 * 60 * 1000);
}
