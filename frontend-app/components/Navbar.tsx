import { View, Text, TouchableOpacity } from "react-native";

type NavbarProps = {
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
};

export default function Navbar({ menuOpen, setMenuOpen }: NavbarProps) {
  return (
    <View className="bg-gray-900 p-4 flex-row items-center justify-between">
      <Text className="text-white font-bold text-xl text-center flex-1">
        MeuApp
      </Text>

      <TouchableOpacity
        onPress={() => setMenuOpen(!menuOpen)}
        className="p-2 rounded bg-gray-800"
      >
        <Text className="text-white text-2xl">☰</Text>
      </TouchableOpacity>
    </View>
  );
}
