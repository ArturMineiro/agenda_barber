import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CalendarDays, Check, ListOrdered, Loader2, User, Users, X } from "lucide-react";
import { registerOwnerSchema, slugify, type BookingMode, type TeamType } from "@navalha/shared";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { ApiError, errorMessage } from "@/lib/api";
import { cn, maskPhone } from "@/lib/utils";
import { AuthLayout } from "./AuthLayout";
import { SupportLink } from "@/lib/support";
import { checkSlug, useRegister } from "./api";

const TEAM_OPTIONS: { value: TeamType; title: string; text: string; icon: typeof User }[] = [
  { value: "SOLO", title: "Trabalho sozinho", text: "Sou barbeiro autônomo ou atendo sem equipe", icon: User },
  { value: "TEAM", title: "Tenho equipe", text: "Barbearia com mais de um profissional", icon: Users },
];

const MODE_OPTIONS: { value: BookingMode; label: string; icon: typeof User }[] = [
  { value: "SCHEDULE", label: "Horário marcado", icon: CalendarDays },
  { value: "QUEUE", label: "Ordem de chegada", icon: ListOrdered },
];

type SlugState = "idle" | "checking" | "ok" | "taken";

export function RegisterPage() {
  const [step, setStep] = React.useState<1 | 2>(1);
  const [slugState, setSlugState] = React.useState<SlugState>("idle");
  const slugEdited = React.useRef(false);
  const register = useRegister();
  const navigate = useNavigate();

  const form = useForm({
    resolver: zodResolver(registerOwnerSchema),
    mode: "onTouched",
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      barbershop: { name: "", slug: "", teamType: "SOLO" as TeamType, bookingMode: "SCHEDULE" as BookingMode, city: "" },
    },
  });
  const { errors } = form.formState;
  const shopName = useWatch({ control: form.control, name: "barbershop.name" });
  const slug = useWatch({ control: form.control, name: "barbershop.slug" });

  // link sugerido a partir do nome, até o usuário editar manualmente
  React.useEffect(() => {
    if (!slugEdited.current) form.setValue("barbershop.slug", slugify(shopName));
  }, [shopName, form]);

  // checa disponibilidade do link com debounce
  React.useEffect(() => {
    if (!slug || slug.length < 3) return setSlugState("idle");
    setSlugState("checking");
    const t = setTimeout(async () => {
      try {
        const r = await checkSlug(slug);
        setSlugState(r.available ? "ok" : "taken");
      } catch {
        setSlugState("idle");
      }
    }, 400);
    return () => clearTimeout(t);
  }, [slug]);

  const next = async () => {
    const ok = await form.trigger(["barbershop.name", "barbershop.slug", "barbershop.city", "barbershop.teamType", "barbershop.bookingMode"]);
    if (ok && slugState !== "taken") setStep(2);
  };

  const onSubmit = form.handleSubmit((values) =>
    register.mutate(values, {
      onSuccess: () => navigate("/painel", { replace: true }),
      onError: (err) => {
        if (err instanceof ApiError && err.code === "SLUG_TAKEN") {
          setStep(1);
          form.setError("barbershop.slug", { message: err.message });
        }
        if (err instanceof ApiError && err.code === "EMAIL_TAKEN") form.setError("email", { message: err.message });
      },
    }),
  );

  return (
    <AuthLayout
      title={step === 1 ? "Cadastre sua barbearia" : "Agora, seus dados"}
      subtitle={
        step === 1 ? (
          <>
            Já tem conta?{" "}
            <Link to="/entrar" className="font-medium text-zinc-900 underline underline-offset-4">
              Entrar
            </Link>
          </>
        ) : (
          "Você vai usar esse e-mail e senha para acessar o painel."
        )
      }
    >
      <div className="mb-6 flex gap-2">
        {[1, 2].map((s) => (
          <div key={s} className={cn("h-1.5 flex-1 rounded-full transition", s <= step ? "bg-zinc-900" : "bg-zinc-200")} />
        ))}
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {step === 1 && (
          <div className="space-y-4 animate-in">
            <Controller
              control={form.control}
              name="barbershop.teamType"
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-3">
                  {TEAM_OPTIONS.map((opt) => (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() => field.onChange(opt.value)}
                      className={cn(
                        "rounded-2xl border p-4 text-left transition",
                        field.value === opt.value
                          ? "border-zinc-900 bg-zinc-900 text-white shadow-lg"
                          : "border-zinc-200 bg-white hover:border-zinc-300",
                      )}
                    >
                      <opt.icon className={cn("mb-2 size-5", field.value === opt.value ? "text-amber-400" : "text-zinc-400")} />
                      <p className="text-sm font-semibold">{opt.title}</p>
                      <p className={cn("mt-0.5 text-xs", field.value === opt.value ? "text-zinc-300" : "text-zinc-500")}>{opt.text}</p>
                    </button>
                  ))}
                </div>
              )}
            />

            <Field label="Como você atende?">
              <Controller
                control={form.control}
                name="barbershop.bookingMode"
                render={({ field }) => (
                  <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1">
                    {MODE_OPTIONS.map((opt) => (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() => field.onChange(opt.value)}
                        className={cn(
                          "flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition",
                          field.value === opt.value ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-800",
                        )}
                      >
                        <opt.icon className="size-4" />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              />
            </Field>

            <Field label="Nome da barbearia" htmlFor="shop" error={errors.barbershop?.name?.message}>
              <Input id="shop" placeholder="Ex.: Barbearia do Zé" aria-invalid={!!errors.barbershop?.name} {...form.register("barbershop.name")} />
            </Field>

            <Field
              label="Seu link de agendamento"
              htmlFor="slug"
              error={errors.barbershop?.slug?.message ?? (slugState === "taken" ? "Este link já está em uso" : undefined)}
              hint="É esse link que você vai mandar para os clientes."
            >
              <div className="flex items-center rounded-xl border border-zinc-200 bg-white focus-within:border-zinc-900 focus-within:ring-4 focus-within:ring-zinc-900/5">
                <span className="pl-3.5 text-sm text-zinc-400 select-none">{window.location.host}/</span>
                <input
                  id="slug"
                  className="h-11 min-w-0 flex-1 bg-transparent pr-2 outline-none"
                  {...form.register("barbershop.slug", {
                    onChange: (e) => {
                      slugEdited.current = true;
                      e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                    },
                  })}
                />
                <span className="pr-3">
                  {slugState === "checking" && <Loader2 className="size-4 animate-spin text-zinc-400" />}
                  {slugState === "ok" && <Check className="size-4 text-emerald-600" />}
                  {slugState === "taken" && <X className="size-4 text-red-500" />}
                </span>
              </div>
            </Field>

            <Field label="Cidade" htmlFor="city" error={errors.barbershop?.city?.message}>
              <Input id="city" placeholder="Ex.: São Paulo" aria-invalid={!!errors.barbershop?.city} {...form.register("barbershop.city")} />
            </Field>

            <Button type="button" size="lg" className="w-full" onClick={next}>
              Continuar
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-in">
            {register.isError && !(register.error instanceof ApiError && register.error.code) && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">{errorMessage(register.error)}</div>
            )}
            <Field label="Seu nome" htmlFor="name" error={errors.name?.message}>
              <Input id="name" autoComplete="name" aria-invalid={!!errors.name} {...form.register("name")} />
            </Field>
            <Field label="WhatsApp" htmlFor="phone" error={errors.phone?.message}>
              <Input
                id="phone"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(11) 99999-0000"
                aria-invalid={!!errors.phone}
                {...form.register("phone", { onChange: (e) => (e.target.value = maskPhone(e.target.value)) })}
              />
            </Field>
            <Field label="E-mail" htmlFor="email" error={errors.email?.message}>
              <Input id="email" type="email" inputMode="email" autoComplete="email" aria-invalid={!!errors.email} {...form.register("email")} />
            </Field>
            <Field label="Senha" htmlFor="password" error={errors.password?.message} hint="Mínimo de 8 caracteres">
              <Input id="password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} {...form.register("password")} />
            </Field>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" size="lg" onClick={() => setStep(1)}>
                <ArrowLeft />
              </Button>
              <Button type="submit" size="lg" className="flex-1" loading={register.isPending}>
                Criar conta
              </Button>
            </div>
            <p className="text-center text-xs text-zinc-500">
              Sua barbearia passa por uma aprovação rápida. Enquanto isso, você já pode configurar tudo.
            </p>
            <p className="text-center text-xs text-zinc-500">
              <SupportLink message="Olá! Estou me cadastrando no Navalha e tenho uma dúvida." showNumber>
                Dúvidas? Fale com a gente
              </SupportLink>
            </p>
          </div>
        )}
      </form>
    </AuthLayout>
  );
}
