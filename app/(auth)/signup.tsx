// Supabase client
import { supabase } from "../../lib/supabase";

// React
import React, { useState, useRef } from "react";

// React Native components
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
  ScrollView,
  BackHandler,
  Image,
} from "react-native";

// Navigation
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";

// Image Picker
import * as ImagePicker from "expo-image-picker";

// Picker
import { Picker } from "@react-native-picker/picker";

// Location data
import { locationData } from "../../data/locationData";

export default function Signup() {
  const [step, setStep] = useState(1);

  // Step 1
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // Step 2
  const [age, setAge] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [aadhaarImage, setAadhaarImage] = useState("");
  const [landAcres, setLandAcres] = useState("");
  const [landType, setLandType] = useState("");
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [mandal, setMandal] = useState("");

  // Step 3
  const [mpin, setMpin] = useState(["", "", "", ""]);
  const [confirmMpin, setConfirmMpin] = useState(["", "", "", ""]);

  const mpinRefs = useRef<(TextInput | null)[]>([]);
  const confirmRefs = useRef<(TextInput | null)[]>([]);

  const stateOptions = Object.keys(locationData);

  const districtOptions = state
    ? Object.keys(locationData[state as keyof typeof locationData] || {})
    : [];

  const mandalOptions =
    state && district
      ? locationData[state as keyof typeof locationData]?.[
          district as keyof (typeof locationData)[keyof typeof locationData]
        ] || []
      : [];

  const handleStateChange = (value: string) => {
    setState(value);
    setDistrict("");
    setMandal("");
  };

  const handleDistrictChange = (value: string) => {
    setDistrict(value);
    setMandal("");
  };

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (step === 3) {
          setMpin(["", "", "", ""]);
          setConfirmMpin(["", "", "", ""]);
          setStep(2);
          return true;
        }

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

  const pickAadhaar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.3,
    });

    if (!result.canceled) {
      setAadhaarImage(result.assets[0].uri);
    }
  };

  const uploadAadhaarImage = async (): Promise<string | null> => {
    try {
      const response = await fetch(aadhaarImage);
      const arrayBuffer = await response.arrayBuffer();

      const filePath = `aadhaar/aadhaar_${Date.now()}.jpg`;

      const { error } = await supabase.storage
        .from("farmers")
        .upload(filePath, arrayBuffer, {
          contentType: "image/jpeg",
        });

      if (error) {
        console.log("Upload error:", error);
        throw error;
      }

      const { data: urlData } = supabase.storage
        .from("farmers")
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (err) {
      console.log("Upload failed:", err);
      Alert.alert("Upload Failed", "Aadhaar image upload failed. Try again.");
      return null;
    }
  };

  const handleStep1 = () => {
    if (!name.trim()) {
      Alert.alert("Error", "Name is required");
      return;
    }

    if (!phone || phone.length !== 10) {
      Alert.alert("Error", "Enter a valid 10-digit phone number");
      return;
    }

    setStep(2);
  };

  const handleStep2 = () => {
    if (!age || isNaN(Number(age))) {
      Alert.alert("Error", "Enter a valid Age");
      return;
    }

    if (aadhaar.length !== 12) {
      Alert.alert("Error", "Enter a valid 12-digit Aadhaar number");
      return;
    }

    if (!aadhaarImage) {
      Alert.alert("Error", "Please upload Aadhaar image");
      return;
    }

    if (!landAcres || isNaN(Number(landAcres))) {
      Alert.alert("Error", "Enter valid Land in Acres");
      return;
    }

    if (!landType) {
      Alert.alert("Error", "Please select Land Type");
      return;
    }

    if (!state) {
      Alert.alert("Error", "Please select State");
      return;
    }

    if (!district) {
      Alert.alert("Error", "Please select District");
      return;
    }

    if (!mandal) {
      Alert.alert("Error", "Please select Mandal");
      return;
    }

    setMpin(["", "", "", ""]);
    setConfirmMpin(["", "", "", ""]);
    setStep(3);
  };

  const handleSignup = async () => {
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

    try {
      const imageUrl = await uploadAadhaarImage();
      if (!imageUrl) return;

      const { error } = await supabase.from("farmers").insert([
        {
          full_name: name.trim(),
          phone_number: phone.trim(),
          age: parseInt(age),
          aadhaar_number: aadhaar.trim(),
          aadhaar_image: imageUrl,
          land_acres: parseFloat(landAcres),
          land_type: landType,
          state: state.trim(),
          district: district.trim(),
          mandal_name: mandal.trim(),
          mpin: mpin.join(""),
        },
      ]);

      if (error) {
        if (error.code === "23505") {
          Alert.alert(
            "Number Already Registered",
            "This mobile number is already registered. Please login instead."
          );
          return;
        }

        Alert.alert("Signup Failed", error.message || "Something went wrong.");
        return;
      }

      Alert.alert("Success", "Account created successfully!", [
        {
          text: "OK",
          onPress: () => router.replace("/login"),
        },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Something went wrong.");
    }
  };

  const renderBoxes = (
    value: string[],
    setValue: (v: string[]) => void,
    refs: React.MutableRefObject<(TextInput | null)[]>,
    secure?: boolean
  ) => (
    <View style={styles.otpContainer}>
      {value.map((digit, index) => (
        <TextInput
          key={index}
          ref={(ref) => {
            refs.current[index] = ref;
          }}
          style={styles.otpBox}
          keyboardType="number-pad"
          maxLength={1}
          value={digit}
          secureTextEntry={secure}
          onChangeText={(text) => {
            const arr = [...value];
            arr[index] = text.replace(/[^0-9]/g, "");
            setValue(arr);

            if (text && index < value.length - 1) {
              refs.current[index + 1]?.focus();
            }
          }}
          onKeyPress={({ nativeEvent }) => {
            if (nativeEvent.key === "Backspace" && !value[index] && index > 0) {
              refs.current[index - 1]?.focus();
            }
          }}
        />
      ))}
    </View>
  );

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
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.heading}>Create Account</Text>

            {step === 1 && (
              <>
                <Text style={styles.stepTitle}>Basic Details</Text>

                <TextInput
                  placeholder="Full Name"
                  placeholderTextColor="#ddd"
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                />

                <TextInput
                  placeholder="Phone Number"
                  placeholderTextColor="#ddd"
                  style={styles.input}
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phone}
                  onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, ""))}
                />

                <TouchableOpacity style={styles.button} onPress={handleStep1}>
                  <Text style={styles.buttonText}>Next →</Text>
                </TouchableOpacity>
              </>
            )}

            {step === 2 && (
              <>
                <Text style={styles.stepTitle}>Farm & Identity Details</Text>

                <TextInput
                  placeholder="Age"
                  placeholderTextColor="#ddd"
                  style={styles.input}
                  keyboardType="numeric"
                  value={age}
                  onChangeText={(text) => setAge(text.replace(/[^0-9]/g, ""))}
                />

                <TextInput
                  placeholder="Aadhaar Number (12 digits)"
                  placeholderTextColor="#ddd"
                  style={styles.input}
                  keyboardType="numeric"
                  maxLength={12}
                  value={aadhaar}
                  onChangeText={(text) => setAadhaar(text.replace(/[^0-9]/g, ""))}
                />

                <TouchableOpacity style={styles.button} onPress={pickAadhaar}>
                  <Text style={styles.buttonText}>
                    {aadhaarImage
                      ? "Aadhaar Uploaded ✓"
                      : "Upload Aadhaar Image"}
                  </Text>
                </TouchableOpacity>

                {aadhaarImage !== "" && (
                  <View style={styles.previewContainer}>
                    <Image source={{ uri: aadhaarImage }} style={styles.preview} />
                    <TouchableOpacity
                      style={styles.closeButton}
                      onPress={() => setAadhaarImage("")}
                    >
                      <Text style={styles.closeButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <TextInput
                  placeholder="Land in Acres"
                  placeholderTextColor="#ddd"
                  style={styles.input}
                  keyboardType="numeric"
                  value={landAcres}
                  onChangeText={(text) =>
                    setLandAcres(text.replace(/[^0-9.]/g, ""))
                  }
                />

                <Text style={styles.label}>Land Type</Text>
                <View style={styles.landRow}>
                  <TouchableOpacity
                    style={[
                      styles.landButton,
                      landType === "Own" && styles.selected,
                    ]}
                    onPress={() => setLandType("Own")}
                  >
                    <Text style={styles.buttonText}>Own</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.landButton,
                      landType === "Rented" && styles.selected,
                    ]}
                    onPress={() => setLandType("Rented")}
                  >
                    <Text style={styles.buttonText}>Rented</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>State</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={state}
                    onValueChange={handleStateChange}
                    dropdownIconColor="#fff"
                    style={styles.picker}
                    itemStyle={styles.pickerDropdownItem}
                  >
                    <Picker.Item label="Select State" value="" color="#111" />
                    {stateOptions.map((item, index) => (
                      <Picker.Item
                        key={index}
                        label={item}
                        value={item}
                        color="#111"
                      />
                    ))}
                  </Picker>
                </View>

                <Text style={styles.label}>District</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={district}
                    onValueChange={handleDistrictChange}
                    enabled={!!state}
                    dropdownIconColor="#fff"
                    style={styles.picker}
                    itemStyle={styles.pickerDropdownItem}
                  >
                    <Picker.Item label="Select District" value="" color="#111" />
                    {districtOptions.map((item, index) => (
                      <Picker.Item
                        key={index}
                        label={item}
                        value={item}
                        color="#111"
                      />
                    ))}
                  </Picker>
                </View>

                <Text style={styles.label}>Mandal</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={mandal}
                    onValueChange={(value) => setMandal(value)}
                    enabled={!!district}
                    dropdownIconColor="#fff"
                    style={styles.picker}
                    itemStyle={styles.pickerDropdownItem}
                  >
                    <Picker.Item label="Select Mandal" value="" color="#111" />
                    {mandalOptions.map((item, index) => (
                      <Picker.Item
                        key={index}
                        label={item}
                        value={item}
                        color="#111"
                      />
                    ))}
                  </Picker>
                </View>

                <TouchableOpacity style={styles.button} onPress={handleStep2}>
                  <Text style={styles.buttonText}>Save & Continue →</Text>
                </TouchableOpacity>
              </>
            )}

            {step === 3 && (
              <>
                <Text style={styles.stepTitle}>Set Your MPIN</Text>

                <Text style={styles.label}>Create MPIN</Text>
                {renderBoxes(mpin, setMpin, mpinRefs, true)}

                <Text style={styles.label}>Confirm MPIN</Text>
                {renderBoxes(confirmMpin, setConfirmMpin, confirmRefs, true)}

                <TouchableOpacity style={styles.button} onPress={handleSignup}>
                  <Text style={styles.buttonText}>Sign Up</Text>
                </TouchableOpacity>
              </>
            )}

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account?</Text>
              <TouchableOpacity onPress={() => router.push("/login")}>
                <Text style={styles.loginButton}> Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 24,
  },

  card: {
    width: "84%",
    alignSelf: "center",
    paddingVertical: 20,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.22)",
  },

  heading: {
    fontSize: 22,
    color: "#fff",
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },

  stepTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16,
  },

  input: {
    borderBottomWidth: 1,
    borderBottomColor: "#fff",
    marginBottom: 15,
    color: "#fff",
    paddingVertical: 8,
    fontSize: 15,
  },

  label: {
    color: "#fff",
    marginBottom: 6,
    marginTop: 10,
    fontSize: 14,
    fontWeight: "600",
  },

  pickerWrapper: {
    height: 54,
    borderWidth: 1,
    borderColor: "#fff",
    borderRadius: 14,
    marginBottom: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    overflow: "hidden",
  },

  picker: {
    height: Platform.OS === "ios" ? 54 : 58,
    color: "#fff",
    marginHorizontal: Platform.OS === "android" ? -4 : 0,
  },

  pickerDropdownItem: {
    fontSize: 15,
    color: "#111",
  },

  otpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 15,
  },

  otpBox: {
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

  previewContainer: {
    position: "relative",
    marginTop: 10,
    marginBottom: 10,
  },

  preview: {
    width: "100%",
    height: 120,
    borderRadius: 10,
  },

  closeButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
  },

  closeButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    lineHeight: 20,
  },

  landRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
    marginBottom: 5,
  },

  landButton: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
  },

  selected: {
    backgroundColor: "#4CAF50",
  },

  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 18,
  },

  loginText: {
    color: "#ddd",
  },

  loginButton: {
    color: "#4CAF50",
    fontWeight: "bold",
  },
});