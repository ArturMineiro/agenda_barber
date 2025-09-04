// app/teste.tsx
import { View, Text } from "react-native";

export default function TesteScreen() {
  console.log("Tela de teste renderizada"); // Verifique o console do navegador ou do Expo
  return (
    <View className="flex-1 items-center justify-center bg-purple-500">
      <Text className="text-white text-3xl font-bold">Tela de Teste ✅</Text>
      <Text className="text-white mt-2 text-lg">
        Se você está vendo isso, a rota funciona!
      </Text>
    </View>
  );
}
