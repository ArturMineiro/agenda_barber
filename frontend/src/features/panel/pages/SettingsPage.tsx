import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, Instagram, ListOrdered, MapPin } from "lucide-react";
import { barbershopSettingsSchema, SLOT_INTERVALS, type BarbershopSettingsInput } from "@navalha/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/misc";
import { ApiError } from "@/lib/api";
import { cn, maskPhone, formatPhone } from "@/lib/utils";
import { heroBackground, readableOn } from "@/lib/theme";
import { BrandImagesEditor } from "@/components/ImageUpload";
import { ThemePicker } from "@/components/ThemePicker";
import type { Barbershop } from "@/types/api";
import { useBarbershop, useUpdateBarbershop } from "../api";

const MODE_OPTIONS = [
  {
    value: "SCHEDULE" as const,
    title: "Com horário marcado",
    text: "O cliente escolhe dia e horário pelo seu link.",
    icon: CalendarDays,
  },
  {
    value: "QUEUE" as const,
    title: "Por ordem de chegada",
    text: "Fila na barbearia. O link mostra quantas pessoas esperam e o tempo estimado.",
    icon: ListOrdered,
  },
];

const CANCEL_OPTIONS = [
  { v: 0, l: "Até a hora do horário" },
  { v: 60, l: "1 hora antes" },
  { v: 120, l: "2 horas antes" },
  { v: 240, l: "4 horas antes" },
  { v: 720, l: "12 horas antes" },
  { v: 1440, l: "1 dia antes" },
];

const ADVANCE_OPTIONS = [
  { v: 0, l: "Sem antecedência" },
  { v: 30, l: "30 minutos" },
  { v: 60, l: "1 hora" },
  { v: 120, l: "2 horas" },
  { v: 240, l: "4 horas" },
  { v: 1440, l: "1 dia" },
];

function toForm(s: Barbershop): BarbershopSettingsInput {
  return {
    name: s.name,
    slug: s.slug,
    description: s.description ?? "",
    phone: formatPhone(s.phone),
    whatsapp: formatPhone(s.whatsapp),
    instagram: s.instagram ?? "",
    address: s.address ?? "",
    city: s.city ?? "",
    logoUrl: s.logoUrl ?? "",
    coverUrl: s.coverUrl ?? "",
    primaryColor: s.primaryColor,
    secondaryColor: s.secondaryColor,
    bookingMode: s.bookingMode,
    slotIntervalMinutes: s.slotIntervalMinutes,
    minAdvanceMinutes: s.minAdvanceMinutes,
    maxAdvanceDays: s.maxAdvanceDays,
    cancelMinAdvanceMinutes: s.cancelMinAdvanceMinutes,
  };
}

export function SettingsPage() {
  const { data: shop } = useBarbershop();
  const update = useUpdateBarbershop();

  const form = useForm({
    resolver: zodResolver(barbershopSettingsSchema),
    values: shop ? toForm(shop) : undefined,
    resetOptions: { keepDirtyValues: true },
  });
  const { errors, isDirty } = form.formState;
  const preview = useWatch({ control: form.control });

  const onSubmit = form.handleSubmit((values) =>
    update.mutate(values, {
      onError: (err) => {
        if (err instanceof ApiError && err.code === "SLUG_TAKEN") form.setError("slug", { message: err.message });
      },
    }),
  );

  if (!shop) return null;
  const primary = preview.primaryColor ?? shop.primaryColor;
  const secondary = preview.secondaryColor ?? shop.secondaryColor;

  return (
    <form onSubmit={onSubmit} className="pb-20 lg:pb-0">
      <PageHeader title="Ajustes" description="Deixe sua página com a cara da sua barbearia." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Aparência</CardTitle>
                <p className="mt-0.5 text-sm text-zinc-500">É assim que o topo da sua página aparece para o cliente.</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <BrandImagesEditor
                name={preview.name ?? ""}
                logoUrl={preview.logoUrl}
                coverUrl={preview.coverUrl}
                primary={preview.primaryColor ?? shop.primaryColor}
                secondary={preview.secondaryColor ?? shop.secondaryColor}
                onLogoChange={(url) => form.setValue("logoUrl", url ?? "", { shouldDirty: true })}
                onCoverChange={(url) => form.setValue("coverUrl", url ?? "", { shouldDirty: true })}
              />
              <Field label="Paleta de cores">
                <ThemePicker
                  primary={preview.primaryColor ?? shop.primaryColor}
                  secondary={preview.secondaryColor ?? shop.secondaryColor}
                  onChange={({ primary, secondary }) => {
                    form.setValue("primaryColor", primary, { shouldDirty: true });
                    form.setValue("secondaryColor", secondary, { shouldDirty: true });
                  }}
                />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Identidade</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Nome da barbearia" error={errors.name?.message}>
                <Input aria-invalid={!!errors.name} {...form.register("name")} />
              </Field>
              <Field label="Link" error={errors.slug?.message} hint="Se mudar, o link antigo para de funcionar.">
                <div className="flex items-center rounded-xl border border-zinc-200 bg-white focus-within:border-zinc-900">
                  <span className="pl-3.5 text-sm text-zinc-400">{window.location.host}/</span>
                  <input className="h-11 min-w-0 flex-1 bg-transparent pr-3 outline-none" {...form.register("slug")} />
                </div>
              </Field>
              <Field label="Descrição" error={errors.description?.message}>
                <Textarea rows={3} placeholder="Conte um pouco sobre o seu espaço, estilo, diferenciais…" {...form.register("description")} />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contato e endereço</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="WhatsApp" error={errors.whatsapp?.message}>
                <Input inputMode="tel" {...form.register("whatsapp", { onChange: (e) => (e.target.value = maskPhone(e.target.value)) })} />
              </Field>
              <Field label="Telefone" error={errors.phone?.message}>
                <Input inputMode="tel" {...form.register("phone", { onChange: (e) => (e.target.value = maskPhone(e.target.value)) })} />
              </Field>
              <Field label="Instagram" error={errors.instagram?.message}>
                <Input placeholder="@suabarbearia" {...form.register("instagram")} />
              </Field>
              <Field label="Cidade" error={errors.city?.message}>
                <Input {...form.register("city")} />
              </Field>
              <Field label="Endereço" error={errors.address?.message} className="sm:col-span-2">
                <Input placeholder="Rua, número, bairro" {...form.register("address")} />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Como você atende</CardTitle>
                <p className="mt-0.5 text-sm text-zinc-500">Muda o que o cliente vê no seu link e a tela principal do painel.</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                {MODE_OPTIONS.map((opt) => {
                  const active = preview.bookingMode === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => form.setValue("bookingMode", opt.value, { shouldDirty: true })}
                      className={cn(
                        "flex gap-3 rounded-2xl border p-4 text-left transition",
                        active ? "border-zinc-900 bg-zinc-900 text-white shadow-lg" : "border-zinc-200 hover:border-zinc-300",
                      )}
                    >
                      <opt.icon className={cn("mt-0.5 size-5 shrink-0", active ? "text-amber-400" : "text-zinc-400")} />
                      <span>
                        <span className="block text-sm font-semibold">{opt.title}</span>
                        <span className={cn("mt-0.5 block text-xs", active ? "text-zinc-300" : "text-zinc-500")}>{opt.text}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {preview.bookingMode === "SCHEDULE" && (
              <div className="grid gap-4 border-t border-zinc-100 pt-5 sm:grid-cols-3">
              <Field label="Intervalo entre horários">
                <Select {...form.register("slotIntervalMinutes", { valueAsNumber: true })}>
                  {SLOT_INTERVALS.map((v) => (
                    <option key={v} value={v}>
                      {v} min
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Antecedência mínima">
                <Select {...form.register("minAdvanceMinutes", { valueAsNumber: true })}>
                  {ADVANCE_OPTIONS.map((o) => (
                    <option key={o.v} value={o.v}>
                      {o.l}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Agenda aberta por" error={errors.maxAdvanceDays?.message}>
                <Select {...form.register("maxAdvanceDays", { valueAsNumber: true })}>
                  {[7, 14, 30, 60, 90].map((d) => (
                    <option key={d} value={d}>
                      {d} dias
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Cliente pode cancelar/remarcar até"
                hint="Depois desse prazo, só falando com você."
                className="sm:col-span-3 sm:max-w-xs"
              >
                <Select {...form.register("cancelMinAdvanceMinutes", { valueAsNumber: true })}>
                  {CANCEL_OPTIONS.map((o) => (
                    <option key={o.v} value={o.v}>
                      {o.l}
                    </option>
                  ))}
                </Select>
              </Field>
              </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Prévia da página pública */}
        <div className="hidden lg:block">
          <div className="sticky top-8">
            <p className="mb-2 text-sm font-medium text-zinc-500">Prévia</p>
            <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-lg">
              <div className="h-28" style={heroBackground(primary, secondary, preview.coverUrl)} />
              <div className="relative -mt-8 px-5 pb-5">
                <div
                  className="flex size-16 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-cover bg-center text-xl font-bold"
                  style={{
                    backgroundColor: secondary,
                    color: readableOn(secondary),
                    backgroundImage: preview.logoUrl ? `url(${preview.logoUrl})` : undefined,
                  }}
                >
                  {!preview.logoUrl && preview.name?.[0]}
                </div>
                <p className="mt-2 font-display text-xl font-semibold">{preview.name}</p>
                {preview.city && (
                  <p className="mt-0.5 flex items-center gap-1 text-sm text-zinc-500">
                    <MapPin className="size-3.5" /> {preview.city}
                  </p>
                )}
                {preview.instagram && (
                  <p className="mt-0.5 flex items-center gap-1 text-sm text-zinc-500">
                    <Instagram className="size-3.5" /> @{String(preview.instagram).replace(/^@/, "")}
                  </p>
                )}
                {preview.description && <p className="mt-3 line-clamp-3 text-sm text-zinc-600">{preview.description}</p>}
                <div className="mt-4 rounded-xl py-2.5 text-center text-sm font-semibold" style={{ background: primary, color: readableOn(primary) }}>
                  Agendar horário
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* barra de salvar fixa */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-[68px] z-20 border-t border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur transition lg:static lg:mt-6 lg:border-0 lg:bg-transparent lg:p-0",
          !isDirty && "max-lg:translate-y-[200%]",
        )}
      >
        <div className="mx-auto flex max-w-6xl justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => form.reset(toForm(shop))} disabled={!isDirty}>
            Descartar
          </Button>
          <Button type="submit" loading={update.isPending} disabled={!isDirty}>
            Salvar alterações
          </Button>
        </div>
      </div>
    </form>
  );
}
