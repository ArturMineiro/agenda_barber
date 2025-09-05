import { View, Text, TouchableOpacity, Image } from "react-native";

type NavbarProps = {
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
};

export default function Navbar({ menuOpen, setMenuOpen }: NavbarProps) {
  return (
    <View>
      <View className="bg-black p-4 flex-row items-center justify-between">
        <Text className="text-white font-bold text-xl flex-1 flex-row items-center">
          {/* Ícone de tesoura como imagem */}
          <Image
          source={require('/home/crase/agenda_barber/agenda_barber/frontend-app/assets/images/tesoura-e-pente.png')}
              style={{ width: 24, height: 24, tintColor: '#68C5DB', marginRight: 1 }}
            />

            {/* ADJ com fonte diferenciada */}
            <Text style={{ fontFamily: 'Georgia', fontSize: 28, color: '#68C5DB' }}>ADJ</Text>

            {/* BARBER com fonte normal */}
            <Text className="text-white text-xl font-bold ml-2">BARBER</Text>
        </Text>

        {/* Hamburger moderno */}
        <TouchableOpacity
          onPress={() => setMenuOpen(!menuOpen)}
          className="flex-col justify-between h-4 w-6"
        >
          <View className="h-[2px] w-full bg-white rounded" />
          <View className="h-[2px] w-full bg-white rounded my-1" />
          <View className="h-[2px] w-full bg-white rounded" />
        </TouchableOpacity>
      </View>

      {/* Linha fina semi-transparente */}
      <View className="h-[1px]" style={{ backgroundColor: 'rgba(115, 128, 150, 0.8)' }} />
    </View>
  );
}
