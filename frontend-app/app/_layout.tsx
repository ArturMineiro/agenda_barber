import { Stack } from "expo-router";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, View } from "react-native";
import Navbar from "@/components/Navbar";
import DropdownMenu from "@/components/DropdownMenu";
import Constants from "expo-constants";

import "../global.css";

const queryClient = new QueryClient();

export default function RootLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
    <SafeAreaView className="flex-1 bg-black" style={{ paddingTop: Constants.statusBarHeight }}>
      <StatusBar style="light" translucent />
        {/* Navbar global */}
        <View style={{ zIndex: 10 }}>
          <Navbar menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
        </View>

        {/* Dropdown */}
        {menuOpen && <DropdownMenu setMenuOpen={setMenuOpen} />}

        {/* Rotas globais */}
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" /> 
          <Stack.Screen name="login" />
          <Stack.Screen name="cadastro" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="estabelecimentos" />
        </Stack>
      </SafeAreaView>
    </QueryClientProvider>
  );
}
