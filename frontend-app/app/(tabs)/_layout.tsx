import { View, Text, ScrollView } from "react-native";
import { useUsers } from "@/hooks/users/useUsers";
import { TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function HomeScreen() {
  const router = useRouter();
  const { data: users, isLoading, isError } = useUsers();

  return (
    <ScrollView className="flex-1 bg-black px-6 pt-16">
      {/* Cabeçalho */}
      <Text className="text-white text-4xl font-extrabold mb-1">Barbearia 🔥</Text>
      <Text className="text-red-500 text-lg mb-6">
        Lista de usuários cadastrados
      </Text>
      // exemplo dentro de Home.tsx
      <TouchableOpacity
        onPress={() => router.push("/teste")} // rota relativa ao app/
        className="bg-red-500 py-3 px-6 rounded-full items-center mb-6"
      >
        <Text className="text-white font-bold text-lg text-center">
          Ir para teste
        </Text>
      </TouchableOpacity>

      {/* Loading/Error */}
      {isLoading && (
        <Text className="text-gray-400 text-center mb-4">Carregando...</Text>
      )}
      {isError && (
        <Text className="text-red-500 text-center mb-4">
          Erro ao buscar usuários!
        </Text>
      )}

      {/* Lista de usuários */}
      {users?.map((user: any) => (
        <View
          key={user.id}
          className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-3xl p-6 mb-4 shadow-lg border border-red-600"
        >
          <Text className="text-white text-2xl font-bold mb-1">{user.name}</Text>
          <Text className="text-gray-400 text-lg">{user.email}</Text>
        </View>
      ))}

      {/* CTA */}
      <View className="mt-8 items-center mb-16">
        <View className="bg-red-500 px-8 py-4 rounded-2xl shadow-xl">
          <Text className="text-white font-bold text-lg text-center">
            Adicionar novo usuário
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
