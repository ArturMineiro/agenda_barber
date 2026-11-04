import { randomBytes } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { badRequest } from "../../lib/errors";

/** Pasta onde as imagens ficam (servida em /uploads). Em produção, troque por S3/R2 mantendo a mesma interface. */
export const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

export const IMAGE_KINDS = {
  /** Quadrado, aparece pequeno: 400px é suficiente até em tela retina */
  logo: { width: 400, height: 400, fit: "cover" as const, quality: 82 },
  /** Faixa larga do topo da página */
  cover: { width: 1600, height: 600, fit: "cover" as const, quality: 78 },
  /** Foto do profissional */
  avatar: { width: 320, height: 320, fit: "cover" as const, quality: 80 },
};
export type ImageKind = keyof typeof IMAGE_KINDS;

/**
 * Foto do corte (catálogo): retrato 4:5, igual ao feed do Instagram.
 * Duas versões a partir de um único envio:
 * - full 900x1125 (~60–110 KB) para o carrossel e a galeria
 * - thumb 240x300 (~8–15 KB) para as listas
 */
export const SERVICE_PHOTO = {
  full: { width: 900, height: 1125, quality: 72 },
  thumb: { width: 240, height: 300, quality: 62 },
};

function newName(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${randomBytes(4).toString("hex")}.webp`;
}

/** Gera as duas versões da foto do serviço e salva. Retorna as URLs públicas. */
export async function saveServicePhoto(buffer: Buffer, barbershopId: string) {
  let full: Buffer;
  let thumb: Buffer;
  try {
    // decodifica uma vez, corrige a rotação do celular e tira metadados (GPS)
    const base = sharp(buffer, { failOn: "error" }).rotate();
    const resize = (w: number, h: number, q: number) =>
      base.clone().resize(w, h, { fit: "cover", position: "attention" }).webp({ quality: q, effort: 5, smartSubsample: true }).toBuffer();
    [full, thumb] = await Promise.all([
      resize(SERVICE_PHOTO.full.width, SERVICE_PHOTO.full.height, SERVICE_PHOTO.full.quality),
      resize(SERVICE_PHOTO.thumb.width, SERVICE_PHOTO.thumb.height, SERVICE_PHOTO.thumb.quality),
    ]);
  } catch {
    throw badRequest("Não foi possível ler a imagem. Envie um JPG, PNG ou WebP.");
  }

  const dir = path.join(UPLOAD_DIR, barbershopId);
  await mkdir(dir, { recursive: true });
  const fullName = newName("service");
  const thumbName = fullName.replace(/^service-/, "service-thumb-");
  await Promise.all([writeFile(path.join(dir, fullName), full), writeFile(path.join(dir, thumbName), thumb)]);

  return {
    url: `/uploads/${barbershopId}/${fullName}`,
    thumbUrl: `/uploads/${barbershopId}/${thumbName}`,
    bytes: full.length + thumb.length,
    originalBytes: buffer.length,
  };
}

/**
 * Otimiza e salva a imagem:
 * - corrige rotação da foto do celular (EXIF)
 * - recorta/redimensiona para o tamanho do uso
 * - converte para WebP (geralmente 80–95% menor que a foto original)
 * - remove metadados (localização GPS etc.)
 */
export async function saveImage(buffer: Buffer, kind: ImageKind, barbershopId: string) {
  const spec = IMAGE_KINDS[kind];
  let output: Buffer;
  try {
    output = await sharp(buffer, { failOn: "error" })
      .rotate()
      .resize(spec.width, spec.height, { fit: spec.fit, position: "attention", withoutEnlargement: false })
      .webp({ quality: spec.quality, effort: 4 })
      .toBuffer();
  } catch {
    throw badRequest("Não foi possível ler a imagem. Envie um JPG, PNG ou WebP.");
  }

  const dir = path.join(UPLOAD_DIR, barbershopId);
  await mkdir(dir, { recursive: true });
  const filename = `${kind}-${Date.now().toString(36)}${randomBytes(4).toString("hex")}.webp`;
  await writeFile(path.join(dir, filename), output);

  return { url: `/uploads/${barbershopId}/${filename}`, bytes: output.length, originalBytes: buffer.length };
}

/** Apaga uma imagem antiga desta barbearia (ignora URLs externas ou de outra barbearia) */
export async function deleteImage(url: string | null | undefined, barbershopId: string) {
  if (!url?.startsWith(`/uploads/${barbershopId}/`)) return;
  const file = path.join(UPLOAD_DIR, barbershopId, path.basename(url));
  await unlink(file).catch(() => {});
}
