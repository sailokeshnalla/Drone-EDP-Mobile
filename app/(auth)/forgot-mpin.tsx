import React, { useRef, useState } from "react";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  BackHandler,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

export default function ForgotMpin() {
  /* ---------------- STATE MANAGEMENT ---------------- */

  // Step 1 = Phone verification, Step 2 = Set new MPIN
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");

  // MPIN fields
  const [mpin, setMpin] = useState(["", "", "", ""]);
  const [confirmMpin, setConfirmMpin] = useState(["", "", "", ""]);

  /* ---------------- INPUT REFERENCES ---------------- */

  const mpinRefs = useRef<(TextInput | null)[]>([]);
  const confirmRefs = useRef<(TextInput | null)[]>([]);

  /* ---------------- HANDLE ANDROID BACK BUTTON ---------------- */

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (step === 2) {
          setStep(1);
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );

      return () => subscription.remove();
    }, [step])
  );

  /* ---------------- MPIN BOX RENDERER ---------------- */

  const renderBoxes = (
    values: string[],
    setValues: (v: string[]) => void,
    refs: React.MutableRefObject<(TextInput | null)[]>,
    secure?: boolean
  ) => (
    <View style={styles.boxRow}>
      {values.map((digit, index) => (
        <TextInput
          key={index}
          ref={(ref) => {
            refs.current[index] = ref;
          }}
          style={styles.box}
          keyboardType="number-pad"
          maxLength={1}
          value={digit}
          secureTextEntry={secure}
          onChangeText={(text) => {
            const cleaned = text.replace(/[^0-9]/g, "");
            const updated = [...values];
            updated[index] = cleaned;
            setValues(updated);

            if (cleaned && index < values.length - 1) {
              refs.current[index + 1]?.focus();
            }
          }}
          onKeyPress={({ nativeEvent }) => {
            if (nativeEvent.key !== "Backspace") return;

            const updated = [...values];
            if (updated[index] !== "") {
              updated[index] = "";
              setValues(updated);
              return;
            }

            if (index > 0) {
              updated[index - 1] = "";
              setValues(updated);
              refs.current[index - 1]?.focus();
            }
          }}
        />
      ))}
    </View>
  );

  /* ---------------- STEP 1 : VERIFY PHONE ---------------- */

  const handleNext = async () => {
    if (phone.length !== 10) {
      Alert.alert("Error", "Enter a valid 10-digit Phone Number");
      return;
    }

    const { data, error } = await supabase
      .from("farmers")
      .select("phone_number")
      .eq("phone_number", phone)
      .single();

    if (error || !data) {
      Alert.alert("Error", "Phone Number not registered");
      return;
    }

    // Phone Number verified — go to MPIN reset step
    setStep(2);
  };

  /* ---------------- STEP 2 : RESET MPIN ---------------- */

  const handleReset = async () => {
    if (mpin.join("").length !== 4) {
      Alert.alert("Error", "MPIN must be 4 digits");
      return;
    }

    if (confirmMpin.join("").length !== 4) {
      Alert.alert("Error", "Confirm MPIN must be 4 digits");
      return;
    }

    if (mpin.join("") !== confirmMpin.join("")) {
      Alert.alert("Error", "MPIN does not match");
      return;
    }

    const { error } = await supabase
      .from("farmers")
      .update({ mpin: mpin.join("") })
      .eq("phone_number", phone);

    if (error) {
      Alert.alert("Error", "Something went wrong. Please try again.");
      return;
    }

    Alert.alert("Success", "MPIN Reset Successfully", [
      {
        text: "OK",
        onPress: () => router.replace("/login"),
      },
    ]);
  };

  /* ---------------- UI ---------------- */

  return (
    <ImageBackground
      source={require("../../assets/images/signup.jpg")}
      style={styles.background}
      resizeMode="cover"
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.card}>
          <Text style={styles.heading}>Reset MPIN</Text>

          {step === 1 && (
            <>
              <Text style={styles.stepTitle}>Enter Registered Phone Number</Text>

              <TextInput
                placeholder="Phone Number"
                placeholderTextColor="#ddd"
                style={styles.input}
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, ""))}
              />

              <TouchableOpacity style={styles.button} onPress={handleNext}>
                <Text style={styles.buttonText}>Next →</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 2 && (
            <>
              <Text style={styles.stepTitle}>Set New MPIN</Text>

              <Text style={styles.label}>Create New MPIN</Text>
              {renderBoxes(mpin, setMpin, mpinRefs, true)}

              <Text style={styles.label}>Confirm MPIN</Text>
              {renderBoxes(confirmMpin, setConfirmMpin, confirmRefs, true)}

              <TouchableOpacity style={styles.button} onPress={handleReset}>
                <Text style={styles.buttonText}>Reset MPIN</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace("/login")}
          >
            <Text style={styles.backText}>← Back to Login</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  background: { flex: 1 },

  overlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
  },

  card: {
    width: "82%",
    alignSelf: "center",
    padding: 20,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.22)",
  },

  heading: {
    fontSize: 20,
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },

  stepTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16,
  },

  input: {
    borderBottomWidth: 1,
    borderBottomColor: "#fff",
    marginBottom: 15,
    color: "#fff",
    paddingVertical: 6,
  },

  label: {
    color: "#fff",
    marginBottom: 8,
  },

  boxRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 15,
  },

  box: {
    width: 45,
    height: 45,
    borderWidth: 1,
    borderColor: "#fff",
    borderRadius: 10,
    textAlign: "center",
    fontSize: 20,
    color: "#fff",
    marginHorizontal: 4,
  },

  button: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 10,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },

  backButton: {
    marginTop: 18,
    alignItems: "center",
  },

  backText: {
    color: "#4CAF50",
    fontWeight: "600",
    fontSize: 14,
  },
});