import { View, Text, TouchableOpacity, Image } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context"; // ✅ IMPORTA AQUI
import tesourapente from "../assets/images/tesoura-e-pente.png";

type NavbarProps = {
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
};

export default function Navbar({ menuOpen, setMenuOpen }: NavbarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets(); // ✅ USA O HOOK AQUI

  return (
    <View style={{ paddingTop: insets.top }}> {/* ✅ APLICA O PADDING */}
      <View className="bg-black p-4 flex-row items-center justify-between">
        {/* Logo */}
        <TouchableOpacity
          className="flex-row items-center flex-1"
          onPress={() => router.push("/")}
        >
          <Image
            source={tesourapente}
            style={{ width: 24, height: 24, tintColor: '#68C5DB', marginRight: 4 }}
          />
          <Text style={{ fontFamily: 'Georgia', fontSize: 28, color: '#68C5DB' }}>DAJ</Text>
          <Text className="text-white text-xl font-bold ml-2">CORTEZ</Text>
        </TouchableOpacity>

        {/* Menu Hamburguer */}
        <TouchableOpacity
          onPress={() => setMenuOpen(!menuOpen)}
          className="flex-col justify-between h-4 w-6"
        >
          <View className="h-[2px] w-full bg-white rounded" />
          <View className="h-[2px] w-full bg-white rounded my-1" />
          <View className="h-[2px] w-full bg-white rounded" />
        </TouchableOpacity>
      </View>

      <View className="h-[1px]" style={{ backgroundColor: 'rgba(115, 128, 150, 0.8)' }} />
    </View>
  );
}
