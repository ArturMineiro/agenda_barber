import { Link } from "react-router-dom";
import { Bell, CalendarCheck, Check, Link2, Palette, Smartphone, User, Users } from "lucide-react";
import { APP_NAME } from "@navalha/shared";
import { Logo } from "@/components/Logo";
import { buttonVariants } from "@/components/ui/button";
import { SupportLink } from "@/lib/support";
import { cn } from "@/lib/utils";

const FEATURES = [
  { icon: Link2, title: "Seu link, sua página", text: "Um endereço próprio para colocar na bio do Instagram e mandar no WhatsApp." },
  { icon: CalendarCheck, title: "Sem conflito de horário", text: "O cliente só vê horários realmente livres, respeitando duração do serviço e pausas." },
  { icon: Palette, title: "Com a sua cara", text: "Logo, capa, cores e descrição. Sua página parece sua, não um sistema genérico." },
  { icon: Smartphone, title: "Feito para o celular", text: "Gerencie a agenda entre um corte e outro, direto do telefone." },
  { icon: Bell, title: "Agenda sempre atualizada", text: "Novos agendamentos aparecem sozinhos no painel." },
  { icon: Users, title: "Cresce com você", text: "Comece sozinho e adicione profissionais quando a equipe crescer." },
];

export function LandingPage() {
  return (
    <div className="bg-white">
      <header className="sticky top-0 z-30 border-b border-zinc-100 bg-white/85 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Logo />
          <div className="flex items-center gap-2">
            <Link to="/entrar" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Entrar
            </Link>
            <Link to="/cadastro" className={buttonVariants({ size: "sm" })}>
              Começar
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-zinc-950 text-white">
        <div className="absolute -top-40 right-0 size-[32rem] rounded-full bg-amber-500/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-amber-300 ring-1 ring-white/10">
              Agenda online para barbearias
            </span>
            <h1 className="mt-5 font-display text-4xl leading-[1.08] font-semibold tracking-tight sm:text-6xl">
              Pare de marcar horário <span className="text-amber-400">pelo WhatsApp.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-zinc-300">
              Seu cliente escolhe o serviço, o profissional e o horário em segundos. Você só aparece pra cortar.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/cadastro" className={cn(buttonVariants({ size: "lg" }), "bg-amber-500 text-zinc-950 hover:bg-amber-400")}>
                Cadastrar minha barbearia
              </Link>
              <Link to="/entrar" className={cn(buttonVariants({ size: "lg", variant: "ghost" }), "text-white hover:bg-white/10")}>
                Já tenho conta
              </Link>
            </div>
          </div>

          {/* mock do celular */}
          <div className="mx-auto w-full max-w-[300px]">
            <div className="rounded-[2.5rem] border-8 border-zinc-800 bg-zinc-50 p-0 shadow-2xl">
              <div className="h-20 rounded-t-[2rem] bg-gradient-to-br from-amber-500 to-amber-700" />
              <div className="-mt-7 px-4 pb-5 text-zinc-900">
                <div className="flex size-14 items-center justify-center rounded-2xl border-4 border-zinc-50 bg-zinc-900 text-lg font-bold text-white">Z</div>
                <p className="mt-2 font-display text-lg font-semibold">Barbearia do Zé</p>
                <p className="text-xs text-zinc-500">Centro · São Paulo</p>
                <div className="mt-4 space-y-2">
                  {[
                    ["Corte", "R$ 40"],
                    ["Barba", "R$ 30"],
                    ["Corte + Barba", "R$ 60"],
                  ].map(([n, p]) => (
                    <div key={n} className="flex justify-between rounded-xl bg-white px-3 py-2.5 text-sm shadow-xs ring-1 ring-zinc-200">
                      <span>{n}</span>
                      <span className="font-semibold">{p}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-4 gap-1.5">
                  {["09:00", "09:30", "10:00", "11:00"].map((t, i) => (
                    <div key={t} className={cn("rounded-lg py-1.5 text-center text-xs font-medium", i === 1 ? "bg-amber-600 text-white" : "bg-white ring-1 ring-zinc-200")}>
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <h2 className="text-center font-display text-3xl font-semibold tracking-tight">Para quem corta sozinho e para quem tem equipe</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-zinc-500">
          A maioria dos sistemas é pensada para salões grandes. O {APP_NAME} se adapta ao seu jeito de trabalhar.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {[
            {
              icon: User,
              title: "Barbeiro solo",
              items: ["Configuração em 5 minutos", "Só o essencial: serviços, horários e link", "Plano enxuto, preço justo"],
            },
            {
              icon: Users,
              title: "Barbearia com equipe",
              items: ["Agenda por profissional", "Cliente escolhe com quem cortar", "Controle de quem faz cada serviço"],
            },
          ].map((c) => (
            <div key={c.title} className="rounded-3xl border border-zinc-200 p-6 sm:p-8">
              <c.icon className="size-6 text-amber-600" />
              <h3 className="mt-3 text-xl font-semibold">{c.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {c.items.map((i) => (
                  <li key={i} className="flex items-center gap-2 text-zinc-600">
                    <Check className="size-4 text-emerald-600" /> {i}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-zinc-50 py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl bg-white p-6 ring-1 ring-zinc-200/70">
              <span className="inline-flex rounded-xl bg-amber-50 p-2.5 text-amber-700">
                <f.icon className="size-5" />
              </span>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-zinc-500">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:py-24">
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Pronto para encher a agenda?</h2>
        <p className="mt-3 text-zinc-500">Cadastre-se, configure seus serviços e comece a receber agendamentos assim que for aprovado.</p>
        <Link to="/cadastro" className={cn(buttonVariants({ size: "lg" }), "mt-8")}>
          Criar minha conta
        </Link>
        <p className="mt-5 text-sm text-zinc-500">
          <SupportLink message="Olá! Quero saber mais sobre o Navalha para minha barbearia." showNumber className="text-zinc-700">
            Prefere conversar? Chama no WhatsApp
          </SupportLink>
        </p>
      </section>

      <footer className="border-t border-zinc-100 py-8 text-center text-sm text-zinc-400">
        © {new Date().getFullYear()} {APP_NAME}
      </footer>
    </div>
  );
}
