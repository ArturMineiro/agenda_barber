import * as React from "react";
import { Link } from "react-router-dom";
import { CalendarCheck, Link2, Smartphone } from "lucide-react";
import { Logo } from "@/components/Logo";

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-[1fr_1.1fr]">
      <div className="relative hidden overflow-hidden bg-zinc-950 p-10 text-white lg:flex lg:flex-col">
        <div className="absolute -top-32 -right-32 size-96 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 size-72 rounded-full bg-amber-700/10 blur-3xl" />
        <Link to="/" className="relative">
          <Logo light />
        </Link>
        <div className="relative mt-auto max-w-md">
          <h2 className="font-display text-4xl leading-tight font-semibold">
            Sua agenda cheia, <span className="text-amber-400">sem mensagem no WhatsApp.</span>
          </h2>
          <ul className="mt-8 space-y-4 text-zinc-300">
            {[
              { icon: Link2, text: "Link próprio para seus clientes agendarem sozinhos" },
              { icon: CalendarCheck, text: "Agenda organizada por profissional, sem conflito de horário" },
              { icon: Smartphone, text: "Feito para usar no celular, entre um corte e outro" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="rounded-lg bg-white/10 p-2">
                  <Icon className="size-4 text-amber-400" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-col px-5 py-8 sm:px-10">
        <Link to="/" className="lg:hidden">
          <Logo />
        </Link>
        <div className="mx-auto my-auto w-full max-w-md py-8">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-zinc-500">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
