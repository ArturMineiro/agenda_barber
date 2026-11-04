import { Router, type Request } from "express";
import { prisma } from "../../lib/prisma";
import { badRequest, notFound } from "../../lib/errors";
import { loadOwnerBarbershop, requireAuth, requireRole } from "../../middlewares/auth";
import { receiveImage } from "../uploads/uploads.routes";
import { deleteImage, saveServicePhoto } from "../uploads/uploads.service";

/** Fotos do catálogo: /api/panel/services/:serviceId/photos */
export const servicePhotoRoutes = Router({ mergeParams: true });
servicePhotoRoutes.use(requireAuth, requireRole("OWNER"), loadOwnerBarbershop);

/** Por serviço: suficiente para mostrar ângulos (frente, lado, nuca) sem pesar a página */
export const MAX_PHOTOS_PER_SERVICE = 3;
const MAX_PHOTOS_PER_BARBERSHOP = 60;

/** :serviceId vem do caminho onde o router foi montado (mergeParams) */
const serviceIdOf = (req: Request) => String((req.params as Record<string, string>).serviceId);

async function findOwnService(serviceId: string, barbershopId: string) {
  const service = await prisma.service.findFirst({ where: { id: serviceId, barbershopId }, select: { id: true } });
  if (!service) throw notFound("Serviço não encontrado");
  return service;
}

const listPhotos = (serviceId: string) =>
  prisma.servicePhoto.findMany({
    where: { serviceId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: { id: true, url: true, thumbUrl: true },
  });

/** Envia uma foto (multipart, campo "file"). Entra no fim da lista; a primeira vira capa. */
servicePhotoRoutes.post("/", receiveImage, async (req, res) => {
  const shopId = req.barbershop!.id;
  const service = await findOwnService(serviceIdOf(req), shopId);
  if (!req.file) throw badRequest("Nenhuma imagem enviada");

  const [count, total] = await Promise.all([
    prisma.servicePhoto.count({ where: { serviceId: service.id } }),
    prisma.servicePhoto.count({ where: { barbershopId: shopId } }),
  ]);
  if (count >= MAX_PHOTOS_PER_SERVICE) throw badRequest(`Cada serviço pode ter até ${MAX_PHOTOS_PER_SERVICE} fotos`);
  if (total >= MAX_PHOTOS_PER_BARBERSHOP) throw badRequest(`Limite de ${MAX_PHOTOS_PER_BARBERSHOP} fotos no catálogo atingido`);

  const saved = await saveServicePhoto(req.file.buffer, shopId);
  const last = await prisma.servicePhoto.findFirst({ where: { serviceId: service.id }, orderBy: { position: "desc" } });
  const photo = await prisma.servicePhoto.create({
    data: { serviceId: service.id, barbershopId: shopId, url: saved.url, thumbUrl: saved.thumbUrl, position: (last?.position ?? -1) + 1 },
    select: { id: true, url: true, thumbUrl: true },
  });
  res.status(201).json({ ...photo, bytes: saved.bytes, originalBytes: saved.originalBytes });
});

/** Coloca a foto como capa (primeira) */
servicePhotoRoutes.post("/:photoId/cover", async (req, res) => {
  const service = await findOwnService(serviceIdOf(req), req.barbershop!.id);
  const photos = await listPhotos(service.id);
  const target = photos.find((p) => p.id === String(req.params.photoId));
  if (!target) throw notFound("Foto não encontrada");
  const ordered = [target, ...photos.filter((p) => p.id !== target.id)];
  await prisma.$transaction(ordered.map((p, i) => prisma.servicePhoto.update({ where: { id: p.id }, data: { position: i } })));
  res.json(await listPhotos(service.id));
});

servicePhotoRoutes.delete("/:photoId", async (req, res) => {
  const shopId = req.barbershop!.id;
  const service = await findOwnService(serviceIdOf(req), shopId);
  const photo = await prisma.servicePhoto.findFirst({ where: { id: String(req.params.photoId), serviceId: service.id } });
  if (!photo) throw notFound("Foto não encontrada");
  await prisma.servicePhoto.delete({ where: { id: photo.id } });
  await Promise.all([deleteImage(photo.url, shopId), deleteImage(photo.thumbUrl, shopId)]);
  res.status(204).end();
});
