import { Router } from "express";
import rateLimit from "express-rate-limit";
import { changePasswordSchema, loginSchema, registerOwnerSchema, slugSchema } from "@navalha/shared";
import { clearAuthCookie, startSession } from "../../lib/auth";
import { requireAuth } from "../../middlewares/auth";
import { changePassword, isSlugAvailable, login, registerOwner } from "./auth.service";

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
  startSession(res, user);
  res.status(201).json({ user });
});

authRoutes.post("/login", loginLimiter, async (req, res) => {
  const input = loginSchema.parse(req.body);
  const { tokenVersion, ...user } = await login(input);
  startSession(res, { ...user, tokenVersion });
  res.json({ user });
});

authRoutes.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.status(204).end();
});

authRoutes.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

/** Troca a senha de quem está logado. Mesmo limite do login: protege contra adivinhar a senha atual. */
authRoutes.post("/password", requireAuth, loginLimiter, async (req, res) => {
  const input = changePasswordSchema.parse(req.body);
  const updated = await changePassword(req.user!.id, input);
  // este aparelho continua logado (com a versão nova); os outros saem
  startSession(res, updated);
  res.status(204).end();
});

/** Usado no cadastro para validar o link enquanto o usuário digita */
authRoutes.get("/slug-available/:slug", async (req, res) => {
  const parsed = slugSchema.safeParse(req.params.slug);
  if (!parsed.success) return res.json({ available: false, reason: parsed.error.issues[0]?.message });
  res.json({ available: await isSlugAvailable(parsed.data) });
});
