import { View, Text, ScrollView } from "react-native";

export default function TabLayout({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView className="flex-1 bg-black px-4 pt-4">
      {children}
    </ScrollView>
  );
}
