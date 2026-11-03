import { Router } from "express";
import rateLimit from "express-rate-limit";
import { loginSchema, registerOwnerSchema, slugSchema } from "@navalha/shared";
import { clearAuthCookie, setAuthCookie, signToken } from "../../lib/auth";
import { requireAuth } from "../../middlewares/auth";
import { isSlugAvailable, login, registerOwner } from "./auth.service";

export const authRoutes = Router();

/** Cadastro: no máximo 20 contas por IP a cada 15 min */
const registerLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });

/** Login: conta só as tentativas com senha errada (contra quem tenta adivinhar senha) */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Muitas tentativas de login. Aguarde alguns minutos.", code: "RATE_LIMITED" },
});

authRoutes.post("/register", registerLimiter, async (req, res) => {
  const input = registerOwnerSchema.parse(req.body);
  const user = await registerOwner(input);
  setAuthCookie(res, signToken({ sub: user.id, role: user.role }));
  res.status(201).json({ user });
});

authRoutes.post("/login", loginLimiter, async (req, res) => {
  const input = loginSchema.parse(req.body);
  const user = await login(input);
  setAuthCookie(res, signToken({ sub: user.id, role: user.role }));
  res.json({ user });
});

authRoutes.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.status(204).end();
});

authRoutes.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

/** Usado no cadastro para validar o link enquanto o usuário digita */
authRoutes.get("/slug-available/:slug", async (req, res) => {
  const parsed = slugSchema.safeParse(req.params.slug);
  if (!parsed.success) return res.json({ available: false, reason: parsed.error.issues[0]?.message });
  res.json({ available: await isSlugAvailable(parsed.data) });
});
