import { Router, type Request } from "express";
import { z } from "zod";
import { queueEntrySchema, queueOpenSchema, queueStatusSchema } from "@navalha/shared";
import { prisma } from "../../lib/prisma";
import { forbidden, notFound } from "../../lib/errors";
import { loadPanelContext, requireAuth, requireRole } from "../../middlewares/auth";
import { addToQueue, callNext, getQueueBoard, setQueueStatus } from "./queue.service";

/** Fila presencial do painel: /api/panel/queue */
export const queueRoutes = Router();
// barbeiro da equipe também usa a fila, mas só a própria (req.scopeProfessionalId)
queueRoutes.use(requireAuth, requireRole("OWNER", "BARBER"), loadPanelContext);

/** Barbeiro só mexe na própria fila */
function assertOwnColumn(req: Request, professionalId: string) {
  if (req.scopeProfessionalId && req.scopeProfessionalId !== professionalId) throw forbidden("Você só pode mexer na sua fila");
}

queueRoutes.get("/", async (req, res) => {
  const board = await getQueueBoard(req.barbershop!);
  res.json(req.scopeProfessionalId ? board.filter((c) => c.id === req.scopeProfessionalId) : board);
});

/** Adiciona quem chegou */
queueRoutes.post("/", async (req, res) => {
  const input = queueEntrySchema.parse(req.body);
  assertOwnColumn(req, input.professionalId);
  res.status(201).json(await addToQueue(req.barbershop!, input));
});

queueRoutes.post("/next", async (req, res) => {
  const { professionalId } = z.object({ professionalId: z.string().min(1) }).parse(req.body);
  assertOwnColumn(req, professionalId);
  res.json({ next: await callNext(req.barbershop!, professionalId) });
});

queueRoutes.patch("/:id/status", async (req, res) => {
  const { status } = queueStatusSchema.parse(req.body);
  res.json(await setQueueStatus(req.barbershop!, String(req.params.id), status, req.scopeProfessionalId));
});

/** Abre/fecha a fila de um barbeiro (ex.: pausa, fim do expediente) */
queueRoutes.patch("/professionals/:id/open", async (req, res) => {
  const { open } = queueOpenSchema.parse(req.body);
  assertOwnColumn(req, String(req.params.id));
  const { count } = await prisma.professional.updateMany({
    where: { id: String(req.params.id), barbershopId: req.barbershop!.id },
    data: { queueOpen: open },
  });
  if (!count) throw notFound("Barbeiro não encontrado");
  res.json({ ok: true });
});
