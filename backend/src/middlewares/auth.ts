import type { NextFunction, Request, Response } from "express";
import type { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AUTH_COOKIE, verifyToken } from "../lib/auth";
import { forbidden, notFound, unauthorized } from "../lib/errors";

export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  mustChangePassword: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = req.cookies?.[AUTH_COOKIE] ?? (header?.startsWith("Bearer ") ? header.slice(7) : undefined);
  if (!token) throw unauthorized();

  const payload = verifyToken(token);
  if (!payload) throw unauthorized("Sessão expirada, entre novamente");

  const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { ...publicUserSelect, tokenVersion: true } });
  if (!user) throw unauthorized();
  // a senha mudou depois deste login (troca ou senha temporária): pede para entrar de novo
  const { tokenVersion, ...publicUser } = user;
  if ((payload.ver ?? 0) !== tokenVersion) throw unauthorized("Sua senha foi alterada. Entre novamente.");

  req.user = publicUser;
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) throw forbidden();
    next();
  };
}

/**
 * Carrega a barbearia do dono logado em req.barbershop.
 * Um dono pode ter várias barbearias: envie o header `x-barbershop-id` para escolher;
 * sem o header, usa a primeira (mais antiga).
 */
export async function loadOwnerBarbershop(req: Request, _res: Response, next: NextFunction) {
  const ownerId = req.user!.id;
  const requested = req.header("x-barbershop-id");

  const barbershop = await prisma.barbershop.findFirst({
    where: { ownerId, ...(requested ? { id: requested } : {}) },
    orderBy: { createdAt: "asc" },
  });
  if (!barbershop) throw notFound("Barbearia não encontrada");

  req.barbershop = barbershop;
  next();
}

/**
 * Painel para dono E barbeiro da equipe.
 * - Dono: carrega a barbearia dele (igual a loadOwnerBarbershop).
 * - Barbeiro: carrega a barbearia do profissional ligado ao login e grava req.scopeProfessionalId:
 *   as rotas filtram tudo por ele (só a própria agenda, fila, folgas e números).
 */
export async function loadPanelContext(req: Request, res: Response, next: NextFunction) {
  if (req.user!.role !== "BARBER") return loadOwnerBarbershop(req, res, next);

  const pro = await prisma.professional.findUnique({ where: { userId: req.user!.id }, include: { barbershop: true } });
  if (!pro) throw forbidden("Seu acesso não está ligado a nenhuma barbearia");
  if (!pro.active) throw forbidden("Seu acesso está desativado. Fale com o dono da barbearia.");

  req.barbershop = pro.barbershop;
  req.scopeProfessionalId = pro.id;
  next();
}

/**
 * Lista do que o barbeiro pode acessar (o resto é só do dono).
 * Rota nova fica bloqueada para o barbeiro até entrar aqui — seguro por padrão.
 */
export function barberAllowlist(rules: [method: string, path: RegExp][]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (req.user?.role !== "BARBER") return next();
    if (rules.some(([m, p]) => m === req.method && p.test(req.path))) return next();
    throw forbidden("Só o dono da barbearia pode fazer isso");
  };
}
