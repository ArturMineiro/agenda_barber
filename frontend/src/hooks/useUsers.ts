import { useQuery } from "@tanstack/react-query";
import { fetchUsers } from "../service/UserService";

export const useUsers = () => {
  return useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
    staleTime: 1000 * 60 * 5, // cache 5 minutos
    retry: 1,
  });
};
