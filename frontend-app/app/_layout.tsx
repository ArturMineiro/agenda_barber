import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "../global.css"; // ⬅️ NativeWind/TailwindCSS

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Stack container para todas as rotas */}
      <Stack>
        {/* index.tsx será renderizado em "/" */}
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen 
  name="teste" 
  options={{ headerShown: true, title: "Tela de Teste" }} 
/>

        {/* explore.tsx será renderizado em "/explore" automaticamente */}
        {/* outras páginas também podem ser navegadas via router.push("/nomeDaPagina") */}
      </Stack>

      {/* Status bar */}
      <StatusBar style="auto" />
    </QueryClientProvider>
  );
}