import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { authRoutes } from "./modules/auth/auth.routes";
import { adminRoutes } from "./modules/admin/admin.routes";
import { panelRoutes } from "./modules/panel/panel.routes";
import { publicRoutes } from "./modules/public/public.routes";
import { uploadRoutes } from "./modules/uploads/uploads.routes";
import { queueRoutes } from "./modules/queue/queue.routes";
import { UPLOAD_DIR } from "./modules/uploads/uploads.service";
import { errorHandler, notFoundHandler } from "./middlewares/error-handler";

export function createApp() {
  const app = express();

  app.set("trust proxy", env.TRUST_PROXY);
  app.use(helmet());
  app.use(cors({ origin: env.WEB_URL, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  // imagens enviadas: nome único por arquivo, então pode cachear "para sempre"
  app.use(
    "/uploads",
    (_req, res, next) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      next();
    },
    express.static(UPLOAD_DIR, { maxAge: "365d", immutable: true, index: false }),
  );

  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/auth", authRoutes);
  app.use("/api/admin", adminRoutes); // super admin da plataforma
  app.use("/api/panel/uploads", uploadRoutes); // imagens (logo, capa, fotos)
  app.use("/api/panel/queue", queueRoutes); // fila por ordem de chegada
  app.use("/api/panel", panelRoutes); // dono da barbearia
  app.use("/api/public", publicRoutes); // página pública + agendamento

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
