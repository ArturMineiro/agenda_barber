import * as React from "react";
import { toast } from "sonner";
import { Camera, Loader2, Star, Trash2 } from "lucide-react";
import { errorMessage } from "@/lib/api";
import { formatBytes, uploadServicePhoto } from "@/lib/image";
import { cn } from "@/lib/utils";
import type { Service } from "@/types/api";
import { useServicePhotoActions, useServices } from "../api";

const MAX = 6;

/**
 * Fotos do corte (catálogo). Aparecem no carrossel da página da barbearia.
 * O celular reduz a foto antes de enviar e o servidor gera WebP leve (≈80 KB) + miniatura (≈10 KB).
 */
export function ServicePhotos({ serviceId }: { serviceId: string }) {
  // lê da lista em cache para refletir envio/remoção na hora
  const { data: services } = useServices();
  const service: Service | undefined = services?.find((s) => s.id === serviceId);
  const photos = service?.photos ?? [];
  const { refresh, makeCover, remove } = useServicePhotoActions(serviceId);
  const [uploading, setUploading] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const onFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    const files = Array.from(list).slice(0, Math.max(0, MAX - photos.length));
    if (files.length < list.length) toast.info(`Cada serviço pode ter até ${MAX} fotos`);
    setUploading(files.length);
    let original = 0;
    let final = 0;
    // uma por vez: mais estável no 4G e respeita o limite no servidor
    for (const file of files) {
      try {
        const r = await uploadServicePhoto(serviceId, file);
        original += file.size;
        final += r.bytes;
        await refresh();
      } catch (err) {
        toast.error(errorMessage(err));
      }
      setUploading((n) => n - 1);
    }
    if (final) toast.success(`Foto${files.length > 1 ? "s" : ""} adicionada${files.length > 1 ? "s" : ""} · ${formatBytes(original)} → ${formatBytes(final)}`);
    if (inputRef.current) inputRef.current.value = "";
  };

  const canAdd = photos.length + uploading < MAX;

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-sm font-medium text-zinc-800">Fotos do corte</p>
        <span className="text-xs text-zinc-400">
          {photos.length}/{MAX}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {photos.map((p, i) => (
          <div key={p.id} className="group relative aspect-[4/5] overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-zinc-200">
            <img src={p.thumbUrl} alt="" loading="lazy" className="size-full object-cover" />
            {i === 0 && (
              <span className="absolute top-1.5 left-1.5 rounded-full bg-zinc-900/80 px-2 py-0.5 text-[10px] font-semibold text-white">Capa</span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/60 to-transparent p-1.5 pt-6">
              {i > 0 && (
                <button
                  type="button"
                  onClick={() => makeCover.mutate(p.id)}
                  className="rounded-lg bg-white/90 p-1.5 text-zinc-800 hover:bg-white"
                  aria-label="Usar como capa"
                  title="Usar como capa"
                >
                  <Star className="size-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => confirm("Remover esta foto?") && remove.mutate(p.id)}
                className="rounded-lg bg-white/90 p-1.5 text-red-600 hover:bg-white"
                aria-label="Remover foto"
                title="Remover"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
        ))}

        {Array.from({ length: uploading }, (_, i) => (
          <div key={`up-${i}`} className="flex aspect-[4/5] items-center justify-center rounded-xl bg-zinc-100 ring-1 ring-zinc-200">
            <Loader2 className="size-5 animate-spin text-zinc-400" />
          </div>
        ))}

        {canAdd && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading > 0}
            className={cn(
              "flex aspect-[4/5] flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-zinc-300 text-zinc-500 transition hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-700",
              uploading > 0 && "opacity-50",
            )}
          >
            <Camera className="size-5" />
            <span className="text-xs font-medium">{photos.length ? "Adicionar" : "Adicionar fotos"}</span>
          </button>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />

      <p className="mt-2 text-xs text-zinc-500">
        Mostre o corte pronto (frente, lado, nuca). A primeira é a capa no catálogo. Fotos em pé ficam melhores.
      </p>
    </div>
  );
}
