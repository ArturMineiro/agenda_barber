import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

type DropdownProps = {
  setMenuOpen: (open: boolean) => void;
};

export default function DropdownMenu({ setMenuOpen }: DropdownProps) {
  const router = useRouter();

  return (
    <View className="absolute top-16 right-4 bg-gray-800 rounded shadow-lg p-2 z-50">
      <TouchableOpacity
        className="px-4 py-2"
        onPress={() => {
          router.push("/login");
          setMenuOpen(false);
        }}
      >
        <Text className="text-white">Login</Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="px-4 py-2"
        onPress={() => {
          router.push("/");
          setMenuOpen(false);
        }}
      >
        <Text className="text-white">Cadastrar Barbearia</Text>
      </TouchableOpacity>
    </View>
  );
}
