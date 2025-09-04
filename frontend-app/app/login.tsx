import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert("Erro", "Preencha todos os campos");
      return;
    }

    // Aqui você pode chamar sua API de login
    // Exemplo: fetch('/login', {...})

    Alert.alert("Sucesso", `Logado com ${email}`);
    router.push("/"); // volta para a tela inicial
  };

  return (
    <View className="flex-1 justify-center items-center bg-gray-100 p-6">
      <Text className="text-3xl font-bold mb-6 text-gray-900">Login</Text>

      <TextInput
        className="w-full bg-white p-4 rounded mb-4 border border-gray-300"
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        className="w-full bg-white p-4 rounded mb-4 border border-gray-300"
        placeholder="Senha"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        className="w-full bg-blue-600 p-4 rounded mb-4"
        onPress={handleLogin}
      >
        <Text className="text-white text-center font-bold">Entrar</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/")}>
        <Text className="text-blue-600 font-bold">Cadastrar Barbearia</Text>
      </TouchableOpacity>
    </View>
  );
}
