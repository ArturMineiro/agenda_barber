import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@navalha/shared";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { errorMessage } from "@/lib/api";
import { AuthLayout } from "./AuthLayout";
import { homeFor, useLogin } from "./api";

export function LoginPage() {
  const login = useLogin();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const form = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) =>
    login.mutate(values, {
      onSuccess: ({ user }) => navigate(from ?? homeFor(user), { replace: true }),
    }),
  );

  return (
    <AuthLayout
      title="Bem-vindo de volta"
      subtitle={
        <>
          Ainda não tem conta?{" "}
          <Link to="/cadastro" className="font-medium text-zinc-900 underline underline-offset-4">
            Cadastre sua barbearia
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {login.isError && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">{errorMessage(login.error)}</div>
        )}
        <Field label="E-mail" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" inputMode="email" aria-invalid={!!errors.email} {...form.register("email")} />
        </Field>
        <Field label="Senha" htmlFor="password" error={errors.password?.message}>
          <Input id="password" type="password" autoComplete="current-password" aria-invalid={!!errors.password} {...form.register("password")} />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={login.isPending}>
          Entrar
        </Button>
      </form>
    </AuthLayout>
  );
}
