import * as React from "react";
import { Camera, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { errorMessage } from "@/lib/api";
import { formatBytes, uploadImage, type ImageKind } from "@/lib/image";
import { heroBackground, readableOn } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** Abre o seletor de arquivo, envia e devolve a URL */
function useImagePicker(kind: ImageKind, onChange: (url: string | null) => void) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);

  const handleFile = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      const r = await uploadImage(file, kind);
      onChange(r.url);
      if (r.originalBytes > r.bytes * 2) toast.success(`Imagem otimizada: ${formatBytes(file.size)} → ${formatBytes(r.bytes)}`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
      className="hidden"
      onChange={(e) => handleFile(e.target.files?.[0])}
    />
  );
  return { open: () => inputRef.current?.click(), busy, input, handleFile };
}

/** Aceita arrastar e soltar a imagem em cima da área */
function dropProps(handleFile: (f?: File) => void, setOver: (v: boolean) => void) {
  return {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      setOver(true);
    },
    onDragLeave: () => setOver(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setOver(false);
      handleFile(e.dataTransfer.files?.[0]);
    },
  };
}

interface BrandImagesProps {
  name: string;
  logoUrl?: string | null;
  coverUrl?: string | null;
  primary: string;
  secondary: string;
  onLogoChange: (url: string | null) => void;
  onCoverChange: (url: string | null) => void;
}

/**
 * Capa + logo num lugar só, montados como aparecem na página pública.
 * Clique (ou arraste uma imagem) em cada área para trocar.
 */
export function BrandImagesEditor({ name, logoUrl, coverUrl, primary, secondary, onLogoChange, onCoverChange }: BrandImagesProps) {
  const cover = useImagePicker("cover", onCoverChange);
  const logo = useImagePicker("logo", onLogoChange);
  const [coverOver, setCoverOver] = React.useState(false);
  const [logoOver, setLogoOver] = React.useState(false);

  return (
    <div>
      {cover.input}
      {logo.input}

      <div
        role="button"
        tabIndex={0}
        onClick={cover.open}
        onKeyDown={(e) => e.key === "Enter" && cover.open()}
        {...dropProps(cover.handleFile, setCoverOver)}
        style={heroBackground(primary, secondary, coverUrl)}
        className={cn(
          "group relative flex h-36 cursor-pointer items-center justify-center overflow-hidden rounded-2xl transition sm:h-44",
          coverOver && "ring-4 ring-sky-400",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2 rounded-full bg-black/45 px-3.5 py-2 text-sm font-medium text-white backdrop-blur transition",
            coverUrl && !cover.busy && "opacity-0 group-hover:opacity-100 max-sm:opacity-100",
          )}
        >
          {cover.busy ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
          {cover.busy ? "Enviando…" : coverUrl ? "Trocar capa" : "Adicionar capa"}
        </div>
        {coverUrl && !cover.busy && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCoverChange(null);
            }}
            className="absolute top-2.5 right-2.5 rounded-full bg-black/45 p-2 text-white backdrop-blur hover:bg-black/65"
            aria-label="Remover capa"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>

      <div className="-mt-10 flex items-start gap-3 px-4">
        <div className="relative">
          <button
            type="button"
            onClick={logo.open}
            {...dropProps(logo.handleFile, setLogoOver)}
            className={cn(
              "relative flex size-20 items-center justify-center overflow-hidden rounded-3xl border-4 border-white bg-cover bg-center text-2xl font-bold shadow-lg transition sm:size-24",
              logoOver && "ring-4 ring-sky-400",
            )}
            style={{
              backgroundColor: secondary,
              color: readableOn(secondary),
              backgroundImage: logoUrl ? `url(${logoUrl})` : undefined,
            }}
            aria-label={logoUrl ? "Trocar logo" : "Adicionar logo"}
          >
            {logo.busy ? <Loader2 className="size-6 animate-spin text-white" /> : !logoUrl && (name?.[0]?.toUpperCase() ?? "?")}
          </button>
          <span className="pointer-events-none absolute -right-1 -bottom-1 rounded-full bg-zinc-900 p-1.5 text-white ring-2 ring-white">
            <Camera className="size-3.5" />
          </span>
        </div>
        <div className="flex-1 pt-12 text-xs text-zinc-500 sm:pt-[3.25rem]">
          <p>
            <strong className="text-zinc-700">Logo</strong> quadrado · <strong className="text-zinc-700">Capa</strong> horizontal
          </p>
          <p>Toque para escolher ou arraste a imagem. A gente otimiza o tamanho.</p>
          {logoUrl && (
            <button type="button" onClick={() => onLogoChange(null)} className="mt-1 font-medium text-red-600 hover:underline">
              Remover logo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Foto redonda de profissional com botão de trocar */
export function AvatarUpload({ name, value, onChange }: { name: string; value?: string | null; onChange: (url: string | null) => void }) {
  const picker = useImagePicker("avatar", onChange);
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

  return (
    <div className="flex items-center gap-4">
      {picker.input}
      <button
        type="button"
        onClick={picker.open}
        className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-200 bg-cover bg-center text-xl font-semibold text-zinc-600"
        style={{ backgroundImage: value ? `url(${value})` : undefined }}
        aria-label="Trocar foto"
      >
        {picker.busy ? <Loader2 className="size-6 animate-spin" /> : !value && (initials || <Camera className="size-6" />)}
      </button>
      <div className="space-y-1 text-sm">
        <button type="button" onClick={picker.open} className="block font-medium text-zinc-900 hover:underline">
          {value ? "Trocar foto" : "Adicionar foto"}
        </button>
        {value && (
          <button type="button" onClick={() => onChange(null)} className="block text-red-600 hover:underline">
            Remover
          </button>
        )}
      </div>
    </div>
  );
}
