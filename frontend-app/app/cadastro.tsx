import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function CadastroScreen() {
  const [userType, setUserType] = useState<"cliente" | "barbearia">("cliente");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [telefone, setTelefone] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const router = useRouter();

  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    if (!nome) newErrors.nome = userType === "cliente" ? "Nome obrigatório" : "Nome da Barbearia obrigatório";
    if (!email) newErrors.email = "Email obrigatório";
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = "Email inválido";
    if (!password) newErrors.password = "Senha obrigatória";
    if (!confirmPassword) newErrors.confirmPassword = "Confirme sua senha";
    if (password && confirmPassword && password !== confirmPassword)
      newErrors.confirmPassword = "As senhas não coincidem";
    if (!telefone) newErrors.telefone = "Telefone obrigatório";

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleCadastro = () => {
    if (!validate()) return;

    Alert.alert(
      "Sucesso",
      `${userType === "cliente" ? "Cliente" : "Barbearia"} cadastrado: ${nome}`
    );

    router.push("/login");
  };

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "center",
        padding: 24,
        backgroundColor: "#0F1115",
      }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={{ color: "white", fontSize: 32, fontWeight: "bold", marginBottom: 24, textAlign: "center" }}>
        Cadastro
      </Text>

      {/* Select tipo de usuário */}
      <View style={{ flexDirection: "row", marginBottom: 24, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: "#444" }}>
        {["cliente", "barbearia"].map((type) => (
          <TouchableOpacity
            key={type}
            style={{
              flex: 1,
              paddingVertical: 12,
              backgroundColor: userType === type ? "#68C5DB" : "#1C1D22",
              alignItems: "center",
            }}
            onPress={() => setUserType(type as "cliente" | "barbearia")}
          >
            <Text style={{ color: userType === type ? "white" : "gray", fontWeight: "bold", textTransform: "capitalize" }}>
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Campos */}
      <View style={{ gap: 12 }}>
        <TextInput
          placeholder={userType === "cliente" ? "Nome" : "Nome da Barbearia"}
          placeholderTextColor="#888"
          style={{
            backgroundColor: "#1C1D22",
            color: "white",
            padding: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: errors.nome ? "red" : "#444",
          }}
          value={nome}
          onChangeText={setNome}
        />
        {errors.nome && <Text style={{ color: "red" }}>{errors.nome}</Text>}

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
            borderColor: errors.email ? "red" : "#444",
          }}
          value={email}
          onChangeText={setEmail}
        />
        {errors.email && <Text style={{ color: "red" }}>{errors.email}</Text>}

        <TextInput
          placeholder="Telefone"
          placeholderTextColor="#888"
          keyboardType="phone-pad"
          style={{
            backgroundColor: "#1C1D22",
            color: "white",
            padding: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: errors.telefone ? "red" : "#444",
          }}
          value={telefone}
          onChangeText={setTelefone}
        />
        {errors.telefone && <Text style={{ color: "red" }}>{errors.telefone}</Text>}

        {/* Senha */}
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
              borderColor: errors.password ? "red" : "#444",
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
        {errors.password && <Text style={{ color: "red" }}>{errors.password}</Text>}

        {/* Confirmar senha */}
        <View style={{ position: "relative" }}>
          <TextInput
            placeholder="Confirmar Senha"
            placeholderTextColor="#888"
            secureTextEntry={!showConfirmPassword}
            style={{
              backgroundColor: "#1C1D22",
              color: "white",
              padding: 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: errors.confirmPassword ? "red" : "#444",
              paddingRight: 48,
            }}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <TouchableOpacity
            style={{ position: "absolute", right: 12, top: 16 }}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            <Ionicons name={showConfirmPassword ? "eye" : "eye-off"} size={24} color="gray" />
          </TouchableOpacity>
        </View>
        {errors.confirmPassword && <Text style={{ color: "red" }}>{errors.confirmPassword}</Text>}
      </View>

      <TouchableOpacity
        onPress={handleCadastro}
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
          {userType === "cliente" ? "Cadastrar Cliente" : "Cadastrar Barbearia"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/login")} style={{ marginTop: 16 }}>
        <Text style={{ color: "#68C5DB", textAlign: "center", fontWeight: "bold" }}>
          Já tem conta? Faça login
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
