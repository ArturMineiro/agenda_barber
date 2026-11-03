import { ApiError } from "./api";

export type ImageKind = "logo" | "cover" | "avatar";

/** Maior lado enviado ao servidor. O servidor ainda recorta e converte para WebP. */
const MAX_SIDE: Record<ImageKind, number> = { logo: 1000, cover: 2400, avatar: 800 };

/**
 * Reduz a foto no próprio celular antes de enviar.
 * Uma foto de câmera (4–12 MB) vira algumas centenas de KB, então o envio é rápido até no 4G.
 * Se o navegador não conseguir abrir o formato (ex.: HEIC no Chrome), envia o original e o servidor resolve.
 */
async function shrink(file: File, kind: ImageKind): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_SIDE[kind] / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1_500_000) return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.9));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

export interface UploadResult {
  url: string;
  bytes: number;
  originalBytes: number;
}

export async function uploadImage(file: File, kind: ImageKind): Promise<UploadResult> {
  if (!file.type.startsWith("image/")) throw new ApiError(400, "Escolha um arquivo de imagem");
  const blob = await shrink(file, kind);

  const body = new FormData();
  body.append("file", blob, file.name.replace(/\.\w+$/, "") + (blob === file ? "" : ".jpg"));

  const res = await fetch(`/api/panel/uploads?kind=${kind}`, { method: "POST", body, credentials: "include" });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data?.message ?? "Falha ao enviar imagem", data?.code);
  return data as UploadResult;
}

export const formatBytes = (n: number) => (n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);
