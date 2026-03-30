import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { router } from "expo-router"; // ✅ ADD THIS

export default function LandingScreen() { // ✅ REMOVE navigation
  return (
    <ImageBackground
      source={require("../assets/images/landing.jpg")}
      style={styles.background}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" />

      {/* Dark Overlay */}
      <View style={styles.overlay}>
        
        {/* Top Content */}
        <View style={styles.topContainer}>
          <Text style={styles.title}>Agri Dhara</Text>
          <Text style={styles.description}>
            An innovative way to kill the pesticides
          </Text>
        </View>

        {/* Bottom Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push("/signup")} // ✅ Works now
          >
            <Text style={styles.buttonText}>Get Started</Text>
          </TouchableOpacity>
        </View>

      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    justifyContent: "center",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 20,
    justifyContent: "space-between",
  },
  topContainer: {
    marginTop: 80,
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    color: "#e0f2e9",
    textAlign: "center",
    marginTop: 10,
  },
  bottomContainer: {
    alignItems: "center",
    marginBottom: 50,
  },
  button: {
    width: "70%",
    paddingVertical: 15,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: "#ffffff",
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
  },
});