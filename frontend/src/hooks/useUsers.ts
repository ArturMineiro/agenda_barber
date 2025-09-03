import { useQuery } from "@tanstack/react-query";
import { fetchUsers } from "../service/UserService";
import { usersSchema, type Users } from "../schemas/userSchema";

export const useUsers = () => {
  return useQuery<Users>({
    queryKey: ["users"],
    queryFn: async () => {
      const data = await fetchUsers();
      // valida com zod
      return usersSchema.parse(data);
    },
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
};
