import { useRouter, useFocusEffect } from "expo-router";
import React, { useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  StatusBar,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { BlurView } from "expo-blur";

export default function About() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
      }, 50);

      return () => clearTimeout(timer);
    }, [])
  );

  return (
    <ImageBackground
      source={require("../../assets/images/dron_background.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.overlay}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardWrapper}>
          <BlurView intensity={120} tint="dark" style={styles.blurCard}>
            <Text style={styles.title}>Agri Dhara</Text>
            <Text style={styles.tagline}>
              The Innovative Way to Kill Pesticides
            </Text>

            <Text style={styles.sectionTitle}>About Us</Text>
            <Text style={styles.text}>
              Agri Dhara is a smart agriculture platform focused on
              transforming traditional farming practices using modern
              drone technology.
            </Text>

            <Text style={styles.text}>
              We provide advanced drone-based pesticide spraying solutions
              that ensure accurate coverage, reduced chemical wastage,
              and increased crop protection efficiency.
            </Text>

            <Text style={styles.sectionTitle}>Our Mission</Text>
            <Text style={styles.text}>
              Our mission is to empower farmers with safe, efficient,
              and technology-driven pesticide management solutions.
            </Text>

            <Text style={styles.text}>
              By integrating innovation into agriculture, we aim to
              improve crop yield while minimizing environmental impact.
            </Text>

            <Text style={styles.sectionTitle}>Our Services</Text>
            <Text style={styles.bullet}>• Drone-Based Pesticide Spraying</Text>
            <Text style={styles.bullet}>• Precision Crop Monitoring</Text>
            <Text style={styles.bullet}>• Smart Field Analysis</Text>
            <Text style={styles.bullet}>• Efficient Farm Coverage</Text>

            <Text style={styles.sectionTitle}>Why Choose Agri Dhara?</Text>
            <Text style={styles.bullet}>✔ Reduced Chemical Waste</Text>
            <Text style={styles.bullet}>✔ Faster Farm Operations</Text>
            <Text style={styles.bullet}>✔ Safe & Accurate Application</Text>
            <Text style={styles.bullet}>✔ Modern Drone Technology</Text>

            <Text style={styles.footer}>Version 1.0.0</Text>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => router.replace("/profile")}
            >
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>

            <View style={styles.bottomSpace} />
          </BlurView>
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },

  overlay: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.85)",
    padding: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },

  cardWrapper: {
    width: "100%",
    borderRadius: 35,
    overflow: "hidden",
  },

  blurCard: {
    padding: 30,
    backgroundColor: "rgba(255,255,255,0.05)",
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
  },

  tagline: {
    fontSize: 14,
    color: "#4CAF50",
    textAlign: "center",
    marginBottom: 25,
    fontWeight: "600",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginTop: 20,
    marginBottom: 10,
  },

  text: {
    fontSize: 15,
    color: "rgba(255,255,255,0.8)",
    lineHeight: 22,
    marginBottom: 10,
  },

  bullet: {
    fontSize: 15,
    color: "rgba(255,255,255,0.85)",
    marginBottom: 6,
  },

  footer: {
    marginTop: 30,
    textAlign: "center",
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
  },

  closeButton: {
    marginTop: 25,
    backgroundColor: "#1f7a4c",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },

  closeText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },

  bottomSpace: {
    height: 35,
  },
});