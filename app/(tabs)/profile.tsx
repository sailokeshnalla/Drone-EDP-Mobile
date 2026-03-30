import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  StatusBar,
  Alert,
  ScrollView,
  Image,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { useRouter, useFocusEffect } from "expo-router";
import { supabase } from "../../lib/supabase";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

const getProfileImageKey = (userId?: string) =>
  userId ? `farmer_profile_image_${userId}` : "farmer_profile_image_guest";

export default function Profile() {
  const { logout, user } = useAuth();
  const router = useRouter();

  const [refreshKey, setRefreshKey] = useState(0);
  const [bookingCount, setBookingCount] = useState(0);
  const [acresSprayed, setAcresSprayed] = useState(0);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const fetchBookingStats = async () => {
    try {
      if (!user?.id) {
        setBookingCount(0);
        setAcresSprayed(0);
        return;
      }

      const { data, error } = await supabase
        .from("bookings")
        .select("status, area_size")
        .eq("farmer_id", user.id);

      if (error) {
        console.log("Booking stats fetch error:", error.message);
        setBookingCount(0);
        setAcresSprayed(0);
        return;
      }

      if (!data) {
        setBookingCount(0);
        setAcresSprayed(0);
        return;
      }

      const validBookings = data.filter(
        (item) => (item.status || "").toLowerCase() !== "cancelled"
      );

      const completedBookings = data.filter(
        (item) => (item.status || "").toLowerCase() === "completed"
      );

      const totalAcres = completedBookings.reduce(
        (sum, item) => sum + Number(item.area_size || 0),
        0
      );

      setBookingCount(validBookings.length);
      setAcresSprayed(totalAcres);
    } catch (err) {
      console.log("Error fetching booking stats:", err);
      setBookingCount(0);
      setAcresSprayed(0);
    }
  };

  const loadProfileImage = async () => {
    try {
      if (!user?.id) {
        setProfileImage(null);
        return;
      }

      const saved = await AsyncStorage.getItem(getProfileImageKey(user.id));
      setProfileImage(saved || null);
    } catch {
      setProfileImage(null);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const run = async () => {
        if (!user?.id) {
          setProfileImage(null);
          setBookingCount(0);
          setAcresSprayed(0);
          router.replace("/login");
          return;
        }

        setRefreshKey((prev) => prev + 1);
        await fetchBookingStats();
        await loadProfileImage();
      };

      run();
    }, [user?.id])
  );

  const pickImage = async () => {
    try {
      if (!user?.id) {
        Alert.alert("Login Required", "Please log in first.");
        return;
      }

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photo library."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        const uri = result.assets[0].uri;
        setProfileImage(uri);
        await AsyncStorage.setItem(getProfileImageKey(user.id), uri);
      }
    } catch {
      Alert.alert("Error", "Could not pick image.");
    }
  };

  const removeProfilePhoto = async () => {
    try {
      if (!user?.id) return;

      await AsyncStorage.removeItem(getProfileImageKey(user.id));
      setProfileImage(null);
    } catch {
      Alert.alert("Error", "Could not remove profile photo.");
    }
  };

  const confirmRemovePhoto = () => {
    Alert.alert("Remove Photo", "Do you want to remove your profile photo?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: removeProfilePhoto,
      },
    ]);
  };

  const handleLogout = async () => {
    try {
      setProfileImage(null);
      setBookingCount(0);
      setAcresSprayed(0);
      await logout();
      router.replace("/login");
    } catch {
      Alert.alert("Error", "Could not log out properly.");
    }
  };

  if (!user?.id) return null;

  return (
    <ImageBackground
      source={require("../../assets/images/dron_background.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" />

      <ScrollView
        key={refreshKey}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.overlay}>
          <Animated.View entering={FadeInDown.duration(500)}>
            <View style={styles.cardWrapper}>
              <BlurView intensity={100} tint="dark" style={styles.blurFill}>
                <View style={styles.cardContent}>
                  <View style={styles.avatarWrapper}>
                    {profileImage ? (
                      <Image
                        source={{ uri: profileImage }}
                        style={styles.avatarImage}
                      />
                    ) : (
                      <View style={styles.avatar}>
                        <Ionicons name="person" size={52} color="#fff" />
                      </View>
                    )}

                    <TouchableOpacity
                      style={styles.cameraBadge}
                      onPress={pickImage}
                    >
                      <Ionicons name="camera" size={14} color="#fff" />
                    </TouchableOpacity>

                    {profileImage && (
                      <TouchableOpacity
                        style={styles.removeBadge}
                        onPress={confirmRemovePhoto}
                      >
                        <Ionicons name="trash" size={14} color="#fff" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <Text style={styles.username}>{user?.name || "User"}</Text>
                  <Text style={styles.phone}>
                    {user?.phone || "Phone not available"}
                  </Text>
                </View>
              </BlurView>
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInUp.delay(150).duration(500)}
            style={styles.statsContainer}
          >
            <StatCard
              icon="receipt-outline"
              value={bookingCount.toString()}
              label="Bookings"
            />
            <StatCard
              icon="analytics-outline"
              value={acresSprayed.toString()}
              label="Acres Sprayed"
            />
          </Animated.View>

          <Animated.View
            entering={FadeInUp.delay(250).duration(500)}
            style={styles.optionsContainer}
          >
            <ProfileOption icon="time-outline" label="Previous Orders" />
            <ProfileOption icon="card-outline" label="Transactions" />
            <ProfileOption icon="wallet-outline" label="E-Wallet" />
            <ProfileOption
              icon="information-circle-outline"
              label="About Us"
            />
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(350).duration(500)}>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={22} color="#fff" />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

function StatCard({ icon, value, label }: any) {
  return (
    <View style={styles.statWrapper}>
      <BlurView intensity={100} tint="dark" style={styles.blurFill}>
        <View style={styles.statContent}>
          <Ionicons name={icon} size={26} color="#fff" />
          <Text style={styles.statNumber}>{value}</Text>
          <Text style={styles.statLabel}>{label}</Text>
        </View>
      </BlurView>
    </View>
  );
}

function ProfileOption({ icon, label }: any) {
  const router = useRouter();

  const handlePress = () => {
    if (label === "About Us") {
      router.push("/about");
    } else if (label === "Previous Orders") {
      router.push("/previous-orders");
    } else {
      Alert.alert(label);
    }
  };

  return (
    <TouchableOpacity style={styles.optionButton} onPress={handlePress}>
      <Ionicons name={icon} size={22} color="#fff" />
      <Text style={styles.optionText}>{label}</Text>
      <Ionicons
        name="chevron-forward-outline"
        size={18}
        color="rgba(255,255,255,0.6)"
        style={{ marginLeft: "auto" }}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },

  scrollContainer: { flexGrow: 1 },

  overlay: {
    flex: 1,
    minHeight: "100%",
    backgroundColor: "rgba(0,0,0,0.85)",
    paddingTop: 120,
    alignItems: "center",
    paddingBottom: 120,
  },

  cardWrapper: {
    width: "92%",
    borderRadius: 40,
    overflow: "hidden",
    marginBottom: 30,
  },

  blurFill: {
    width: "100%",
  },

  cardContent: {
    paddingVertical: 35,
    paddingHorizontal: 25,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
  },

  avatarWrapper: {
    position: "relative",
    marginBottom: 18,
    width: 100,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },

  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },

  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },

  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#16a34a",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#000",
  },

  removeBadge: {
    position: "absolute",
    top: 0,
    right: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#000",
  },

  username: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
  },

  phone: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    marginTop: 4,
  },

  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "92%",
    marginBottom: 30,
  },

  statWrapper: {
    width: "48%",
    borderRadius: 36,
    overflow: "hidden",
  },

  statContent: {
    paddingVertical: 28,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
  },

  statNumber: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    marginTop: 8,
  },

  statLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    marginTop: 3,
  },

  optionsContainer: {
    width: "92%",
    marginBottom: 30,
  },

  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginBottom: 15,
  },

  optionText: {
    color: "#fff",
    marginLeft: 15,
    fontSize: 15,
  },

  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#b00020",
    paddingHorizontal: 50,
    paddingVertical: 16,
    borderRadius: 30,
  },

  logoutText: {
    color: "#fff",
    marginLeft: 10,
    fontSize: 15,
    fontWeight: "bold",
  },
});