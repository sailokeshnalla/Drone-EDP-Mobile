import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  StatusBar,
  TouchableOpacity,
  Linking,
  ScrollView,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

export default function HelpScreen() {

  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalText, setModalText] = useState("");

  const handlePress = (label: string) => {

    if (label === "Call Support") {
      Linking.openURL("tel:+918885342744");
    }

    else if (label === "WhatsApp Support") {
      Linking.openURL("https://wa.me/918885342744");
    }

    else if (label === "Email Support") {
      Linking.openURL("mailto:sailokeshnalla001@gmail.com");
    }

    /* SPRAY GUIDELINES */

    else if (label === "Guidelines & Safety") {

      setModalTitle("Guidelines & Safety");

      setModalText(
        "• Keep the field ready before the drone team arrives.\n\n" +
        "• Inform the team about the crop type and chemicals to be used.\n\n" +
        "• Ensure there are no people, animals, or vehicles inside the field during spraying.\n\n" +
        "• Maintain a safe distance from the drone while spraying is happening.\n\n" +
        "• Do not enter the field until the spraying process is completed."
      );

      setModalVisible(true);
    }

    /* WEATHER ADVISORY */

    else if (label === "Weather Advisory Help") {

      setModalTitle("Weather Advisory");

      setModalText(
        "• Drone spraying depends on safe weather conditions.\n\n" +
        "• Avoid booking services during heavy rain or strong winds.\n\n" +
        "• Weather changes may cause delays or rescheduling of the service.\n\n" +
        "• Keep your phone available to receive updates from the service team.\n\n" +
        "• If needed, contact support to check the weather-related service status."
      );

      setModalVisible(true);
    }

    /* CANCELLATION POLICY */

    else if (label === "Booking & Cancellation Policy") {

      setModalTitle("Booking & Cancellation Policy");

      setModalText(
        "• Select the crop type and enter the land area correctly while booking.\n\n" +
        "• Choose the preferred spraying date and confirm the booking.\n\n" +
        "• Ensure the field location and contact number are correct.\n\n" +
        "• If you want to cancel or change the booking, do it before the scheduled service time.\n\n" +
        "• If the service cannot be done due to weather or technical issues, the booking may be rescheduled."
      );

      setModalVisible(true);
    }
  };

  return (
    <ImageBackground
      source={require("../../assets/images/dron_background.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" />

      <View style={styles.overlay}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >

          {/* HEADER */}

          <Animated.View
            entering={FadeInDown.duration(500)}
            style={styles.header}
          >
            <Ionicons
              name="help-buoy"
              size={60}
              color="#fff"
              style={styles.headerIcon}
            />
            <Text style={styles.title}>Support Center</Text>
            <Text style={styles.subtitle}>
              We're here to help.
            </Text>
          </Animated.View>

          {/* OPTIONS */}

          <Animated.View
            entering={FadeInUp.delay(200).duration(600)}
            style={styles.optionsContainer}
          >

            <HelpOption
              icon="document-text-outline"
              label="Booking & Cancellation Policy"
              onPress={handlePress}
            />

            <HelpOption
              icon="leaf-outline"
              label="Guidelines & Safety"
              onPress={handlePress}
            />

            <HelpOption
              icon="cloud-outline"
              label="Weather Advisory Help"
              onPress={handlePress}
            />

            <HelpOption
              icon="call-outline"
              label="Call Support"
              onPress={handlePress}
            />

            <HelpOption
              icon="logo-whatsapp"
              label="WhatsApp Support"
              onPress={handlePress}
            />

            <HelpOption
              icon="mail-outline"
              label="Email Support"
              onPress={handlePress}
            />

          </Animated.View>
        </ScrollView>
      </View>

      {/* MODAL */}

      {modalVisible && (
        <View style={styles.modalContainer}>
          <BlurView intensity={120} tint="dark" style={styles.modalCard}>

            <Text style={styles.modalTitle}>{modalTitle}</Text>

            <ScrollView>
              <Text style={styles.modalText}>{modalText}</Text>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>

          </BlurView>
        </View>
      )}
    </ImageBackground>
  );
}

function HelpOption({ icon, label, onPress }: any) {
  return (
    <TouchableOpacity
      style={styles.optionButton}
      onPress={() => onPress(label)}
      activeOpacity={0.8}
    >
      <BlurView intensity={100} tint="dark" style={styles.blurCard}>
        <View style={styles.optionContent}>
          <Ionicons name={icon} size={24} color="#fff" />
          <Text style={styles.optionText}>{label}</Text>
          <Ionicons
            name="chevron-forward"
            size={20}
            color="rgba(255,255,255,0.6)"
            style={{ marginLeft: "auto" }}
          />
        </View>
      </BlurView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({

  background: {
    flex: 1,
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
  },

  scrollContent: {
    paddingTop: Platform.OS === "android" ? 100 : 120,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },

  header: {
    alignItems: "center",
    marginBottom: 40,
  },

  headerIcon: {
    marginBottom: 15,
  },

  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
  },

  optionsContainer: {
    width: "100%",
  },

  optionButton: {
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 15,
  },

  blurCard: {
    flex: 1,
  },

  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
  },

  optionText: {
    color: "#fff",
    fontSize: 16,
    marginLeft: 15,
    fontWeight: "500",
  },

  /* MODAL */

  modalContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
  },

  modalCard: {
    width: "85%",
    borderRadius: 20,
    padding: 25,
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 15,
  },

  modalText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 15,
    lineHeight: 22,
  },

  modalButton: {
    marginTop: 20,
    backgroundColor: "#1f7a4c",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },

  modalButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },

});