import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerTransparent: true,
        headerShadowVisible: false,

        headerBackground: () => (
          <BlurView
            intensity={0}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
        ),

        headerTitleStyle: {
          color: "#fff",
          fontWeight: "bold",
        },

        // 🔥 PREMIUM FOOTER
        tabBarStyle: {
          position: "absolute",
          borderTopWidth: 0,
          elevation: 0,
          height: 85,
          backgroundColor: "transparent",
        },

        tabBarBackground: () => (
          <View style={styles.footerWrapper}>
            <BlurView
              intensity={120}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.overlay} />
          </View>
        ),

        tabBarActiveTintColor: "#ffffff",
        tabBarInactiveTintColor: "rgba(255,255,255,0.6)",

        tabBarLabelStyle: {
          fontSize: 12,
          marginBottom: 8,
          fontWeight: "600",
        },
      }}
    >

      {/* 🏠 HOME */}
      <Tabs.Screen
        name="home"
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />

      {/* 📦 ORDERS */}
      <Tabs.Screen
        name="orders"
        options={{
          title: "My Orders",
          headerTitleAlign: "center",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt-outline" size={size} color={color} />
          ),
        }}
      />

      {/* ❓ HELP */}
      <Tabs.Screen
        name="help"
        options={{
          title: "Help",
          headerTitleAlign: "center",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="help-circle-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* 🔒 HIDDEN ROUTES */}
      <Tabs.Screen
        name="profile"
        options={{ href: null,
         }}
      />
      <Tabs.Screen
              name="about"
              options={{ href: null,
                headerShown: false,
               }}
            />
      <Tabs.Screen
                    name="bookings"
                    options={{ href: null,
                      headerShown: false,
                     }}
            />
      <Tabs.Screen
                          name="previous-orders"
                          options={{ href: null,
                            headerShown: false,
                          }} 
                  />
      <Tabs.Screen
                          name="settings"
                          options={{ href: null,
                            headerShown: false,
                          }} 
                  />
   

    </Tabs>

  );
}

const styles = StyleSheet.create({
  footerWrapper: {
    flex: 1,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: "hidden",
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
});