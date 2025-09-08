import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert("Erro", "Preencha todos os campos");
      return;
    }

    Alert.alert("Sucesso", `Logado com ${email}`);
    router.push("/"); // volta para a tela inicial
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#0F1115" }}>
      <Text style={{ fontSize: 32, fontWeight: "bold", color: "white", marginBottom: 24, textAlign: "center" }}>
        Login
      </Text>

      <View style={{ gap: 16 }}>
        <TextInput
          placeholder="Email"
          placeholderTextColor="#888"
          keyboardType="email-address"
          autoCapitalize="none"
          style={{
            backgroundColor: "#1C1D22",
            color: "white",
            padding: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#444",
          }}
          value={email}
          onChangeText={setEmail}
        />

        <View style={{ position: "relative" }}>
          <TextInput
            placeholder="Senha"
            placeholderTextColor="#888"
            secureTextEntry={!showPassword}
            style={{
              backgroundColor: "#1C1D22",
              color: "white",
              padding: 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#444",
              paddingRight: 48,
            }}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity
            style={{ position: "absolute", right: 12, top: 16 }}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons name={showPassword ? "eye" : "eye-off"} size={24} color="gray" />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        onPress={handleLogin}
        style={{
          marginTop: 24,
          backgroundColor: "#68C5DB",
          paddingVertical: 16,
          borderRadius: 12,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 5,
        }}
      >
        <Text style={{ color: "white", fontWeight: "bold", textAlign: "center", fontSize: 16 }}>
          Entrar
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/cadastro")} style={{ marginTop: 16 }}>
        <Text style={{ color: "#68C5DB", textAlign: "center", fontWeight: "bold" }}>
          Cadastrar
        </Text>
      </TouchableOpacity>
    </View>
  );
}
