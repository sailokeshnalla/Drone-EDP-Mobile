import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { supabase } from "../../lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function OrdersScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  // ── Rating modal state ─────────────────────────────────────────────────────
  const [ratingModal, setRatingModal] = useState(false);
  const [ratingBookingId, setRatingBookingId] = useState<string | null>(null);
  const [selectedRating, setSelectedRating] = useState(0);
  const [review, setReview] = useState("");
  const [ratingLoading, setRatingLoading] = useState(false);

  useEffect(() => {
    let channel: any;

    const init = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem("user_id");
        if (!storedUserId) return;
        setUserId(storedUserId);
        await fetchOrders(storedUserId);

        channel = supabase
          .channel(`orders-${storedUserId}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "bookings" },
            (payload) => {
              const updated = payload.new as any;
              if (
                updated?.farmer_id === storedUserId &&
                updated?.status === "completed" &&
                !updated?.rating
              ) {
                setRatingBookingId(updated.id);
                setSelectedRating(0);
                setReview("");
                setRatingModal(true);
              }
              fetchOrders(storedUserId);
            }
          )
          .subscribe();
      } catch (error) {
        console.log("Init orders error:", error);
      }
    };

    init();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  /* FETCH ORDERS */
  const fetchOrders = async (uid?: string) => {
    const currentUserId = uid || userId;
    if (!currentUserId) return;

    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("farmer_id", currentUserId)
      .order("created_at", { ascending: false });

    if (error) { console.log("Fetch orders error:", error); return; }
    if (!data) { setOrders([]); return; }

    // ✅ FIX: Use provider_name and contact_phone directly from the bookings row.
    // No separate providers table join needed — these are written by booking-actions
    // edge function when the provider accepts the booking.
    const enrichedOrders = data.map((o) => ({
      ...o,
      provider: o.provider_name
        ? { full_name: o.provider_name, phone_number: o.contact_phone }
        : null,
    }));

    setOrders(enrichedOrders);
  };

  /* CANCEL ORDER */
  const cancelOrder = (id: string) => {
    Alert.alert(
      "Cancel Order",
      "Are you sure you want to cancel this booking?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            if (!userId) return;
            const { error } = await supabase
              .from("bookings")
              .update({ status: "cancelled" })
              .eq("id", id)
              .eq("farmer_id", userId);
            if (error) { Alert.alert("Error", "Unable to cancel order."); return; }
            Alert.alert("Cancelled", "Your booking has been cancelled.");
            fetchOrders();
          },
        },
      ]
    );
  };

  /* Submit rating + review */
  const submitRating = async () => {
    if (selectedRating === 0) {
      Alert.alert("Rating", "Please select at least 1 star.");
      return;
    }

    setRatingLoading(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({
          rating: selectedRating,
          rating_comment: review.trim() || null,
        })
        .eq("id", ratingBookingId);

      if (error) { Alert.alert("Error", "Could not submit rating."); return; }

      setRatingModal(false);
      setRatingBookingId(null);
      setSelectedRating(0);
      setReview("");
      Alert.alert("Thank You! 🌟", "Your rating has been submitted.");
      fetchOrders();
    } catch {
      Alert.alert("Error", "Could not submit rating.");
    } finally {
      setRatingLoading(false);
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

  const activeOrders = orders.filter(
    (order) => order.status !== "cancelled" && order.status !== "completed"
  );

  return (
    <ImageBackground
      source={require("../../assets/images/dron_background.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" />

      <View style={styles.overlay}>
        {activeOrders.length === 0 ? (
          <Animated.View
            entering={FadeInDown.duration(600)}
            style={styles.container}
          >
            <BlurView intensity={100} tint="dark" style={styles.blurCard}>
              <Ionicons
                name="receipt-outline"
                size={60}
                color="#fff"
                style={styles.icon}
              />
              <Text style={styles.title}>No Active Orders</Text>
              <Text style={styles.subtitle}>
                Your current bookings will appear here.
              </Text>
            </BlurView>
          </Animated.View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 120 }}
          >
            <Text style={styles.sectionTitle}>Current Bookings</Text>

            {activeOrders.map((order, index) => {
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
                      {order.area_size} Acre • {order.district ?? order.pincode ?? ""}
                    </Text>

                    <Text style={styles.orderDate}>
                      Service: {serviceDate} • {serviceTime}
                    </Text>
                    <Text style={styles.orderDate}>
                      Ordered: {new Date(order.created_at).toLocaleString()}
                    </Text>

                    <Text
                      style={
                        order.status === "confirmed"
                          ? styles.acceptedStatus
                          : order.status === "in_progress"
                          ? styles.inProgressStatus
                          : styles.pendingStatus
                      }
                    >
                      Status: {order.status || "requested"}
                    </Text>

                    {order.admin_notes ? (
                      <View style={{ marginTop: 8 }}>
                        <Text style={styles.alertText}>
                          ⚠ {order.admin_notes}
                        </Text>
                      </View>
                    ) : null}

                    {/* Provider name + phone from bookings row directly */}
                    {(order.status === "confirmed" ||
                      order.status === "in_progress") &&
                      order.provider && (
                        <View style={styles.vendorBox}>
                          <Text style={styles.vendorInfo}>
                            🧑‍🌾 Provider: {order.provider.full_name}
                          </Text>
                          <Text style={styles.vendorInfo}>
                            📞 Phone: {order.provider.phone_number}
                          </Text>
                        </View>
                      )}

                    {/* Waiting for start OTP */}
                    {order.status === "confirmed" && !order.start_otp && (
                      <View style={styles.infoBox}>
                        <Text style={styles.infoText}>
                          ℹ️ When the provider starts the service, you will
                          receive a Start OTP. Share it with the provider to
                          begin.
                        </Text>
                      </View>
                    )}

                    {/* Show Start OTP */}
                    {order.status === "confirmed" && order.start_otp && (
                      <View style={otpStyles.box}>
                        <Text style={otpStyles.hint}>
                          Share this OTP with the provider to start service
                        </Text>
                        <View style={otpStyles.otpRow}>
                          <Text style={otpStyles.label}>🔐 Start OTP</Text>
                          <View style={otpStyles.otpBadge}>
                            <Text style={otpStyles.otpValue}>
                              {order.start_otp}
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}

                    {/* Work in progress */}
                    {order.status === "in_progress" && !order.complete_otp && (
                      <View style={otpStyles.progressBox}>
                        <Text style={otpStyles.progressText}>
                          Work is in progress... Waiting for provider to
                          complete
                        </Text>
                      </View>
                    )}

                    {/* Complete OTP */}
                    {order.status === "in_progress" && order.complete_otp && (
                      <View style={[otpStyles.box, otpStyles.endBox]}>
                        <Text style={otpStyles.hint}>
                          Share this OTP with the provider to confirm completion
                        </Text>
                        <View style={otpStyles.otpRow}>
                          <Text style={otpStyles.label}>✅ Complete OTP</Text>
                          <View style={[otpStyles.otpBadge, otpStyles.endBadge]}>
                            <Text style={otpStyles.otpValue}>
                              {order.complete_otp}
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}

                    {/* Cancel only when requested */}
                    {order.status === "requested" && (
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => cancelOrder(order.id)}
                      >
                        <Text style={styles.actionText}>Cancel Order</Text>
                      </TouchableOpacity>
                    )}
                  </BlurView>
                </Animated.View>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* ── Rating + Review Modal ── */}
      <Modal
        visible={ratingModal}
        transparent
        animationType="slide"
        statusBarTranslucent
      >
        <View style={ratingStyles.modalOverlay}>
          <View style={ratingStyles.modalCard}>
            <Text style={ratingStyles.emoji}>🎉</Text>
            <Text style={ratingStyles.modalTitle}>Service Completed!</Text>
            <Text style={ratingStyles.modalSubtitle}>
              How was your experience?
            </Text>

            <View style={ratingStyles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setSelectedRating(star)}
                >
                  <Text
                    style={[
                      ratingStyles.star,
                      star <= selectedRating && ratingStyles.starFilled,
                    ]}
                  >
                    ★
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {selectedRating > 0 && (
              <Text style={ratingStyles.ratingLabel}>
                {selectedRating === 1 && "😞 Poor"}
                {selectedRating === 2 && "😐 Fair"}
                {selectedRating === 3 && "🙂 Good"}
                {selectedRating === 4 && "😊 Very Good"}
                {selectedRating === 5 && "🤩 Excellent!"}
              </Text>
            )}

            {selectedRating > 0 && (
              <TextInput
                style={ratingStyles.commentInput}
                placeholder="Write a comment (optional)..."
                placeholderTextColor="#9ca3af"
                value={review}
                onChangeText={setReview}
                multiline
                numberOfLines={3}
                maxLength={300}
              />
            )}

            <TouchableOpacity
              style={ratingStyles.submitBtn}
              onPress={submitRating}
              disabled={ratingLoading}
            >
              <Text style={ratingStyles.submitText}>
                {ratingLoading ? "Submitting..." : "Submit Rating"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={ratingStyles.skipBtn}
              onPress={() => {
                setRatingModal(false);
                setRatingBookingId(null);
                setSelectedRating(0);
                setReview("");
              }}
            >
              <Text style={ratingStyles.skipText}>
                Rate Later (Previous Orders)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
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
  pendingStatus: { fontSize: 12, color: "#22c55e", marginTop: 6 },
  acceptedStatus: { fontSize: 12, color: "#38bdf8", marginTop: 6 },
  inProgressStatus: { fontSize: 12, color: "#f59e0b", marginTop: 6 },
  vendorBox: {
    marginTop: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    padding: 10,
  },
  vendorInfo: { color: "#fff", fontSize: 13, marginTop: 4 },
  cancelBtn: {
    marginTop: 12,
    backgroundColor: "#ef4444",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  actionText: { color: "white", fontWeight: "600" },
  alertText: { color: "#facc15", marginTop: 6, fontSize: 12 },
  infoBox: {
    marginTop: 10,
    backgroundColor: "rgba(56,189,248,0.12)",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.3)",
  },
  infoText: {
    color: "#38bdf8",
    fontSize: 12,
    lineHeight: 18,
  },
});

const otpStyles = StyleSheet.create({
  box: {
    marginTop: 14,
    backgroundColor: "rgba(56,189,248,0.12)",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.4)",
  },
  endBox: {
    backgroundColor: "rgba(34,197,94,0.12)",
    borderColor: "rgba(34,197,94,0.4)",
  },
  hint: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
    marginBottom: 10,
    textAlign: "center",
  },
  otpRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: { color: "#fff", fontWeight: "700", fontSize: 14 },
  otpBadge: {
    backgroundColor: "#38bdf8",
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  endBadge: { backgroundColor: "#22c55e" },
  otpValue: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 4,
  },
  progressBox: {
    marginTop: 14,
    backgroundColor: "rgba(245,158,11,0.12)",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.4)",
  },
  progressText: {
    color: "#f59e0b",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
});

const ratingStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "white",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 12,
  },
  emoji: { fontSize: 48, marginBottom: 8 },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111",
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 20,
  },
  starsRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  star: {
    fontSize: 44,
    color: "#d1d5db",
    marginHorizontal: 6,
  },
  starFilled: { color: "#f59e0b" },
  ratingLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 14,
  },
  commentInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: "#111",
    textAlignVertical: "top",
    marginBottom: 16,
    minHeight: 80,
    backgroundColor: "#f9fafb",
  },
  submitBtn: {
    backgroundColor: "#16a34a",
    paddingVertical: 14,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    marginBottom: 10,
  },
  submitText: { color: "white", fontWeight: "700", fontSize: 15 },
  skipBtn: { paddingVertical: 10 },
  skipText: {
    color: "#9ca3af",
    fontSize: 13,
    textDecorationLine: "underline",
  },
});