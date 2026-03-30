import { router } from "expo-router";
import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";

export default function Login() {
  const [mobile, setMobile] = useState("");
  const [mpin, setMpin] = useState(["", "", "", ""]);
  const inputs = useRef<Array<TextInput | null>>([]);
  const { loginByUserId } = useAuth();

  const handleLogin = async () => {
    const enteredMpin = mpin.join("");

    if (!mobile || mobile.length !== 10) {
      Alert.alert("Error", "Enter a valid 10-digit Mobile Number");
      return;
    }

    if (enteredMpin.length !== 4) {
      Alert.alert("Error", "Enter 4 digit MPIN");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("farmers")
        .select("id, full_name, phone_number")
        .eq("phone_number", mobile)
        .eq("mpin", enteredMpin)
        .single();

      if (error || !data) {
        Alert.alert("Login Failed", "Invalid Mobile Number or MPIN");
        setMpin(["", "", "", ""]);
        inputs.current[0]?.focus();
        return;
      }

      const success = await loginByUserId(data.id);

      if (!success) {
        Alert.alert("Login Failed", "Unable to load user profile.");
        return;
      }

      setMpin(["", "", "", ""]);
      router.replace("/(tabs)/home");
    } catch (err) {
      console.log("Login error:", err);
      Alert.alert("Error", "Something went wrong");
    }
  };

  const goToForgotMpin = () => {
    router.push("/(auth)/forgot-mpin");
  };

  return (
    <ImageBackground
      source={require("../../assets/images/signup.jpg")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.heading}>Login</Text>

          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.mobileInput}
            placeholder="Enter 10-digit Phone Number"
            placeholderTextColor="rgba(255,255,255,0.5)"
            keyboardType="number-pad"
            maxLength={10}
            value={mobile}
            onChangeText={(text) => setMobile(text.replace(/[^0-9]/g, ""))}
          />

          <Text style={styles.label}>Enter MPIN</Text>
          <View style={styles.otpContainer}>
            {mpin.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  inputs.current[index] = ref;
                }}
                style={styles.otpBox}
                keyboardType="number-pad"
                maxLength={1}
                value={digit}
                secureTextEntry
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^0-9]/g, "");
                  const newArr = [...mpin];
                  newArr[index] = cleaned;
                  setMpin(newArr);

                  if (cleaned && index < 3) {
                    inputs.current[index + 1]?.focus();
                  }
                }}
                onKeyPress={({ nativeEvent }) => {
                  if (
                    nativeEvent.key === "Backspace" &&
                    !mpin[index] &&
                    index > 0
                  ) {
                    inputs.current[index - 1]?.focus();
                  }
                }}
              />
            ))}
          </View>

          <TouchableOpacity style={styles.button} onPress={handleLogin}>
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={goToForgotMpin}>
            <Text style={styles.forgotText}>Forgot MPIN?</Text>
          </TouchableOpacity>

          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Do not have an account?</Text>
            <TouchableOpacity onPress={() => router.push("/signup")}>
              <Text style={styles.signupButton}> Signup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  card: {
    width: "85%",
    paddingVertical: 25,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  heading: {
    fontSize: 22,
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 25,
  },
  label: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginLeft: 4,
  },
  mobileInput: {
    borderWidth: 1,
    borderColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: "#fff",
    fontSize: 16,
    marginBottom: 20,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 25,
  },
  otpBox: {
    width: 50,
    height: 50,
    borderWidth: 1,
    borderColor: "#fff",
    borderRadius: 10,
    textAlign: "center",
    fontSize: 20,
    color: "#fff",
    marginHorizontal: 6,
  },
  button: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  forgotText: {
    color: "#4CAF50",
    textAlign: "center",
    marginTop: 15,
    fontWeight: "600",
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 15,
  },
  signupText: {
    color: "#ddd",
  },
  signupButton: {
    color: "#4CAF50",
    fontWeight: "bold",
  },
});