import { DateTime } from "luxon";
import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { addDays, dateOnly, DEFAULT_TZ, todayAsDateOnly } from "../../lib/time";

/** Motivo gravado quando a suspensão é automática — permite reativar sozinho quando pagar */
export const BILLING_SUSPENSION_REASON = "Mensalidade em atraso";

/** A cobrança do mês aparece X dias antes do vencimento */
const INVOICE_LEAD_DAYS = 7;

function dueDateFor(year: number, month: number, billingDay: number) {
  return dateOnly(year, month, billingDay);
}

/**
 * Rotina de cobrança (roda ao iniciar o servidor, de hora em hora e sob demanda pelo admin):
 *
 * 1. Encerra períodos de cortesia vencidos (TRIAL → ACTIVE)
 * 2. Gera a mensalidade do mês atual/próximo quando faltar ≤ 7 dias para o vencimento
 * 3. Marca como OVERDUE o que passou do vencimento
 * 4. Suspende a barbearia quando o atraso passa da tolerância (BILLING_GRACE_DAYS)
 */
export async function syncBilling(nowInput: DateTime = DateTime.now()) {
  const now = nowInput.setZone(DEFAULT_TZ);
  const today = todayAsDateOnly(DEFAULT_TZ, now);
  const result = { created: 0, overdue: 0, suspended: 0 };

  await prisma.subscription.updateMany({
    where: { status: "TRIAL", trialEndsAt: { lte: now.toJSDate() } },
    data: { status: "ACTIVE" },
  });

  const subscriptions = await prisma.subscription.findMany({
    where: { status: { in: ["ACTIVE", "PAST_DUE"] }, barbershop: { status: { in: ["ACTIVE", "SUSPENDED"] } } },
  });

  for (const sub of subscriptions) {
    const billingStart = sub.trialEndsAt ?? sub.startedAt;
    const start = DateTime.fromJSDate(billingStart).setZone(DEFAULT_TZ);
    const firstChargeable = dateOnly(start.year, start.month, start.day);

    for (const offset of [0, 1]) {
      const ref = now.startOf("month").plus({ months: offset });
      const dueDate = dueDateFor(ref.year, ref.month, sub.billingDay);
      if (dueDate < firstChargeable) continue;
      if (addDays(dueDate, -INVOICE_LEAD_DAYS) > today) continue;

      // skipDuplicates + unique(subscriptionId, referenceMonth) = idempotente
      const { count } = await prisma.payment.createMany({
        data: [{ subscriptionId: sub.id, referenceMonth: ref.toFormat("yyyy-MM"), amountCents: sub.priceCents, dueDate }],
        skipDuplicates: true,
      });
      result.created += count;
    }
  }

  const overdue = await prisma.payment.updateMany({
    where: { status: "PENDING", dueDate: { lt: today } },
    data: { status: "OVERDUE" },
  });
  result.overdue = overdue.count;

  // assinaturas com qualquer cobrança atrasada → PAST_DUE
  const lateSubs = await prisma.payment.findMany({
    where: { status: "OVERDUE" },
    select: { subscriptionId: true, dueDate: true, subscription: { select: { barbershopId: true } } },
  });
  const pastDueIds = [...new Set(lateSubs.map((p) => p.subscriptionId))];
  if (pastDueIds.length) {
    await prisma.subscription.updateMany({
      where: { id: { in: pastDueIds }, status: "ACTIVE" },
      data: { status: "PAST_DUE" },
    });
  }

  const graceLimit = addDays(today, -env.BILLING_GRACE_DAYS);
  const toSuspend = [
    ...new Set(lateSubs.filter((p) => p.dueDate < graceLimit).map((p) => p.subscription.barbershopId)),
  ];
  if (toSuspend.length) {
    const suspended = await prisma.barbershop.updateMany({
      where: { id: { in: toSuspend }, status: "ACTIVE" },
      data: { status: "SUSPENDED", statusReason: BILLING_SUSPENSION_REASON },
    });
    result.suspended = suspended.count;
  }

  return result;
}

/**
 * Depois de uma baixa/cancelamento: se não houver mais atrasos,
 * a assinatura volta a ACTIVE e a barbearia é reativada (se foi suspensa pela cobrança).
 */
export async function refreshSubscriptionStanding(subscriptionId: string) {
  const stillLate = await prisma.payment.count({ where: { subscriptionId, status: "OVERDUE" } });
  if (stillLate > 0) return;

  const sub = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: { status: "ACTIVE" },
    select: { barbershopId: true },
  });
  await prisma.barbershop.updateMany({
    where: { id: sub.barbershopId, status: "SUSPENDED", statusReason: BILLING_SUSPENSION_REASON },
    data: { status: "ACTIVE", statusReason: null },
  });
}

export function startBillingScheduler() {
  const run = () =>
    syncBilling()
      .then((r) => {
        if (r.created || r.overdue || r.suspended) console.log("💰 Cobrança sincronizada:", r);
      })
      .catch((err) => console.error("Erro na rotina de cobrança:", err));
  run();
  return setInterval(run, 60 * 60 * 1000);
}
