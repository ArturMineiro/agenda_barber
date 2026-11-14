import * as React from "react";
import { toast } from "sonner";
import { changePasswordSchema } from "@navalha/shared";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { ApiError, errorMessage } from "@/lib/api";
import { meKey, useChangePassword } from "./api";
import { useQueryClient } from "@tanstack/react-query";
import type { User } from "@/types/api";

const EMPTY = { currentPassword: "", newPassword: "", confirm: "" };

interface Props {
  open: boolean;
  onClose: () => void;
  /** entrou com senha temporária: não dá para fechar sem criar a própria (só sair) */
  forced?: boolean;
  onLogout?: () => void;
}

/** Troca de senha de quem está logado (dono da barbearia, barbeiro ou admin) */
export function ChangePasswordDialog({ open, onClose, forced, onLogout }: Props) {
  const change = useChangePassword();
  const qc = useQueryClient();
  const [form, setForm] = React.useState(EMPTY);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open) {
      setForm(EMPTY);
      setErrors({});
    }
  }, [open]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const parsed = changePasswordSchema.safeParse(form);
    const errs: Record<string, string> = {};
    if (!parsed.success) for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
    if (form.confirm !== form.newPassword) errs.confirm ??= "As senhas não conferem";
    setErrors(errs);
    if (!parsed.success || Object.keys(errs).length) return;

    change.mutate(parsed.data, {
      onSuccess: () => {
        qc.setQueryData<User | null>(meKey, (u) => (u ? { ...u, mustChangePassword: false } : u));
        toast.success(forced ? "Senha criada. Use ela nos próximos acessos." : "Senha alterada. Os outros aparelhos vão pedir para entrar de novo.");
        onClose();
      },
      onError: (err) => {
        if (err instanceof ApiError && err.code === "WRONG_PASSWORD") setErrors({ currentPassword: err.message });
        else toast.error(errorMessage(err));
      },
    });
  };

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Dialog
      open={open}
      onClose={forced ? () => {} : onClose}
      title={forced ? "Crie sua senha" : "Alterar senha"}
      description={forced ? "Você entrou com uma senha temporária. Escolha uma senha só sua para continuar." : undefined}
      footer={
        <>
          {forced ? (
            <Button variant="outline" onClick={onLogout} className="flex-1 sm:flex-none">
              Sair
            </Button>
          ) : (
            <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none">
              Cancelar
            </Button>
          )}
          <Button onClick={() => submit()} loading={change.isPending} className="flex-1 sm:flex-none">
            Salvar senha
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label={forced ? "Senha temporária" : "Senha atual"} error={errors.currentPassword}>
          <Input type="password" autoComplete="current-password" value={form.currentPassword} onChange={set("currentPassword")} aria-invalid={!!errors.currentPassword} />
        </Field>
        <Field label="Nova senha" error={errors.newPassword} hint="Mínimo de 8 caracteres">
          <Input type="password" autoComplete="new-password" value={form.newPassword} onChange={set("newPassword")} aria-invalid={!!errors.newPassword} />
        </Field>
        <Field label="Repita a nova senha" error={errors.confirm}>
          <Input type="password" autoComplete="new-password" value={form.confirm} onChange={set("confirm")} aria-invalid={!!errors.confirm} />
        </Field>
        {/* Enter envia o formulário */}
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}
