import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { env } from "../../config/env";
import { loadOwnerBarbershop, requireAuth, requireRole } from "../../middlewares/auth";
import { pushEnabled, sendTo } from "./push.service";

/** Notificações do painel: /api/panel/push */
export const pushRoutes = Router();
pushRoutes.use(requireAuth, requireRole("OWNER"), loadOwnerBarbershop);

const subscriptionSchema = z.object({
  endpoint: z.url().max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

function assertEnabled() {
  if (!pushEnabled) throw new AppError(503, "Notificações ainda não configuradas no servidor", "PUSH_DISABLED");
}

/** Chave pública + quantos aparelhos já recebem avisos */
pushRoutes.get("/", async (req, res) => {
  const devices = await prisma.pushSubscription.count({ where: { barbershopId: req.barbershop!.id } });
  res.json({ enabled: pushEnabled, publicKey: env.VAPID_PUBLIC_KEY || null, devices });
});

/** Salva (ou atualiza) o aparelho atual */
pushRoutes.post("/subscribe", async (req, res) => {
  assertEnabled();
  const { endpoint, keys } = subscriptionSchema.parse(req.body);
  const data = {
    userId: req.user!.id,
    barbershopId: req.barbershop!.id,
    p256dh: keys.p256dh,
    auth: keys.auth,
    userAgent: req.get("user-agent")?.slice(0, 300) ?? null,
  };
  await prisma.pushSubscription.upsert({ where: { endpoint }, create: { endpoint, ...data }, update: data });
  res.status(204).end();
});

/** Remove o aparelho atual */
pushRoutes.post("/unsubscribe", async (req, res) => {
  const { endpoint } = z.object({ endpoint: z.string().min(1) }).parse(req.body);
  await prisma.pushSubscription.deleteMany({ where: { endpoint, barbershopId: req.barbershop!.id } });
  res.status(204).end();
});

/** Manda uma notificação de teste para o aparelho atual (ou para todos, sem endpoint) */
pushRoutes.post("/test", async (req, res) => {
  assertEnabled();
  const { endpoint } = z.object({ endpoint: z.string().optional() }).parse(req.body ?? {});
  const subs = await prisma.pushSubscription.findMany({
    where: { barbershopId: req.barbershop!.id, ...(endpoint ? { endpoint } : {}) },
  });
  if (!subs.length) throw new AppError(404, "Nenhum aparelho com notificações ativas", "NO_DEVICES");
  const results = await Promise.all(
    subs.map((s) =>
      sendTo(s, {
        title: "🔔 Notificações funcionando!",
        body: "Você vai receber um aviso aqui sempre que alguém agendar, remarcar ou desmarcar.",
        url: "/painel",
        tag: "teste",
      }),
    ),
  );
  res.json({ sent: results.filter(Boolean).length, total: subs.length });
});
