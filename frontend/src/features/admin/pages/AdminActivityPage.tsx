import { PageHeader } from "@/components/ui/misc";
import { ActivityList } from "../components/ActivityList";

/** Tudo que aconteceu na plataforma: logins, alterações nos painéis, clientes e ações do admin */
export function AdminActivityPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Atividade" description="Quem fez o quê, em todas as barbearias. Toque numa linha para ver os detalhes." />
      <ActivityList showBarbershop />
    </div>
  );
}
