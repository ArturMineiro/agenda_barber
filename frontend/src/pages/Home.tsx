import { useUsers } from "../hooks/useUsers";

export default function Home() {
  const { data, isLoading, error, refetch } = useUsers();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex flex-col items-center p-10">
      {/* Título */}
      <h1 className="text-5xl font-extrabold mb-8 text-blue-700 drop-shadow-sm">
        Agenda Barber ✂️
      </h1>

      <p className="text-lg text-gray-600 mb-12 text-center max-w-2xl">
        Gerencie seus agendamentos, clientes e barbeiros de forma simples e
        eficiente. Acompanhe tudo em tempo real direto do seu painel.
      </p>

      {/* Lista de usuários */}
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Usuários Cadastrados
        </h2>

        {isLoading && (
          <p className="text-gray-500 animate-pulse">Carregando usuários...</p>
        )}
        {error instanceof Error && (
          <p className="text-red-500 font-semibold">
            Erro ao buscar usuários: {error.message}
          </p>
        )}

        <ul className="divide-y divide-gray-200">
          {data?.map((user: { id: number; nome: string; email: string; tipo: string }) => (
            <li
              key={user.id}
              className="py-4 flex justify-between items-center hover:bg-gray-50 px-3 rounded-lg transition-colors"
            >
              <div>
                <p className="font-bold text-gray-700">{user.nome}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-full ${
                  user.tipo === "ADMIN"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-green-100 text-green-700"
                }`}
              >
                {user.tipo}
              </span>
            </li>
          ))}
        </ul>

        <button
          onClick={() => refetch()}
          className="mt-6 w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-xl shadow hover:bg-blue-700 transition-transform hover:scale-[1.02]"
        >
          🔄 Atualizar Lista
        </button>
      </div>

      <footer className="mt-10 text-gray-400 text-sm">
        © {new Date().getFullYear()} Agenda Barber
      </footer>
    </div>
  );
}
