import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AppError } from "../lib/errors";

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ message: "Rota não encontrada", code: "NOT_FOUND" });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ message: err.message, code: err.code });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      message: err.issues[0]?.message ?? "Dados inválidos",
      code: "VALIDATION_ERROR",
      issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({ message: "Registro já existe", code: "DUPLICATE" });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Não encontrado", code: "NOT_FOUND" });
    }
    if (err.code === "P2034") {
      return res.status(409).json({ message: "Conflito ao salvar, tente novamente", code: "TX_CONFLICT" });
    }
  }

  console.error(err);
  return res.status(500).json({ message: "Erro interno", code: "INTERNAL" });
}
