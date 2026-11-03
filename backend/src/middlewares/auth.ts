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
  createdAt: true,
  updatedAt: true,
} as const;

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = req.cookies?.[AUTH_COOKIE] ?? (header?.startsWith("Bearer ") ? header.slice(7) : undefined);
  if (!token) throw unauthorized();

  const payload = verifyToken(token);
  if (!payload) throw unauthorized("Sessão expirada, entre novamente");

  const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: publicUserSelect });
  if (!user) throw unauthorized();

  req.user = user;
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
