import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useUsers } from "./hooks/useUsers";

const queryClient = new QueryClient();

function App() {
  const { data, isLoading, error, refetch } = useUsers();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-100 flex flex-col items-center p-8">
        <h1 className="text-4xl font-bold mb-6 text-blue-600">
          Lista de Usuários
        </h1>

        <div className="w-full max-w-xl bg-white rounded-xl shadow-lg p-6">
          {isLoading && <p className="text-gray-500">Carregando...</p>}
          {error instanceof Error && (
            <p className="text-red-500 font-semibold">Erro: {error.message}</p>
          )}

          <ul className="divide-y divide-gray-200">
            {data?.map((user: any) => (
              <li
                key={user.id}
                className="py-3 flex justify-between items-center hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-gray-700">{user.nome}</span>
                <span className="text-gray-500">{user.email}</span>
                <span className="text-sm text-gray-400">{user.tipo}</span>
              </li>
            ))}
          </ul>

          <button
            className="mt-4 w-full py-2 px-4 bg-blue-500 text-white font-semibold rounded-lg shadow hover:bg-blue-600 transition"
            onClick={() => refetch()}
          >
            Atualizar Lista
          </button>
        </div>

        <p className="mt-6 text-gray-400 text-sm">
          Dados obtidos do backend local
        </p>
      </div>
    </QueryClientProvider>
  );
}

export default App;
