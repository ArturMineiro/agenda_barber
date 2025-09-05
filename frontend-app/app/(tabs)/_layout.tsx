import { View, Text, ScrollView, TextInput, Image, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ScrollView className="flex-1 bg-black px-4 pt-4">
      
      {/* Cabeçalho */}
      <Text className="text-white text-xl mb-1">Olá, Miguel!</Text>
      <Text className="text-gray mb-4">Sexta, 2 de Fevereiro</Text>

      {/* Busca */}
      <View className="flex-row mb-4 items-center">
        <TextInput
          placeholder="Buscar"
          placeholderTextColor="#888"
          className="flex-1 bg-grayDark rounded-full px-4 py-2 text-white"
        />
        <TouchableOpacity className="bg-primary ml-2 px-4 py-2 rounded-full">
          <Text className="text-white font-bold">🔍</Text>
        </TouchableOpacity>
      </View>

      {/* Filtros */}
      <View className="flex-row justify-between mb-6">
        {["✂️ Cabelo", "🧔 Barba", "🎨 Acabamento"].map((item) => (
          <TouchableOpacity key={item} className="bg-grayDark px-4 py-2 rounded-full">
            <Text className="text-white">{item}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {/* Banner Estilizado */}
<View
  style={{
    backgroundColor: '#68C5DB', // agora usando sua primary do Tailwind
    borderRadius: 24,            // cantos mais arredondados
    padding: 24,                 // padding maior
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8, // para Android
    marginBottom: 16, // espaçamento abaixo do banner
  }}
>
  {/* Texto */}
  <View style={{ flex: 1, marginRight: 20 }}>
    <Text style={{ color: 'white', fontSize: 22, fontWeight: 'bold', marginBottom: 6 }}>
      Agende nos melhores
    </Text>
    <Text style={{ color: 'white', fontSize: 18 }}>
      com ADJ Barber
    </Text>
  </View>

  {/* Ilustração */}
  <Image
    source={require('../../assets/images/melhores.png')}
    style={{
      width: 140,   // aumentando a imagem
      height: 140,
      borderRadius: 16, // cantos da imagem levemente arredondados
    }}
    resizeMode="contain"
  />
</View>


    {/* Agendamento */}
    <View className="bg-grayDark rounded-2xl p-4 mb-6 flex-row justify-between items-center">
      
      {/* Lado esquerdo */}
      <View className="flex-1">
        {/* Badge Confirmado */}
        <Text
          style={{
            backgroundColor: 'rgba(104, 197, 219, 0.2)',
            color: '#68C5DB',
            fontWeight: 'bold',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: 'rgba(104, 197, 219, 0.5)',
            paddingHorizontal: 8,
            paddingVertical: 2,
            alignSelf: 'flex-start',
            marginBottom: 6,
            fontSize: 12
          }}
        >
          Confirmado
        </Text>

        {/* Detalhes do corte */}
        <Text className="text-white text-lg font-bold">Corte de Cabelo</Text>
{/* Detalhes do corte */}
<View className="flex-row items-center mt-1">
  <Image
    source={require('/home/crase/agenda_barber/agenda_barber/frontend-app/assets/images/salao.png')}
    style={{ width: 20, height: 20, borderRadius: 10, marginRight: 6 }}
  />
  <Text className="text-gray text-sm">Vintage Barber</Text>
</View>

      </View>

      {/* Linha vertical separadora */}
      <View
        style={{
          width: 1,
          backgroundColor: 'rgba(255, 255, 255, 0.3)',
          height: '60%',
          marginHorizontal: 12,
          alignSelf: 'center'
        }}
      />

      {/* Lado direito: data e horário */}
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
          Fevereiro
        </Text>
        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 20 }}>
          06
        </Text>
        <View
          style={{
            marginTop: 6,
            backgroundColor: 'rgba(104, 197, 219, 0.2)',
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: '#68C5DB', fontWeight: 'bold', fontSize: 12 }}>
            09:45
          </Text>
        </View>
      </View>

    </View>


      {/* Recomendados */}
    <Text className="text-gray mb-2 font-bold">RECOMENDADOS</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-16">
      {[
        { name: "Vintage Barber", address: "Avenida São Sebastião", img: require('../../assets/images/salao1.jpeg') },
        { name: "Clássica Cortez", address: "Rua Castros Alves", img: require('../../assets/images/sala2.jpeg') },
      ].map((item) => (
        <View key={item.name} className="mr-4 w-40 bg-grayDark rounded-2xl overflow-hidden">
          <Image source={item.img} style={{ width: '100%', height: 80 }} resizeMode="cover" />
          <View className="p-2">
            <Text className="text-white font-bold">{item.name}</Text>
            <Text className="text-gray text-sm">{item.address}</Text>
          </View>
        </View>
      ))}
    </ScrollView>

    </ScrollView>
  );
}
