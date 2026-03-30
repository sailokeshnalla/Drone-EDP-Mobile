import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  RefreshControl,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { supabase } from "../../lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";

export default function PreviousOrdersScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const scrollViewRef = useRef<ScrollView | null>(null);

  // ── Rating + review state per order ───────────────────────────────────────
  const [pendingRatings, setPendingRatings] = useState<Record<string, number>>(
    {}
  );
  const [pendingReviews, setPendingReviews] = useState<Record<string, string>>(
    {}
  );
  const [ratingLoading, setRatingLoading] = useState<Record<string, boolean>>(
    {}
  );

  // ── Initial load ───────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem("user_id");
        if (!storedUserId) {
          setLoading(false);
          return;
        }

        setUserId(storedUserId);
        await fetchOrders(storedUserId, true);
      } catch (error) {
        console.log("Init previous orders error:", error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // ── Fetch orders helper ────────────────────────────────────────────────────
  const fetchOrders = async (uid?: string, silent: boolean = false) => {
    const currentUserId = uid || userId;
    if (!currentUserId) return;

    try {
      if (!silent) setRefreshing(true);

      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("farmer_id", currentUserId)
        .order("created_at", { ascending: false });

      if (error) {
        console.log("Fetch previous orders error:", error);
        return;
      }

      setOrders(data || []);
    } catch (error) {
      console.log("Fetch previous orders catch error:", error);
    } finally {
      if (!silent) setRefreshing(false);
    }
  };

  // ── Refresh when screen is focused ────────────────────────────────────────
useFocusEffect(
  useCallback(() => {
    if (userId) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      fetchOrders(userId, true);
    }
  }, [userId])
);

  // ── Realtime auto-update from Supabase ────────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`previous-orders-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        async (payload) => {
          const newRow: any = payload.new || {};
          const oldRow: any = payload.old || {};

          // Refresh only if the changed row belongs to this farmer
          if (
            newRow.farmer_id === userId ||
            oldRow.farmer_id === userId
          ) {
            await fetchOrders(userId, true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // ── Pull to refresh ────────────────────────────────────────────────────────
  const onRefresh = async () => {
    await fetchOrders();
  };

  /* Submit rating + review */
  const submitRating = async (orderId: string) => {
    const rating = pendingRatings[orderId];
    if (!rating || rating === 0) {
      Alert.alert("Rating", "Please select at least 1 star.");
      return;
    }

    setRatingLoading((prev) => ({ ...prev, [orderId]: true }));

    try {
      const { error } = await supabase
        .from("bookings")
        .update({
          rating,
          rating_comment: pendingReviews[orderId]?.trim() || null,
        })
        .eq("id", orderId);

      if (error) {
        console.log("Submit rating error:", error);
        Alert.alert("Error", "Could not submit rating.");
        return;
      }

      Alert.alert("Thank You! 🌟", "Your rating has been submitted.");

      setPendingRatings((prev) => {
        const updated = { ...prev };
        delete updated[orderId];
        return updated;
      });

      setPendingReviews((prev) => {
        const updated = { ...prev };
        delete updated[orderId];
        return updated;
      });

      await fetchOrders(userId || undefined, true);
    } catch (error) {
      console.log("Submit rating catch error:", error);
      Alert.alert("Error", "Could not submit rating.");
    } finally {
      setRatingLoading((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  // ── Helper: format scheduled_at into readable date + time ─────────────────
  const formatScheduled = (scheduledAt: string | null) => {
    if (!scheduledAt) return { date: "—", time: "—" };

    const d = new Date(scheduledAt);

    const date = d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const time = d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    return { date, time };
  };

  const previousOrders = orders.filter(
    (order) => order.status === "cancelled" || order.status === "completed"
  );

  return (
    <ImageBackground
      source={require("../../assets/images/dron_background.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" />

      <View style={styles.overlay}>
        {loading ? (
          <Animated.View
            entering={FadeInDown.duration(600)}
            style={styles.container}
          >
            <BlurView intensity={100} tint="dark" style={styles.blurCard}>
              <Ionicons
                name="refresh-outline"
                size={60}
                color="#fff"
                style={styles.icon}
              />
              <Text style={styles.title}>Loading Previous Orders...</Text>
              <Text style={styles.subtitle}>
                Please wait while we fetch your bookings.
              </Text>
            </BlurView>
          </Animated.View>
        ) : previousOrders.length === 0 ? (
          <Animated.View
            entering={FadeInDown.duration(600)}
            style={styles.container}
          >
            <BlurView intensity={100} tint="dark" style={styles.blurCard}>
              <Ionicons
                name="time-outline"
                size={60}
                color="#fff"
                style={styles.icon}
              />
              <Text style={styles.title}>No Previous Orders</Text>
              <Text style={styles.subtitle}>
                Your past bookings will appear here.
              </Text>
            </BlurView>
          </Animated.View>
        ) : (
          <ScrollView
  ref={scrollViewRef}
  showsVerticalScrollIndicator={false}
  contentContainerStyle={{ paddingBottom: 120 }}
  refreshControl={
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  }
>
            <Text style={styles.sectionTitle}>Previous Bookings</Text>

            {previousOrders.map((order, index) => {
              const { date: serviceDate, time: serviceTime } =
                formatScheduled(order.scheduled_at);

              return (
                <Animated.View
                  key={order.id}
                  entering={FadeInDown.delay(index * 100).duration(500)}
                  style={styles.orderCard}
                >
                  <BlurView intensity={90} tint="dark" style={styles.blurCard}>
                    <Text style={styles.orderTitle}>
                      {order.crop_type} Spraying
                    </Text>

                    <Text style={styles.orderSubtitle}>
                      {order.area_size} Acre • {order.city ?? order.pincode ?? ""}
                    </Text>

                    <Text style={styles.orderDate}>
                      Service: {serviceDate} • {serviceTime}
                    </Text>

                    <Text style={styles.orderDate}>
                      Ordered: {new Date(order.created_at).toLocaleString()}
                    </Text>

                    <Text
                      style={[
                        styles.oldStatus,
                        order.status === "completed" && styles.completedStatus,
                        order.status === "cancelled" && styles.cancelledStatus,
                      ]}
                    >
                      Status: {order.status || "completed"}
                    </Text>

                    {order.status === "completed" && (
                      <View style={ratingStyles.section}>
                        {order.rating ? (
                          <View style={{ alignItems: "center" }}>
                            <Text style={ratingStyles.ratedLabel}>
                              Your Rating
                            </Text>

                            <View style={ratingStyles.starsRow}>
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Text
                                  key={star}
                                  style={[
                                    ratingStyles.star,
                                    star <= order.rating &&
                                      ratingStyles.starFilled,
                                  ]}
                                >
                                  ★
                                </Text>
                              ))}
                            </View>

                            <Text style={ratingStyles.ratedHint}>
                              {order.rating === 1 && "😞 Poor"}
                              {order.rating === 2 && "😐 Fair"}
                              {order.rating === 3 && "🙂 Good"}
                              {order.rating === 4 && "😊 Very Good"}
                              {order.rating === 5 && "🤩 Excellent!"}
                            </Text>

                            {order.rating_comment ? (
                              <View style={ratingStyles.reviewDisplay}>
                                <Text style={ratingStyles.reviewDisplayText}>
                                  💬 "{order.rating_comment}"
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        ) : (
                          <View style={{ width: "100%" }}>
                            <Text style={ratingStyles.rateNowLabel}>
                              ⭐ Rate this service
                            </Text>

                            <View style={ratingStyles.starsRow}>
                              {[1, 2, 3, 4, 5].map((star) => (
                                <TouchableOpacity
                                  key={star}
                                  onPress={() =>
                                    setPendingRatings((prev) => ({
                                      ...prev,
                                      [order.id]: star,
                                    }))
                                  }
                                >
                                  <Text
                                    style={[
                                      ratingStyles.star,
                                      star <= (pendingRatings[order.id] || 0) &&
                                        ratingStyles.starFilled,
                                    ]}
                                  >
                                    ★
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>

                            {(pendingRatings[order.id] || 0) > 0 && (
                              <>
                                <Text style={ratingStyles.ratedHint}>
                                  {pendingRatings[order.id] === 1 && "😞 Poor"}
                                  {pendingRatings[order.id] === 2 && "😐 Fair"}
                                  {pendingRatings[order.id] === 3 && "🙂 Good"}
                                  {pendingRatings[order.id] === 4 &&
                                    "😊 Very Good"}
                                  {pendingRatings[order.id] === 5 &&
                                    "🤩 Excellent!"}
                                </Text>

                                <TextInput
                                  style={ratingStyles.commentInput}
                                  placeholder="Write a comment (optional)..."
                                  placeholderTextColor="rgba(255,255,255,0.4)"
                                  value={pendingReviews[order.id] || ""}
                                  onChangeText={(text) =>
                                    setPendingReviews((prev) => ({
                                      ...prev,
                                      [order.id]: text,
                                    }))
                                  }
                                  multiline
                                  numberOfLines={3}
                                  maxLength={300}
                                />

                                <TouchableOpacity
                                  style={ratingStyles.submitBtn}
                                  onPress={() => submitRating(order.id)}
                                  disabled={ratingLoading[order.id]}
                                >
                                  <Text style={ratingStyles.submitText}>
                                    {ratingLoading[order.id]
                                      ? "Submitting..."
                                      : "Submit Rating"}
                                  </Text>
                                </TouchableOpacity>
                              </>
                            )}
                          </View>
                        )}
                      </View>
                    )}
                  </BlurView>
                </Animated.View>
              );
            })}
          </ScrollView>
        )}
      </View>
    </ImageBackground>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  background: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingTop: 120,
    paddingHorizontal: 20,
  },
  container: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 30,
    overflow: "hidden",
    alignSelf: "center",
  },
  blurCard: {
    padding: 25,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  icon: { marginBottom: 20, opacity: 0.9, alignSelf: "center" },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 18,
    color: "#fff",
    marginBottom: 10,
    fontWeight: "bold",
  },
  orderCard: { marginBottom: 15, borderRadius: 25, overflow: "hidden" },
  orderTitle: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  orderSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    marginTop: 5,
  },
  orderDate: { fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 8 },
  oldStatus: { fontSize: 12, color: "#facc15", marginTop: 6 },
  completedStatus: { color: "#22c55e" },
  cancelledStatus: { color: "#ef4444" },
});

// ── Rating styles ─────────────────────────────────────────────────────────────
const ratingStyles = StyleSheet.create({
  section: {
    marginTop: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
  },
  ratedLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    marginBottom: 6,
    textAlign: "center",
  },
  rateNowLabel: {
    color: "#f59e0b",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 6,
  },
  star: {
    fontSize: 36,
    color: "rgba(255,255,255,0.2)",
    marginHorizontal: 4,
  },
  starFilled: { color: "#f59e0b" },
  ratedHint: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 10,
  },
  commentInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: "#fff",
    textAlignVertical: "top",
    marginBottom: 12,
    minHeight: 70,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  submitBtn: {
    backgroundColor: "#16a34a",
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 10,
    alignItems: "center",
    width: "100%",
  },
  submitText: { color: "white", fontWeight: "700", fontSize: 14 },
  reviewDisplay: {
    marginTop: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 8,
    padding: 10,
    width: "100%",
  },
  reviewDisplayText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    fontStyle: "italic",
    textAlign: "center",
  },
});