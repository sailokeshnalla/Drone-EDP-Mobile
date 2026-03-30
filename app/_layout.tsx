import { Stack } from "expo-router";
import { AuthProvider } from "../context/AuthContext";
import { OrdersProvider } from "../context/OrdersContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <OrdersProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
        </Stack>
      </OrdersProvider>
    </AuthProvider>
  );
}