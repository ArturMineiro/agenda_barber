import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { badRequest } from "../../lib/errors";
import { loadOwnerBarbershop, requireAuth, requireRole } from "../../middlewares/auth";
import { IMAGE_KINDS, saveImage } from "./uploads.service";

export const uploadRoutes = Router();
uploadRoutes.use(requireAuth, requireRole("OWNER"), loadOwnerBarbershop);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|heic|heif|avif)$/.test(file.mimetype)) cb(null, true);
    else cb(badRequest("Formato não suportado. Envie JPG, PNG ou WebP."));
  },
});

const kindSchema = z.enum(Object.keys(IMAGE_KINDS) as [keyof typeof IMAGE_KINDS]);

/** POST /api/panel/uploads?kind=logo|cover|avatar  (multipart, campo "file") */
uploadRoutes.post("/", (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") return next(badRequest("Imagem muito grande (máx. 8 MB)"));
    if (err) return next(err);
    next();
  });
}, async (req, res) => {
  const kind = kindSchema.parse(req.query.kind);
  if (!req.file) throw badRequest("Nenhuma imagem enviada");
  const result = await saveImage(req.file.buffer, kind, req.barbershop!.id);
  res.status(201).json(result);
});
