import { Picker } from "@react-native-picker/picker";
import * as Location from "expo-location";
import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  Platform,
  StatusBar,
  KeyboardAvoidingView,  // ✅ added
} from "react-native";
import MapView, { PROVIDER_GOOGLE, Region } from "react-native-maps";
import { Calendar } from "react-native-calendars";
import { supabase } from "../../lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { AudioPlayer, createAudioPlayer } from "expo-audio";
import { SafeAreaView } from "react-native-safe-area-context";

const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
  .toISOString()
  .split("T")[0];

const isValidIndianPincode = (pin: string) => /^[1-9][0-9]{5}$/.test(pin);

// ── Types ──────────────────────────────────────────────────────────────────────
interface ServicePricing {
  id: string;
  crop_name: string;
  base_rate: number;
  platform_fee: number;
  final_rate: number;
  is_active: boolean;
}

interface SavedAddress {
  id: string;
  farmer_id: string | null;
  address_name: string;
  address_line: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
  latitude: number;
  longitude: number;
  is_default: boolean | null;
  created_at: string | null;
  label: string | null;
}

export default function BookingScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);

  const playSuccessSound = async () => {
    try {
      const player: AudioPlayer = createAudioPlayer(
        require("../../assets/sounds/success.mp3")
      );
      player.play();
      player.addListener("playbackStatusUpdate", (status) => {
        if (status.didJustFinish) {
          player.remove();
        }
      });
    } catch {
      // silently ignore if sound fails
    }
  };

  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastGeocodedRef = useRef<{ lat: number; lng: number } | null>(null);

  // ── Service pricing from Supabase ──────────────────────────────────────────
  const [servicePricingList, setServicePricingList] = useState<ServicePricing[]>([]);
  const [pricingLoading, setPricingLoading] = useState(true);

  const cropOptions = useMemo(() => {
    const crops = servicePricingList.map((p) => p.crop_name);
    return ["Select Crop", ...crops];
  }, [servicePricingList]);

  const cropPrices = useMemo(() => {
    const map: Record<string, number> = {};
    servicePricingList.forEach((p) => {
      map[p.crop_name] = p.final_rate;
    });
    return map;
  }, [servicePricingList]);

  // ── State ──────────────────────────────────────────────────────────────────
  const [cropType, setCropType] = useState("Select Crop");
  const [acre, setAcre] = useState("");
  const [price, setPrice] = useState(0);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [mapVisible, setMapVisible] = useState(false);
  const [mobile, setMobile] = useState("");
  const [paymentMethod] = useState("Cash on Service");
  const [initialRegion, setInitialRegion] = useState<Region>({
    latitude: 17.385,
    longitude: 78.486,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [currentLocLoading, setCurrentLocLoading] = useState(false);
  const [placeName, setPlaceName] = useState("");
  const [placeAddress, setPlaceAddress] = useState("");
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);

  // ── Fetch service_pricing on mount ────────────────────────────────────────
  useEffect(() => {
    fetchServicePricing();
  }, []);

  const fetchServicePricing = async () => {
    try {
      setPricingLoading(true);
      const { data, error } = await supabase
        .from("service_pricing")
        .select("id, crop_name, base_rate, platform_fee, final_rate, is_active")
        .eq("is_active", true)
        .order("crop_name", { ascending: true });

      if (error) { console.error("Error fetching service pricing:", error.message); return; }
      if (data) setServicePricingList(data as ServicePricing[]);
    } catch {
      // silently ignore
    } finally {
      setPricingLoading(false);
    }
  };

  // ── Reset fields on focus ──────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      setCropType("Select Crop");
      setAcre("");
      setPrice(0);
      setSelectedDate("");
      setSelectedTime("");
      setMobile("");
      setAddressLine1("");
      setCity("");
      setPincode("");
      setLatitude(null);
      setLongitude(null);
      setPlaceName("");
      setPlaceAddress("");
    }, [])
  );

  useEffect(() => {
    fetchSavedAddresses();
  }, []);

  const fetchSavedAddresses = async () => {
    try {
      setSavedLoading(true);
      const farmerId = await AsyncStorage.getItem("user_id");
      if (!farmerId) return;

      const { data, error } = await supabase
        .from("farmer_addresses")
        .select("*")
        .eq("farmer_id", farmerId)
        .order("created_at", { ascending: false });

      if (error) { console.log("Fetch addresses error:", error.message); return; }
      setSavedAddresses((data || []) as SavedAddress[]);
    } catch (err) {
      console.log("Fetch addresses failed:", err);
    } finally {
      setSavedLoading(false);
    }
  };

  // ── Manual address field handlers ──────────────────────────────────────────
  const handleAddressLineChange = (text: string) => {
    setAddressLine1(text);
    setLatitude(null); setLongitude(null);
    setPlaceName(""); setPlaceAddress("");
  };

  const handleCityChange = (text: string) => {
    setCity(text);
    setLatitude(null); setLongitude(null);
    setPlaceName(""); setPlaceAddress("");
  };

  const handlePincodeChange = (text: string) => {
    const filtered = text.replace(/[^0-9]/g, "");
    setPincode(filtered);
    setLatitude(null); setLongitude(null);
    setPlaceName(""); setPlaceAddress("");
  };

  // ── Resolve coordinates from manually entered address ──────────────────────
  const getCoordinatesFromManualAddress = async (): Promise<{
    latitude: number;
    longitude: number;
  } | null> => {
    try {
      const fullAddress = [addressLine1.trim(), city.trim(), pincode.trim()]
        .filter(Boolean).join(", ");
      if (!fullAddress) return null;

      const results = await Location.geocodeAsync(fullAddress);
      if (results && results.length > 0) {
        const coords = { latitude: results[0].latitude, longitude: results[0].longitude };
        setLatitude(coords.latitude);
        setLongitude(coords.longitude);
        try {
          const [place] = await Location.reverseGeocodeAsync(coords);
          if (place) {
            setPlaceName(place.name || place.street || "Selected Location");
            setPlaceAddress([place.street, place.district, place.city || place.region, place.country].filter(Boolean).join(", "));
          }
        } catch { }
        return coords;
      }
      return null;
    } catch (error) {
      console.log("Manual geocode error:", error);
      return null;
    }
  };

  // ── Price calculation ──────────────────────────────────────────────────────
  useEffect(() => {
    if (cropType !== "Select Crop" && acre) {
      setPrice((cropPrices[cropType] || 0) * Number(acre));
    } else {
      setPrice(0);
    }
  }, [cropType, acre, cropPrices]);

  // ── Init location on mount ─────────────────────────────────────────────────
  useEffect(() => {
    const initLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({});
      setLatitude(loc.coords.latitude);
      setLongitude(loc.coords.longitude);
      setInitialRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    };
    initLocation();
  }, []);

  // ── Thank you redirect ─────────────────────────────────────────────────────
  useEffect(() => {
    if (showThankYou) {
      const timer = setTimeout(() => {
        setShowThankYou(false);
        setCropType("Select Crop"); setAcre(""); setPrice(0);
        setSelectedDate(""); setSelectedTime("");
        setAddressLine1(""); setCity(""); setPincode("");
        setLatitude(null); setLongitude(null);
        setMobile(""); setPlaceName(""); setPlaceAddress("");
        router.replace("/(tabs)/home");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showThankYou, router]);

  // ── Time slots ─────────────────────────────────────────────────────────────
  const slots = useMemo(() => {
    const data: { label: string }[] = [];
    for (let hour = 6; hour <= 13; hour++) {
      const hour12 = hour > 12 ? hour - 12 : hour;
      const period = hour >= 12 ? "PM" : "AM";
      data.push({ label: `${hour12}:00 ${period}` });
      data.push({ label: `${hour12}:30 ${period}` });
    }
    return data;
  }, []);

  // ── Reverse geocode ────────────────────────────────────────────────────────
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    if (lastGeocodedRef.current) {
      const dLat = Math.abs(lastGeocodedRef.current.lat - lat);
      const dLng = Math.abs(lastGeocodedRef.current.lng - lng);
      if (dLat < 0.0001 && dLng < 0.0001) return;
    }
    try {
      const [place] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      lastGeocodedRef.current = { lat, lng };
      setPlaceName(place.name || place.street || "Selected Location");
      setPlaceAddress([place.street, place.district, place.city || place.region, place.country].filter(Boolean).join(", "));
      setLatitude(lat); setLongitude(lng);
      setAddressLine1([place.name, place.street].filter(Boolean).join(", "));
      setCity(place.city || place.district || place.region || "");
      setPincode(place.postalCode || "");
    } catch {
      setPlaceName("Selected Location");
      setPlaceAddress("");
    }
  }, []);

  const onMapStopped = useCallback((region: Region) => {
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(() => {
      reverseGeocode(region.latitude, region.longitude);
    }, 600);
  }, [reverseGeocode]);

  // ── Open map ───────────────────────────────────────────────────────────────
  const openMap = async () => {
    setPlaceName(""); setPlaceAddress("");
    lastGeocodedRef.current = null;
    setMapVisible(true);
    setCurrentLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") { setCurrentLocLoading(false); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const newRegion: Region = { latitude: loc.coords.latitude, longitude: loc.coords.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 };
      setTimeout(() => mapRef.current?.animateToRegion(newRegion, 600), 400);
      await reverseGeocode(loc.coords.latitude, loc.coords.longitude);
    } catch { } finally {
      setCurrentLocLoading(false);
    }
  };

  const goToCurrentLocation = async () => {
    setCurrentLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const newRegion: Region = { latitude: loc.coords.latitude, longitude: loc.coords.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 };
      mapRef.current?.animateToRegion(newRegion, 600);
      await reverseGeocode(loc.coords.latitude, loc.coords.longitude);
    } catch {
      Alert.alert("Error", "Could not fetch current location.");
    } finally {
      setCurrentLocLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const results = await Location.geocodeAsync(searchQuery.trim());
      if (results && results.length > 0) {
        const { latitude: lat, longitude: lng } = results[0];
        mapRef.current?.animateToRegion({ latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 600);
        await reverseGeocode(lat, lng);
      } else {
        Alert.alert("Not Found", "No results found. Try a different search.");
      }
    } catch {
      Alert.alert("Error", "Could not search for this address.");
    } finally {
      setSearchLoading(false);
    }
  };

  // ── Save address ───────────────────────────────────────────────────────────
  const saveAddressIfNew = async () => {
    try {
      const farmerId = await AsyncStorage.getItem("user_id");
      if (!farmerId || !addressLine1.trim()) return;

      let finalLatitude = latitude;
      let finalLongitude = longitude;
      if (finalLatitude == null || finalLongitude == null) {
        const coords = await getCoordinatesFromManualAddress();
        if (!coords) return;
        finalLatitude = coords.latitude;
        finalLongitude = coords.longitude;
      }

      const trimmedAddress = addressLine1.trim();
      const trimmedPincode = pincode.trim();

      const { data: existing, error: checkError } = await supabase
        .from("farmer_addresses").select("id")
        .eq("farmer_id", farmerId).eq("address_line", trimmedAddress).eq("pincode", trimmedPincode).limit(1);

      if (checkError) { console.log("Check address error:", checkError.message); return; }
      if (existing && existing.length > 0) return;

      const { error } = await supabase.from("farmer_addresses").insert([{
        farmer_id: farmerId,
        address_name: placeName?.trim() || trimmedAddress || "Saved Address",
        address_line: trimmedAddress || null,
        district: city.trim() || null,
        state: null,
        pincode: trimmedPincode || null,
        latitude: Number(finalLatitude),
        longitude: Number(finalLongitude),
        is_default: false,
        label: "Saved Address",
      }]);

      if (error) { console.log("Save address error:", error.message); return; }
      await fetchSavedAddresses();
    } catch (err) {
      console.log("Save address failed:", err);
    }
  };

  const applySavedAddress = (addr: SavedAddress) => {
    setAddressLine1(addr.address_line || "");
    setCity(addr.district || "");
    setPincode(addr.pincode || "");
    setLatitude(addr.latitude);
    setLongitude(addr.longitude);
    setPlaceName(addr.address_name || addr.label || "");
    setPlaceAddress(addr.address_line || "");
  };

  const deleteSavedAddress = (id: string) => {
    Alert.alert("Remove Address", "Are you sure you want to remove this saved address?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive",
        onPress: async () => {
          try {
            const { error } = await supabase.from("farmer_addresses").delete().eq("id", id);
            if (error) { Alert.alert("Error", error.message); return; }
            setSavedAddresses((prev) => prev.filter((a) => a.id !== id));
          } catch {
            Alert.alert("Error", "Could not delete address.");
          }
        },
      },
    ]);
  };

  // ── Confirm booking ────────────────────────────────────────────────────────
  const confirmBooking = () => {
    if (cropType === "Select Crop") { Alert.alert("Validation", "Please select a crop."); return; }
    if (!acre.trim() || Number(acre) <= 0) { Alert.alert("Validation", "Please enter a valid acre."); return; }
    if (!selectedDate || !selectedTime) { Alert.alert("Validation", "Please select date and time."); return; }
    if (!addressLine1.trim() || !city.trim() || !pincode.trim()) { Alert.alert("Validation", "Please fill all address details."); return; }
    if (!isValidIndianPincode(pincode)) { Alert.alert("Validation", "Please enter a valid Indian pincode."); return; }
    if (!mobile.trim() || mobile.trim().length !== 10) { Alert.alert("Validation", "Please enter a valid mobile number."); return; }

    Alert.alert("Confirm Booking", `Total Price: ₹${price}\nPayment: Cash on Service`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        onPress: async () => {
          try {
            setLoading(true);

            let finalLatitude = latitude;
            let finalLongitude = longitude;
            if (finalLatitude == null || finalLongitude == null) {
              const coords = await getCoordinatesFromManualAddress();
              if (!coords) {
                Alert.alert("Validation", "Unable to detect location from entered address. Please choose location from map or enter a more accurate address.");
                return;
              }
              finalLatitude = coords.latitude;
              finalLongitude = coords.longitude;
            }

            const [timePart, period] = selectedTime.split(" ");
            const [hourStr, minuteStr] = timePart.split(":");
            let hour = parseInt(hourStr, 10);
            const minute = parseInt(minuteStr, 10);
            if (period === "PM" && hour !== 12) hour += 12;
            if (period === "AM" && hour === 12) hour = 0;

            const scheduledAt = new Date(
              `${selectedDate}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`
            ).toISOString();

            const farmerId = await AsyncStorage.getItem("user_id");
            const farmerName = await AsyncStorage.getItem("user_name");

            if (!farmerId) { Alert.alert("Error", "Farmer not logged in."); return; }

            await saveAddressIfNew();

            const { error } = await supabase.from("bookings").insert([{
              farmer_id: farmerId,
              provider_id: null,
              service_type: null,
              crop_type: cropType,
              area_size: Number(acre),
              mandal: null,
              district: city.trim() || null,
              scheduled_at: scheduledAt,
              status: "requested",
              total_price: price,
              farmer_name: farmerName ?? null,
              provider_name: null,
              address_line: addressLine1.trim(),
              landmark: null,
              contact_phone: mobile.trim(),
              payment_method: paymentMethod,
              payment_status: "PENDING",
              booking_source: "farmer-app",
              created_by_admin: null,
              request_status: "broadcasting",
              accepted_at: null,
              state: null,
              latitude: finalLatitude,
              longitude: finalLongitude,
              cancelled_provider_id: null,
              reassignment_started_at: null,
              assigned_by_admin: false,
              admin_notes: null,
              notified_providers: null,
              current_radius: 10,
              dispatch_started_at: new Date().toISOString(),
              pincode: pincode.trim(),
              beneficiary_name: null,
              beneficiary_phone: null,
              start_otp: null,
              complete_otp: null,
              contact_person_name: null,
              notes: null,
              rating: null,
              rating_comment: null,
              agency_name: null,
            }]);

            if (error) { Alert.alert("Error", error.message); return; }

            await fetchSavedAddresses();
            await playSuccessSound();
            setShowThankYou(true);
          } catch {
            Alert.alert("Error", "Booking failed.");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  // ── Thank you screen ───────────────────────────────────────────────────────
  if (showThankYou) {
    return (
      <ImageBackground source={require("../../assets/images/landing.jpg")} style={styles.background}>
        <View style={styles.overlay}>
          <View style={styles.center}>
            <View style={thankYouStyles.card}>
              <Text style={thankYouStyles.emoji}>🎉</Text>
              <Text style={thankYouStyles.title}>Booking Confirmed!</Text>
              <View style={thankYouStyles.divider} />
              <View style={thankYouStyles.row}><Text style={thankYouStyles.label}>Crop</Text><Text style={thankYouStyles.value}>{cropType}</Text></View>
              <View style={thankYouStyles.row}><Text style={thankYouStyles.label}>Acre</Text><Text style={thankYouStyles.value}>{acre}</Text></View>
              <View style={thankYouStyles.row}><Text style={thankYouStyles.label}>Price</Text><Text style={thankYouStyles.price}>₹{price}</Text></View>
              <View style={thankYouStyles.row}><Text style={thankYouStyles.label}>Date</Text><Text style={thankYouStyles.value}>{selectedDate}</Text></View>
              <View style={thankYouStyles.row}><Text style={thankYouStyles.label}>Time</Text><Text style={thankYouStyles.value}>{selectedTime}</Text></View>
              <View style={thankYouStyles.row}><Text style={thankYouStyles.label}>Payment</Text><Text style={thankYouStyles.value}>Cash on Service</Text></View>
              <View style={thankYouStyles.divider} />
              <Text style={thankYouStyles.redirect}>⏳ Redirecting to Home...</Text>
            </View>
          </View>
        </View>
      </ImageBackground>
    );
  }

  // ── ✅ FIX: Wrap with KeyboardAvoidingView so keyboard doesn't overlap inputs
  return (
    <ImageBackground source={require("../../assets/images/landing.jpg")} style={styles.background}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <View style={styles.overlay}>
          <ScrollView
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── Crop Details ── */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Crop Details</Text>
              {pricingLoading ? (
                <View style={styles.pricingLoader}>
                  <ActivityIndicator color="white" size="small" />
                  <Text style={styles.pricingLoaderText}>Loading crop options...</Text>
                </View>
              ) : (
                <>
                  <View style={styles.row}>
                    <View style={styles.cropBox}>
                      <Picker selectedValue={cropType} onValueChange={(value) => setCropType(value)} dropdownIconColor="white" style={styles.picker}>
                        {cropOptions.map((crop, index) => (<Picker.Item key={index} label={crop} value={crop} />))}
                      </Picker>
                    </View>
                    <TextInput
                      style={styles.acreInput}
                      placeholder="Acre"
                      placeholderTextColor="white"
                      value={acre}
                      onChangeText={(text) => {
                        if (text.length > 4) return;
                        setAcre(text.replace(/[^0-9]/g, ""));
                      }}
                      keyboardType="numeric"
                      autoComplete="off"
                      textContentType="none"
                      importantForAutofill="no"
                    />
                  </View>
                  {cropType !== "Select Crop" && (
                    <View style={styles.rateHintBox}>
                      <Text style={styles.rateHintText}>Rate: ₹{cropPrices[cropType] ?? 0} / acre</Text>
                    </View>
                  )}
                  <View style={styles.priceBox}>
                    <Text style={styles.priceText}>Estimated Price: ₹{price}</Text>
                  </View>
                </>
              )}
            </View>

            {/* ── Calendar ── */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Select Date</Text>
              <Calendar
                style={{ backgroundColor: "transparent" }}
                theme={{
                  backgroundColor: "transparent", calendarBackground: "transparent",
                  textSectionTitleColor: "#ffffff", selectedDayBackgroundColor: "#16a34a",
                  selectedDayTextColor: "#ffffff", todayTextColor: "#16a34a",
                  dayTextColor: "#ffffff", textDisabledColor: "rgba(255,255,255,0.3)",
                  monthTextColor: "#ffffff", arrowColor: "#ffffff",
                }}
                minDate={tomorrow}
                onDayPress={(day) => setSelectedDate(day.dateString)}
                markedDates={{ [selectedDate]: { selected: true, selectedColor: "#16a34a" } }}
              />
            </View>

            {/* ── Time Slots ── */}
{!!selectedDate && (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>Select Time</Text>
    <FlatList
      data={slots}
      numColumns={3}
      keyExtractor={(item) => item.label}
      scrollEnabled={false}
      columnWrapperStyle={styles.slotRow}
      contentContainerStyle={styles.slotListContent}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => setSelectedTime(item.label)}
          style={[styles.slot, selectedTime === item.label && styles.selected]}
        >
          <Text style={styles.slotText}>{item.label}</Text>
        </TouchableOpacity>
      )}
    />
  </View>
)}

            {/* ── Address Details ── */}
            {!!selectedTime && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Address Details</Text>

                <TouchableOpacity style={styles.locBtn} onPress={openMap}>
                  <Text style={styles.locText}>📌 Choose Location</Text>
                </TouchableOpacity>

                {savedLoading ? (
                  <ActivityIndicator color="white" style={{ marginBottom: 12 }} />
                ) : savedAddresses.length > 0 ? (
                  <View style={savedStyles.section}>
                    <Text style={savedStyles.title}>Saved Addresses</Text>
                    {savedAddresses.map((addr) => (
                      <View key={addr.id} style={savedStyles.row}>
                        <TouchableOpacity style={savedStyles.itemBtn} onPress={() => applySavedAddress(addr)}>
                          <Text style={savedStyles.itemText} numberOfLines={2}>
                            📍 {addr.address_name || addr.address_line || "Saved Address"}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={savedStyles.deleteBtn} onPress={() => deleteSavedAddress(addr.id)}>
                          <Text style={savedStyles.deleteText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : null}

                <TextInput style={styles.input} placeholder="Address" placeholderTextColor="white" value={addressLine1} onChangeText={handleAddressLineChange} />
                <TextInput style={styles.input} placeholder="City / District" placeholderTextColor="white" value={city} onChangeText={handleCityChange} />
                <TextInput style={styles.input} placeholder="Pincode" placeholderTextColor="white" value={pincode} onChangeText={handlePincodeChange} keyboardType="numeric" maxLength={6} />

                {/* ✅ FIX: returnKeyType + scrollEnabled hint for mobile input */}
                <TextInput
                  style={styles.input}
                  placeholder="Mobile Number"
                  placeholderTextColor="white"
                  value={mobile}
                  onChangeText={setMobile}
                  keyboardType="numeric"
                  maxLength={10}
                  autoComplete="off"
                  textContentType="none"
                  importantForAutofill="no"
                  returnKeyType="done"
                />

                <View style={paymentStyles.box}>
                  <Text style={paymentStyles.label}>Payment Method</Text>
                  <View style={paymentStyles.badge}>
                    <Text style={paymentStyles.badgeText}>Cash on Service</Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.confirmBtn} onPress={confirmBooking} disabled={loading}>
                  {loading ? <ActivityIndicator color="white" /> : <Text style={styles.confirmText}>Confirm Booking</Text>}
                </TouchableOpacity>
              </View>
            )}

            <View style={{ height: 60 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* ── Map Modal ── */}
      <Modal visible={mapVisible} animationType="slide" statusBarTranslucent>
        <View style={mapStyles.screen}>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFillObject}
            provider={PROVIDER_GOOGLE}
            showsUserLocation
            showsMyLocationButton={false}
            showsCompass={false}
            initialRegion={initialRegion}
            onRegionChangeComplete={onMapStopped}
          />

          <SafeAreaView style={mapStyles.topBar}>
            <TouchableOpacity style={mapStyles.backBtn} onPress={() => { setMapVisible(false); setSearchQuery(""); }}>
              <Text style={mapStyles.backArrow}>←</Text>
            </TouchableOpacity>
            <View style={mapStyles.searchBox}>
              <TextInput style={mapStyles.searchInput} placeholder="Search an area or address" placeholderTextColor="#999" value={searchQuery} onChangeText={setSearchQuery} onSubmitEditing={handleSearch} returnKeyType="search" />
              {searchLoading ? (
                <ActivityIndicator color="#555" size="small" style={{ marginRight: 10 }} />
              ) : (
                <TouchableOpacity onPress={handleSearch} style={{ padding: 4 }}>
                  <Text style={mapStyles.searchIconText}>🔍</Text>
                </TouchableOpacity>
              )}
            </View>
          </SafeAreaView>

          <View pointerEvents="none" style={mapStyles.pinContainer}>
            <View style={mapStyles.pinBalloon}><View style={mapStyles.pinDot} /></View>
            <View style={mapStyles.pinTip} />
            <View style={mapStyles.pinShadow} />
          </View>

          <TouchableOpacity style={mapStyles.currentLocPill} onPress={goToCurrentLocation} disabled={currentLocLoading}>
            {currentLocLoading ? <ActivityIndicator color="#333" size="small" /> : (
              <><Text style={mapStyles.currentLocIcon}>◎</Text><Text style={mapStyles.currentLocLabel}>Current location</Text></>
            )}
          </TouchableOpacity>

          <View style={mapStyles.bottomSheet}>
            <Text style={mapStyles.deliverHint}>Order will be delivered here</Text>
            <View style={mapStyles.placeRow}>
              <Text style={mapStyles.placeMapPin}>📍</Text>
              <View style={{ flex: 1 }}>
                <Text style={mapStyles.placeName} numberOfLines={1}>{placeName || "Move the map to select a location"}</Text>
                <Text style={mapStyles.placeSubtext} numberOfLines={2}>{placeAddress}</Text>
              </View>
            </View>
            <TouchableOpacity style={mapStyles.confirmBtn} onPress={() => { setMapVisible(false); setSearchQuery(""); }}>
              <Text style={mapStyles.confirmBtnText}>Confirm &amp; proceed</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  background: { flex: 1 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  container: { padding: 16, paddingTop: 30, paddingBottom: 30 },
  card: { backgroundColor: "rgba(0,0,0,0.35)", padding: 16, borderRadius: 20, marginBottom: 20 },
  cardTitle: { fontSize: 16, fontWeight: "600", marginBottom: 12, color: "white" },
  row: { flexDirection: "row", alignItems: "center" },
  cropBox: { flex: 2, marginRight: 10, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 10, overflow: "hidden" },
  picker: { color: "white" },
  acreInput: { flex: 1, borderWidth: 1, borderColor: "rgba(255,255,255,0.5)", borderRadius: 10, padding: 12, backgroundColor: "rgba(255,255,255,0.2)", color: "white" },
  priceBox: { marginTop: 10, backgroundColor: "rgba(255,255,255,0.15)", padding: 10, borderRadius: 10, alignItems: "center" },
  priceText: { color: "white", fontWeight: "600" },
  rateHintBox: { marginTop: 8, alignItems: "flex-end" },
  rateHintText: { color: "rgba(255,255,255,0.6)", fontSize: 12 },
  pricingLoader: { flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 10 },
  pricingLoaderText: { color: "rgba(255,255,255,0.7)", fontSize: 13, marginLeft: 8 },
  input: { borderWidth: 1, borderColor: "rgba(255,255,255,0.5)", borderRadius: 10, padding: 12, marginBottom: 10, backgroundColor: "rgba(255,255,255,0.2)", color: "white" },
  locBtn: { padding: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.4)", borderRadius: 10, alignItems: "center", marginBottom: 12, backgroundColor: "rgba(255,255,255,0.15)" },
  locText: { color: "#ffffff", fontWeight: "600" },
  confirmBtn: { backgroundColor: "#16a34a", padding: 14, borderRadius: 12, alignItems: "center", marginTop: 10, marginBottom: 10 },
  confirmText: { color: "white", fontWeight: "600" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 },
  big: { fontSize: 24, fontWeight: "bold", marginBottom: 14, color: "white" },
slotListContent: {
  paddingBottom: 8,
},

slotRow: {
  justifyContent: "space-between",
  marginBottom: 12,
},

slot: {
  width: "31%",
  paddingVertical: 16,
  paddingHorizontal: 6,
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.4)",
  borderRadius: 10,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(255,255,255,0.2)",
},

selected: {
  backgroundColor: "#16a34a",
  borderColor: "#16a34a",
},

slotText: {
  color: "white",
  textAlign: "center",
},
});

const savedStyles = StyleSheet.create({
  section: { marginBottom: 14, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 12, padding: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  title: { color: "#35e676", fontWeight: "700", fontSize: 13, marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  itemBtn: { flex: 1, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, marginRight: 6 },
  itemText: { color: "white", fontSize: 12, lineHeight: 18 },
  deleteBtn: { backgroundColor: "rgba(220,38,38,0.65)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9 },
  deleteText: { color: "white", fontWeight: "700", fontSize: 12 },
});

const paymentStyles = StyleSheet.create({
  box: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)", borderRadius: 10, padding: 12, marginBottom: 10 },
  label: { color: "white", fontWeight: "600", fontSize: 14 },
  badge: { backgroundColor: "rgba(22,163,74,0.3)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "#16a34a" },
  badgeText: { color: "#a3e635", fontWeight: "700", fontSize: 13 },
});

const mapStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#e8e8e8" },
  topBar: { position: "absolute", top: Platform.OS === "android" ? StatusBar.currentHeight ?? 24 : 0, left: 0, right: 0, zIndex: 20, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "white", alignItems: "center", justifyContent: "center", marginRight: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5 },
  backArrow: { fontSize: 22, color: "#222", marginTop: -2 },
  searchBox: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "white", borderRadius: 26, paddingHorizontal: 14, height: 46, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 5 },
  searchInput: { flex: 1, fontSize: 14, color: "#111", height: 46 },
  searchIconText: { fontSize: 16 },
  pinContainer: { position: "absolute", top: "50%", left: "50%", alignItems: "center", marginLeft: -20, marginTop: -54 },
  pinBalloon: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#e53935", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 4, elevation: 8 },
  pinDot: { width: 13, height: 13, borderRadius: 7, backgroundColor: "white" },
  pinTip: { width: 0, height: 0, borderLeftWidth: 8, borderRightWidth: 8, borderTopWidth: 12, borderLeftColor: "transparent", borderRightColor: "transparent", borderTopColor: "#e53935", marginTop: -1 },
  pinShadow: { width: 16, height: 6, borderRadius: 8, backgroundColor: "rgba(0,0,0,0.22)", marginTop: 2 },
  currentLocPill: { position: "absolute", bottom: 230, alignSelf: "center", flexDirection: "row", alignItems: "center", backgroundColor: "white", paddingHorizontal: 20, paddingVertical: 11, borderRadius: 26, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 5, elevation: 6, zIndex: 10 },
  currentLocIcon: { fontSize: 17, marginRight: 8, color: "#333" },
  currentLocLabel: { fontSize: 14, fontWeight: "600", color: "#111" },
  bottomSheet: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "white", borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 20, paddingTop: 22, paddingBottom: Platform.OS === "ios" ? 38 : 26, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 14, zIndex: 10 },
  deliverHint: { fontSize: 13, color: "#888", marginBottom: 12 },
  placeRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 18 },
  placeMapPin: { fontSize: 24, marginRight: 10, marginTop: 1 },
  placeName: { fontSize: 20, fontWeight: "700", color: "#111", marginBottom: 4 },
  placeSubtext: { fontSize: 13, color: "#666", lineHeight: 19 },
  confirmBtn: { backgroundColor: "#0e913e", paddingVertical: 16, borderRadius: 10, alignItems: "center" },
  confirmBtnText: { color: "white", fontSize: 16, fontWeight: "700", letterSpacing: 0.3 },
});

const thankYouStyles = StyleSheet.create({
  card: { backgroundColor: "white", borderRadius: 24, padding: 28, width: "100%", shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 12, alignItems: "center" },
  emoji: { fontSize: 52, marginBottom: 10 },
  title: { fontSize: 22, fontWeight: "800", color: "#16a34a", marginBottom: 16 },
  divider: { width: "100%", height: 1, backgroundColor: "#e5e7eb", marginVertical: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", width: "100%", marginBottom: 8 },
  label: { fontSize: 14, color: "#6b7280", fontWeight: "500" },
  value: { fontSize: 14, color: "#111827", fontWeight: "600" },
  price: { fontSize: 16, color: "#16a34a", fontWeight: "800" },
  redirect: { fontSize: 13, color: "#9ca3af", marginTop: 4 },
});