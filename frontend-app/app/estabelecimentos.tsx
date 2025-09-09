import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function EstabelecimentosScreen() {
  const router = useRouter();

  // Exemplo de estabelecimentos iniciais
  const estabelecimentos = [
    { id: 1, nome: "Barbearia do João", endereco: "Rua A, 123" },
    { id: 2, nome: "Corte Fino", endereco: "Av. B, 456" },
    { id: 3, nome: "Estilo Barber", endereco: "Praça C, 789" },
  ];

  return (
    <ScrollView className="flex-1 bg-black p-4">
      <Text className="text-white text-3xl font-bold mb-6 text-center">
        Estabelecimentos
      </Text>

      {estabelecimentos.map((est) => (
        <TouchableOpacity
          key={est.id}
          className="bg-grayDark rounded-xl p-4 mb-4"
          onPress={() => router.push(`/`)}
        >
          <Text className="text-white text-xl font-bold">{est.nome}</Text>
          <Text className="text-gray-400">{est.endereco}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
