// services/api.ts
const BASE_URL = "http://localhost:8080/api"; // ou 10.0.2.2 no Android Emulator

// Usuários
export async function fetchUsers() {
  const res = await fetch(`${BASE_URL}/users`);
  if (!res.ok) throw new Error("Erro ao buscar usuários");
  return res.json();
}

// Serviços
export async function fetchServicos() {
  const res = await fetch(`${BASE_URL}/servicos`);
  if (!res.ok) throw new Error("Erro ao buscar serviços");
  return res.json();
}
