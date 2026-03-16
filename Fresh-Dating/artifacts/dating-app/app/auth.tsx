import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing fields", "Please enter your email and password");
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      router.replace("/(tabs)");
    } catch (err: any) {
      Alert.alert("Login failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignupNext = () => {
    if (!email || !password) {
      Alert.alert("Missing fields", "Please enter your email and password");
      return;
    }
    router.push({ pathname: "/onboarding", params: { email, password } });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: "#0D0D0D" }}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero */}
        <View style={[styles.hero, { paddingTop: insets.top + 60 }]}>
          <LinearGradient
            colors={["#FF4D6A", "#FF8C69"]}
            style={styles.logo}
          >
            <Ionicons name="heart" size={32} color="#FFFFFF" />
          </LinearGradient>
          <Text style={styles.appName}>Trust</Text>
          <Text style={styles.tagline}>Real connections, real people.</Text>
        </View>

        {/* Form */}
        <View style={[styles.form, { paddingBottom: insets.bottom + 24 }]}>
          {/* Tabs */}
          <View style={styles.tabs}>
            <Pressable
              style={[styles.tab, mode === "login" && styles.tabActive]}
              onPress={() => setMode("login")}
            >
              <Text style={[styles.tabText, mode === "login" && styles.tabTextActive]}>
                Sign in
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, mode === "signup" && styles.tabActive]}
              onPress={() => setMode("signup")}
            >
              <Text style={[styles.tabText, mode === "signup" && styles.tabTextActive]}>
                Create account
              </Text>
            </Pressable>
          </View>

          <View style={styles.inputs}>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#6B7280"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#6B7280"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
              />
            </View>
          </View>

          <Pressable
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            onPress={mode === "login" ? handleLogin : handleSignupNext}
            disabled={loading}
          >
            <LinearGradient colors={["#FF4D6A", "#FF7A60"]} style={styles.gradientBtn}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {mode === "login" ? "Sign in" : "Continue"}
                </Text>
              )}
            </LinearGradient>
          </Pressable>

          <Text style={styles.disclaimer}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  appName: {
    fontSize: 42,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#9CA3AF",
    textAlign: "center",
  },
  form: {
    flex: 1,
    backgroundColor: "#141414",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    gap: 20,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#1E1E1E",
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 9,
  },
  tabActive: {
    backgroundColor: "#2A2A2A",
  },
  tabText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "#6B7280",
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  inputs: {
    gap: 12,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E1E1E",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    paddingHorizontal: 14,
    height: 54,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#FFFFFF",
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
  disclaimer: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
  },
});
