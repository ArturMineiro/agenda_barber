import { DateTime } from "luxon";
import type { Barbershop, QueueStatus } from "@prisma/client";
import type { queueEntrySchema } from "@navalha/shared";
import type { z } from "zod";
import { prisma } from "../../lib/prisma";
import { badRequest, conflict, notFound } from "../../lib/errors";

type QueueEntryInput = z.output<typeof queueEntrySchema>;

/** Só a fila de hoje conta: quem ficou "esperando" de ontem é ignorado */
const todayStart = (b: Barbershop) => DateTime.now().setZone(b.timezone).startOf("day").toJSDate();

const ACTIVE: QueueStatus[] = ["WAITING", "IN_SERVICE"];

/** Duração padrão quando o cliente não informou o serviço: média dos serviços ativos */
async function defaultDuration(barbershopId: string) {
  const avg = await prisma.service.aggregate({ where: { barbershopId, active: true }, _avg: { durationMinutes: true } });
  return Math.round(avg._avg.durationMinutes ?? 30);
}

/**
 * Fila de hoje por barbeiro, com estimativa de espera:
 *   tempo restante de quem está na cadeira + duração dos serviços de quem espera.
 */
export async function getQueueBoard(barbershop: Barbershop) {
  const since = todayStart(barbershop);
  const [professionals, entries, fallback, doneToday] = await Promise.all([
    prisma.professional.findMany({
      where: { barbershopId: barbershop.id, active: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, avatarUrl: true, queueOpen: true },
    }),
    prisma.queueEntry.findMany({
      where: { barbershopId: barbershop.id, status: { in: ACTIVE }, joinedAt: { gte: since } },
      orderBy: { joinedAt: "asc" },
      include: { service: { select: { name: true, durationMinutes: true } } },
    }),
    defaultDuration(barbershop.id),
    prisma.queueEntry.groupBy({
      by: ["professionalId"],
      where: { barbershopId: barbershop.id, status: "DONE", joinedAt: { gte: since } },
      _count: true,
    }),
  ]);
  const doneBy = new Map(doneToday.map((d) => [d.professionalId, d._count]));
  const now = Date.now();

  return professionals.map((pro) => {
    const mine = entries.filter((e) => e.professionalId === pro.id);
    const current = mine.find((e) => e.status === "IN_SERVICE") ?? null;
    const waiting = mine.filter((e) => e.status === "WAITING");

    let wait = 0;
    if (current) {
      const dur = current.service?.durationMinutes ?? fallback;
      const elapsed = current.startedAt ? (now - current.startedAt.getTime()) / 60_000 : 0;
      wait += Math.max(5, Math.round(dur - elapsed));
    }
    const waitingWithEta = waiting.map((e) => {
      const eta = wait;
      wait += e.service?.durationMinutes ?? fallback;
      return { ...e, etaMinutes: eta };
    });

    return {
      ...pro,
      current,
      waiting: waitingWithEta,
      /** espera para quem chegar agora */
      estimatedWaitMinutes: wait,
      doneToday: doneBy.get(pro.id) ?? 0,
    };
  });
}

export async function addToQueue(barbershop: Barbershop, input: QueueEntryInput) {
  const pro = await prisma.professional.findFirst({
    where: { id: input.professionalId, barbershopId: barbershop.id, active: true },
  });
  if (!pro) throw notFound("Barbeiro não encontrado");

  let priceCents = 0;
  if (input.serviceId) {
    const service = await prisma.service.findFirst({ where: { id: input.serviceId, barbershopId: barbershop.id } });
    if (!service) throw badRequest("Serviço inválido");
    priceCents = service.priceCents;
  }

  return prisma.queueEntry.create({
    data: {
      barbershopId: barbershop.id,
      professionalId: pro.id,
      serviceId: input.serviceId ?? null,
      clientName: input.clientName,
      clientPhone: input.clientPhone ?? null,
      priceCents,
    },
  });
}

async function findEntry(barbershop: Barbershop, id: string) {
  const entry = await prisma.queueEntry.findFirst({ where: { id, barbershopId: barbershop.id } });
  if (!entry) throw notFound("Cliente não encontrado na fila");
  return entry;
}

/** Muda o status de um cliente. Só um cliente por vez na cadeira de cada barbeiro. */
export async function setQueueStatus(barbershop: Barbershop, id: string, status: QueueStatus) {
  const entry = await findEntry(barbershop, id);
  const now = new Date();

  if (status === "IN_SERVICE") {
    // só a cadeira de hoje: atendimento esquecido de outro dia não aparece no painel e travaria a fila
    const busy = await prisma.queueEntry.findFirst({
      where: {
        professionalId: entry.professionalId,
        status: "IN_SERVICE",
        id: { not: entry.id },
        joinedAt: { gte: todayStart(barbershop) },
      },
    });
    if (busy) throw conflict(`Finalize o atendimento de ${busy.clientName} antes de chamar o próximo`);
    return prisma.queueEntry.update({ where: { id }, data: { status, startedAt: now, finishedAt: null } });
  }
  if (status === "WAITING") {
    return prisma.queueEntry.update({ where: { id }, data: { status, startedAt: null, finishedAt: null } });
  }
  return prisma.queueEntry.update({ where: { id }, data: { status, finishedAt: now } });
}

/** "Chamar próximo": finaliza quem está na cadeira (se houver) e chama o primeiro da fila */
export async function callNext(barbershop: Barbershop, professionalId: string) {
  const since = todayStart(barbershop);
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    await tx.queueEntry.updateMany({
      where: { barbershopId: barbershop.id, professionalId, status: "IN_SERVICE" },
      data: { status: "DONE", finishedAt: now },
    });
    const next = await tx.queueEntry.findFirst({
      where: { barbershopId: barbershop.id, professionalId, status: "WAITING", joinedAt: { gte: since } },
      orderBy: { joinedAt: "asc" },
    });
    if (!next) return null;
    return tx.queueEntry.update({ where: { id: next.id }, data: { status: "IN_SERVICE", startedAt: now } });
  });
}

/** Versão pública: só números, sem nomes de clientes */
export async function getPublicQueue(barbershop: Barbershop) {
  const board = await getQueueBoard(barbershop);
  return board.map((p) => ({
    id: p.id,
    name: p.name,
    avatarUrl: p.avatarUrl,
    open: p.queueOpen,
    inService: !!p.current,
    waiting: p.waiting.length,
    estimatedWaitMinutes: p.estimatedWaitMinutes,
  }));
}
