export const API_URL = "http://localhost:8080/api/users";

export const fetchUsers = async () => {
  const res = await fetch(API_URL);
  if (!res.ok) {
    throw new Error("Erro ao buscar usuários");
  }
  return res.json();
};
