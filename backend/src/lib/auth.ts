import jwt from "jsonwebtoken";
import type { Response } from "express";
import type { Role } from "@prisma/client";
import { env, isProd } from "../config/env";

export const AUTH_COOKIE = "navalha_token";

export interface TokenPayload {
  sub: string;
  role: Role;
  /** tokenVersion do usuário quando o login foi feito: trocou a senha, o token antigo para de valer */
  ver?: number;
}

export function signToken(payload: TokenPayload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

/** Token em cookie httpOnly: o JS do navegador não acessa (protege contra XSS roubar sessão) */
export function setAuthCookie(res: Response, token: string) {
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

/** Abre a sessão (cookie) para o usuário */
export function startSession(res: Response, user: { id: string; role: Role; tokenVersion?: number }) {
  setAuthCookie(res, signToken({ sub: user.id, role: user.role, ver: user.tokenVersion ?? 0 }));
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(AUTH_COOKIE, { path: "/" });
}
