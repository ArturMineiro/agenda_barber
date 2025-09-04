import { View, Text } from "react-native";

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-8">
      <View className="bg-white rounded-3xl p-6 shadow-lg">
        <Text className="text-4xl font-extrabold text-center text-black mb-4">
          Tailwind Funciona! 🚀
        </Text>
        <Text className="text-lg text-gray-700 text-center">
          Se você está vendo isso colorido e centralizado, o NativeWind está ativo!
        </Text>
      </View>
      <View className="mt-8 flex-row gap-4">
        <View className="w-16 h-16 bg-red-500 rounded-full" />
        <View className="w-16 h-16 bg-yellow-400 rounded-full" />
        <View className="w-16 h-16 bg-green-500 rounded-full" />
      </View>
    </View>
  );
}
