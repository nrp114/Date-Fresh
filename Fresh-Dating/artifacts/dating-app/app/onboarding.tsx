import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";

const GENDER_OPTIONS = ["Man", "Woman", "Non-binary", "Other"];
const ORIENTATION_OPTIONS = ["Straight", "Gay", "Lesbian", "Bisexual", "Pansexual", "Other"];
const INTENT_OPTIONS = [
  "Something long-term",
  "Something casual",
  "New friends",
  "Not sure yet",
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { email, password } = useLocalSearchParams<{ email: string; password: string }>();
  const { signup } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [genderIdentity, setGenderIdentity] = useState("");
  const [orientation, setOrientation] = useState("");
  const [relationshipIntent, setRelationshipIntent] = useState("");

  const steps = ["About you", "Your identity", "What you're looking for"];
  const totalSteps = steps.length;

  const handleNext = async () => {
    if (step === 0) {
      if (!displayName || !dateOfBirth) {
        Alert.alert("Missing info", "Please fill in all fields");
        return;
      }
    }
    if (step === 1) {
      if (!genderIdentity || !orientation) {
        Alert.alert("Missing info", "Please select your identity");
        return;
      }
    }
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      if (!relationshipIntent) {
        Alert.alert("Missing info", "Please select what you're looking for");
        return;
      }
      setLoading(true);
      try {
        await signup({
          email,
          password,
          displayName,
          dateOfBirth,
          genderIdentity,
          orientation,
          relationshipIntent,
        });
        router.replace("/(tabs)");
      } catch (err: any) {
        Alert.alert("Signup failed", err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        {step > 0 && (
          <Pressable onPress={() => setStep(step - 1)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </Pressable>
        )}
        <View style={{ flex: 1 }} />
        <Text style={styles.stepText}>{step + 1} of {totalSteps}</Text>
      </View>

      {/* Progress */}
      <View style={styles.progress}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <View
            key={i}
            style={[styles.progressBar, i <= step && styles.progressBarActive]}
          />
        ))}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 0 && (
          <>
            <Text style={styles.stepTitle}>Nice to meet you</Text>
            <Text style={styles.stepSubtitle}>Tell us a little about yourself</Text>

            <View style={styles.inputs}>
              <View style={styles.field}>
                <Text style={styles.label}>Display name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your first name"
                  placeholderTextColor="#6B7280"
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Date of birth</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#6B7280"
                  value={dateOfBirth}
                  onChangeText={setDateOfBirth}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </>
        )}

        {step === 1 && (
          <>
            <Text style={styles.stepTitle}>Your identity</Text>
            <Text style={styles.stepSubtitle}>This helps us find the right people for you</Text>

            <View style={styles.section}>
              <Text style={styles.label}>I am</Text>
              <View style={styles.chips}>
                {GENDER_OPTIONS.map((g) => (
                  <Pressable
                    key={g}
                    style={[styles.chip, genderIdentity === g && styles.chipActive]}
                    onPress={() => setGenderIdentity(g)}
                  >
                    <Text style={[styles.chipText, genderIdentity === g && styles.chipTextActive]}>
                      {g}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>I'm interested in</Text>
              <View style={styles.chips}>
                {ORIENTATION_OPTIONS.map((o) => (
                  <Pressable
                    key={o}
                    style={[styles.chip, orientation === o && styles.chipActive]}
                    onPress={() => setOrientation(o)}
                  >
                    <Text style={[styles.chipText, orientation === o && styles.chipTextActive]}>
                      {o}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.stepTitle}>What are you looking for?</Text>
            <Text style={styles.stepSubtitle}>Being upfront helps everyone find their right fit</Text>

            <View style={styles.intentOptions}>
              {INTENT_OPTIONS.map((intent) => (
                <Pressable
                  key={intent}
                  style={[styles.intentCard, relationshipIntent === intent && styles.intentCardActive]}
                  onPress={() => setRelationshipIntent(intent)}
                >
                  <Text style={[styles.intentText, relationshipIntent === intent && styles.intentTextActive]}>
                    {intent}
                  </Text>
                  {relationshipIntent === intent && (
                    <Ionicons name="checkmark-circle" size={22} color="#FF4D6A" />
                  )}
                </Pressable>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* CTA */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          style={[styles.primaryBtn, loading && styles.btnDisabled]}
          onPress={handleNext}
          disabled={loading}
        >
          <LinearGradient colors={["#FF4D6A", "#FF7A60"]} style={styles.gradientBtn}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {step < totalSteps - 1 ? "Continue" : "Create my profile"}
              </Text>
            )}
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0D0D",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#6B7280",
  },
  progress: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 6,
    marginBottom: 32,
  },
  progressBar: {
    flex: 1,
    height: 3,
    backgroundColor: "#2A2A2A",
    borderRadius: 2,
  },
  progressBarActive: {
    backgroundColor: "#FF4D6A",
  },
  content: {
    paddingHorizontal: 24,
    gap: 24,
  },
  stepTitle: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  stepSubtitle: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#9CA3AF",
    marginTop: 4,
  },
  inputs: {
    gap: 16,
    marginTop: 8,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: "#1E1E1E",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    paddingHorizontal: 16,
    height: 54,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#FFFFFF",
  },
  section: {
    gap: 12,
    marginTop: 8,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 100,
    backgroundColor: "#1E1E1E",
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  chipActive: {
    backgroundColor: "#3D1219",
    borderColor: "#FF4D6A",
  },
  chipText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "#9CA3AF",
  },
  chipTextActive: {
    color: "#FF7A92",
  },
  intentOptions: {
    gap: 12,
    marginTop: 8,
  },
  intentCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1E1E1E",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  intentCardActive: {
    backgroundColor: "#1A0A0D",
    borderColor: "#FF4D6A",
  },
  intentText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: "#9CA3AF",
  },
  intentTextActive: {
    color: "#FFFFFF",
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#1E1E1E",
    backgroundColor: "#0D0D0D",
  },
  primaryBtn: {
    borderRadius: 14,
    overflow: "hidden",
  },
  btnDisabled: {
    opacity: 0.6,
  },
  gradientBtn: {
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryBtnText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
});
