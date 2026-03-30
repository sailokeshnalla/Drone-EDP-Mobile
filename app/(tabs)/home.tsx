import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ImageBackground,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInDown,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";

const getProfileImageKey = (userId?: string) =>
  userId ? `farmer_profile_image_${userId}` : "farmer_profile_image_guest";

/* ---------------- SERVICE DATA ---------------- */

const cards = [
  {
    title: "Spraying Drone",
    subtitle: "Rice Fields",
    image: require("../../assets/images/Spraying.jpg"),
    locked: false,
  },
  {
    title: "Seeding Drone",
    subtitle: "Coming Soon",
    image: require("../../assets/images/heavy_duty_drone.png"),
    locked: true,
  },
];

/* ---------------- HOME SCREEN ---------------- */

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // ── Load profile image every time screen is focused ────────────────────────
useFocusEffect(
  useCallback(() => {
    const loadImage = async () => {
      try {
        if (!user?.id) {
          setProfileImage(null);
          return;
        }

        const saved = await AsyncStorage.getItem(
          getProfileImageKey(user.id)
        );
        setProfileImage(saved || null);
      } catch {
        setProfileImage(null);
      }
    };

    loadImage();
  }, [user?.id])
);

  const handleBook = (serviceName: string) => {
    router.push({
      pathname: "/(tabs)/bookings",
      params: { service: serviceName },
    });
  };

  return (
    <ImageBackground
      source={require("../../assets/images/dron_background.png")}
      style={styles.background}
    >
      <StatusBar barStyle="light-content" translucent />

      <View style={styles.overlay}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>

            {/* ── Profile image or fallback icon ── */}
            <TouchableOpacity onPress={() => router.push("/(tabs)/profile")}>
              {profileImage ? (
                <Image
                  source={{ uri: profileImage }}
                  style={styles.headerAvatar}
                />
              ) : (
                <Ionicons name="person-circle-outline" size={34} color="#fff" />
              )}
            </TouchableOpacity>

            <View>
              <Text style={styles.userName}>{user?.name || "User"}</Text>
            </View>
          </View>

          <TouchableOpacity onPress={() => router.push("/(tabs)/settings")}>
            <Ionicons name="menu" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <OfferSlider />

          <Text style={styles.sectionTitle}>Agriculture Services</Text>

          <View style={styles.grid}>
            {cards.map((item, index) => (
              <AnimatedCard
                key={item.title}
                title={item.title}
                subtitle={item.subtitle}
                image={item.image}
                locked={item.locked}
                index={index}
                onBook={() => handleBook(item.title)}
              />
            ))}
          </View>
        </ScrollView>
      </View>
    </ImageBackground>
  );
}

/* ---------------- OFFER SLIDER ---------------- */

function OfferSlider() {
  const screenWidth = Dimensions.get("window").width;
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = React.useState(0);

  const cardWidth = screenWidth - 20;
  const spacing = 20;
  const slideWidth = cardWidth + spacing;

  const offers = [
    require("../../assets/images/sliding_img_1.jpg"),
    require("../../assets/images/sliding_img_2.jpg"),
    require("../../assets/images/sliding_img_3.jpg"),
    require("../../assets/images/sliding_img_4.jpg"),
    require("../../assets/images/sliding_img_5.jpg"),
    require("../../assets/images/sliding_img_6.jpg"),
  ];

  const loopedOffers = [...offers, offers[0]];

  useEffect(() => {
    const interval = setInterval(() => {
      const nextIndex = activeIndex + 1;
      scrollRef.current?.scrollTo({ x: nextIndex * slideWidth, animated: true });
      setActiveIndex(nextIndex);
    }, 3000);
    return () => clearInterval(interval);
  }, [activeIndex, slideWidth]);

  useEffect(() => {
    if (activeIndex === offers.length) {
      const timer = setTimeout(() => {
        scrollRef.current?.scrollTo({ x: 0, animated: false });
        setActiveIndex(0);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [activeIndex, offers.length]);

  return (
    <View style={styles.sliderWrapper}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled={false}
        snapToInterval={slideWidth}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        contentContainerStyle={styles.sliderContent}
      >
        {loopedOffers.map((img, index) => (
          <View key={index} style={[styles.offerCard, { width: cardWidth }]}>
            <Image source={img} style={styles.offerImage} resizeMode="cover" />
          </View>
        ))}
      </ScrollView>

      <View style={styles.dotsContainer}>
        {offers.map((_, index) => {
          const currentDot = activeIndex === offers.length ? 0 : activeIndex;
          return (
            <View
              key={index}
              style={[styles.dot, currentDot === index && styles.activeDot]}
            />
          );
        })}
      </View>
    </View>
  );
}

/* ---------------- ANIMATED CARD ---------------- */

function AnimatedCard({
  title,
  subtitle,
  image,
  locked,
  index,
  onBook,
}: {
  title: string;
  subtitle: string;
  image: any;
  locked: boolean;
  index: number;
  onBook: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value) }],
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (locked) return;
    onBook();
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 80)} style={styles.card}>
      <Animated.View style={animatedStyle}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPressIn={() => (scale.value = 1.05)}
          onPressOut={() => (scale.value = 1)}
        >
          <View style={styles.cardImageWrapper}>
            <Image
              source={image}
              style={[styles.cardImage, locked && styles.lockedImage]}
            />
            {locked && (
              <Ionicons
                name="lock-closed"
                size={28}
                color="#fff"
                style={styles.lockIcon}
              />
            )}
          </View>

          <BlurView intensity={60} tint="dark" style={styles.cardContent}>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardSubtitle}>{subtitle}</Text>

            <TouchableOpacity
              style={[styles.bookButton, locked && styles.disabledButton]}
              onPress={handlePress}
              disabled={locked}
            >
              <Text style={styles.bookText}>
                {locked ? "Coming Soon" : "Book Now"}
              </Text>
            </TouchableOpacity>
          </BlurView>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  background: { flex: 1 },

  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.4)",
    marginHorizontal: 4,
  },

  activeDot: {
    width: 18,
    backgroundColor: "#fff",
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingTop: 50,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 20,
    alignItems: "center",
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  // ── Header avatar (when image is picked) ──────────────────────────────────
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
  },

  userName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginLeft: 10,
  },

  scrollContent: {
    paddingBottom: 120,
  },

  sliderWrapper: {
    marginBottom: 25,
  },

  sliderContent: {
    paddingHorizontal: 20,
    paddingLeft: 10,
    paddingRight: 10,
  },

  offerCard: {
    height: 200,
    marginRight: 20,
    borderRadius: 25,
    overflow: "hidden",
  },

  offerImage: {
    width: "100%",
    height: "100%",
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginLeft: 20,
    marginBottom: 20,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 15,
  },

  card: {
    width: "48%",
    borderRadius: 25,
    marginBottom: 20,
    overflow: "hidden",
  },

  cardImageWrapper: {
    position: "relative",
  },

  cardImage: {
    width: "100%",
    height: 130,
  },

  lockedImage: {
    opacity: 0.4,
  },

  lockIcon: {
    position: "absolute",
    top: "40%",
    left: "45%",
  },

  cardContent: {
    padding: 14,
  },

  cardTitle: {
    color: "#fff",
    fontWeight: "bold",
  },

  cardSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
  },

  bookButton: {
    marginTop: 10,
    backgroundColor: "#1f7a4c",
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: "center",
  },

  disabledButton: {
    backgroundColor: "#777",
  },

  bookText: {
    color: "#fff",
    fontWeight: "bold",
  },
});