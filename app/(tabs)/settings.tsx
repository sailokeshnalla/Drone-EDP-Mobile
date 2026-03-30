import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  ImageBackground,
  StatusBar,
  Alert,
} from "react-native";

export default function SettingsScreen() {
  const router = useRouter();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  // const [language, setLanguage] = useState("English");


  // const toggleLanguage = () => {
  //   const newLang =
  //     language === "English"
  //       ? "Hindi"
  //       : language === "Hindi"
  //       ? "Telugu"
  //       : "English";

  //   setLanguage(newLang);
  // };

const showLanguageMessage = () => {
  Alert.alert("Language", "Only one language for now");
};

  return (
    <ImageBackground
      source={require("../../assets/images/dron_background.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" translucent />

      <View style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.heading}>Settings</Text>

          <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <Text style={styles.settingText}>Enable Notifications</Text>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
              />
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingText}>Dark Mode</Text>
              <Switch value={darkMode} onValueChange={setDarkMode} />
            </View>

            {/* <TouchableOpacity style={styles.settingRow} onPress={toggleLanguage}>
              <Text style={styles.settingText}>Language</Text>
              <Text style={styles.languageText}>{language}</Text>
            </TouchableOpacity> */}

            <TouchableOpacity style={styles.settingRow} onPress={showLanguageMessage}>
              <Text style={styles.settingText}>Language</Text>
              <Text style={styles.languageText}>English</Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingTop: 50,
  },

  container: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },

  heading: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 20,
  },

  settingsCard: {
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 24,
  },

  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderColor: "rgba(255,255,255,0.18)",
  },

  settingText: {
    fontSize: 16,
    paddingVertical: 10,
    color: "#fff",
    fontWeight: "500",
  },

  languageText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },

  card: {
    backgroundColor: "#F3F4F6",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },

  label: {
    fontSize: 12,
    color: "#6B7280",
  },

  value: {
    fontSize: 16,
    marginBottom: 10,
    fontWeight: "500",
  },
});