import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Navbar from "@/components/Navbar";
import DropdownMenu from "@/components/DropdownMenu";
import "../global.css";

const queryClient = new QueryClient();

export default function RootLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Navbar */}
      <Navbar menuOpen={menuOpen} setMenuOpen={setMenuOpen} />

      {/* Dropdown fora do Stack */}
      {menuOpen && <DropdownMenu setMenuOpen={setMenuOpen} />}

      {/* Stack */}
  <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
    <Stack.Screen name="index" />
  </Stack>


      <StatusBar style="auto" />
    </QueryClientProvider>
  );
}
