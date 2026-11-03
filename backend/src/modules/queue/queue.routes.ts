import { Router } from "express";
import { z } from "zod";
import { queueEntrySchema, queueOpenSchema, queueStatusSchema } from "@navalha/shared";
import { prisma } from "../../lib/prisma";
import { notFound } from "../../lib/errors";
import { loadOwnerBarbershop, requireAuth, requireRole } from "../../middlewares/auth";
import { addToQueue, callNext, getQueueBoard, setQueueStatus } from "./queue.service";

/** Fila presencial do painel: /api/panel/queue */
export const queueRoutes = Router();
queueRoutes.use(requireAuth, requireRole("OWNER"), loadOwnerBarbershop);

queueRoutes.get("/", async (req, res) => {
  res.json(await getQueueBoard(req.barbershop!));
});

/** Adiciona quem chegou */
queueRoutes.post("/", async (req, res) => {
  const input = queueEntrySchema.parse(req.body);
  res.status(201).json(await addToQueue(req.barbershop!, input));
});

queueRoutes.post("/next", async (req, res) => {
  const { professionalId } = z.object({ professionalId: z.string().min(1) }).parse(req.body);
  res.json({ next: await callNext(req.barbershop!, professionalId) });
});

queueRoutes.patch("/:id/status", async (req, res) => {
  const { status } = queueStatusSchema.parse(req.body);
  res.json(await setQueueStatus(req.barbershop!, String(req.params.id), status));
});

/** Abre/fecha a fila de um barbeiro (ex.: pausa, fim do expediente) */
queueRoutes.patch("/professionals/:id/open", async (req, res) => {
  const { open } = queueOpenSchema.parse(req.body);
  const { count } = await prisma.professional.updateMany({
    where: { id: String(req.params.id), barbershopId: req.barbershop!.id },
    data: { queueOpen: open },
  });
  if (!count) throw notFound("Barbeiro não encontrado");
  res.json({ ok: true });
});
