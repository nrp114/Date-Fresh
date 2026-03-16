import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  Alert,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { VerifiedBadge } from "@/components/ui/Badge";

function Completeness({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 80 ? "#10B981" : pct >= 50 ? "#F59E0B" : "#FF4D6A";
  return (
    <View style={styles.completeness}>
      <View style={styles.completenessHeader}>
        <Text style={styles.completenessTitle}>Profile strength</Text>
        <Text style={[styles.completenessPct, { color }]}>{pct}%</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      {pct < 80 && (
        <Text style={styles.completenessHint}>
          Add photos, answer prompts, or verify to improve your profile.
        </Text>
      )}
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, token, apiUrl, logout, refreshUser } = useAuth();
  const [editingBio, setEditingBio] = useState(false);
  const [bio, setBio] = useState(user?.bio || "");
  const [savingBio, setSavingBio] = useState(false);

  if (!user) return null;

  const primaryPhoto = user.photos?.find(p => p.isPrimary) || user.photos?.[0];

  const saveBio = async () => {
    setSavingBio(true);
    try {
      await fetch(`${apiUrl}/profile/me`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ bio }),
      });
      await refreshUser();
      setEditingBio(false);
    } catch {
      Alert.alert("Error", "Failed to save bio");
    } finally {
      setSavingBio(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: logout },
    ]);
  };

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 84 : insets.bottom + 16;

  return (
    <ScrollView
      style={[styles.container, { paddingTop: topPadding }]}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <Pressable onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color="#9CA3AF" />
        </Pressable>
      </View>

      {/* Avatar & name */}
      <View style={styles.hero}>
        <View style={styles.avatarWrap}>
          {primaryPhoto?.url ? (
            <Image source={{ uri: primaryPhoto.url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={50} color="#D1D5DB" />
            </View>
          )}
          <LinearGradient
            colors={["#FF4D6A", "#FF8C69"]}
            style={styles.addPhotoBtn}
          >
            <Ionicons name="camera" size={16} color="#FFFFFF" />
          </LinearGradient>
        </View>

        <View style={styles.nameRow}>
          <Text style={styles.name}>{user.displayName}</Text>
          {user.age && <Text style={styles.age}>{user.age}</Text>}
          <VerifiedBadge status={user.verificationStatus} size={22} />
        </View>

        {user.verificationStatus !== "verified" && (
          <View style={styles.verifyBanner}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#3B82F6" />
            <Text style={styles.verifyText}>Verify your identity for a badge</Text>
            <Pressable>
              <Text style={styles.verifyLink}>Verify</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Completeness */}
      <Completeness score={user.profileCompletenessScore} />

      {/* Relationship intent */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Looking for</Text>
        <View style={styles.intentPill}>
          <Ionicons name="heart-outline" size={15} color="#FF4D6A" />
          <Text style={styles.intentText}>{user.relationshipIntent}</Text>
        </View>
      </View>

      {/* Bio */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>About me</Text>
          <Pressable onPress={() => setEditingBio(!editingBio)}>
            <Ionicons name={editingBio ? "close" : "pencil"} size={18} color="#9CA3AF" />
          </Pressable>
        </View>
        {editingBio ? (
          <View style={styles.bioEdit}>
            <TextInput
              style={styles.bioInput}
              value={bio}
              onChangeText={setBio}
              multiline
              maxLength={500}
              placeholder="Write something about yourself..."
              placeholderTextColor="#9CA3AF"
              autoFocus
            />
            <Pressable
              style={[styles.saveBioBtn, savingBio && { opacity: 0.6 }]}
              onPress={saveBio}
              disabled={savingBio}
            >
              {savingBio ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveBioText}>Save</Text>
              )}
            </Pressable>
          </View>
        ) : (
          <Text style={styles.bioText}>{user.bio || "Add a bio to let people know who you are."}</Text>
        )}
      </View>

      {/* Prompts */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Prompts</Text>
        {user.prompts.map((p) => (
          <View key={p.promptAnswerId} style={styles.promptCard}>
            <Text style={styles.promptQuestion}>{p.promptText}</Text>
            <Text style={styles.promptAnswer}>
              {p.contentText || "Tap to answer this prompt..."}
            </Text>
          </View>
        ))}
        <Pressable style={styles.addPromptBtn}>
          <Ionicons name="add-circle-outline" size={18} color="#FF4D6A" />
          <Text style={styles.addPromptText}>Add prompt</Text>
        </Pressable>
      </View>

      {/* Now tab items */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Now</Text>
          <View style={styles.nowBadge}>
            <Ionicons name="radio-button-on" size={10} color="#10B981" />
            <Text style={styles.nowBadgeText}>Live</Text>
          </View>
        </View>
        <Text style={styles.nowSubtext}>
          Share what you're up to right now — boosts your freshness score
        </Text>
        {user.nowItems.map((item) => (
          <View key={item.nowItemId} style={styles.nowCard}>
            <Ionicons name="image-outline" size={20} color="#6B7280" />
            <Text style={styles.nowCaption}>{item.caption || item.mediaType}</Text>
          </View>
        ))}
        <Pressable style={styles.addNowBtn}>
          <LinearGradient colors={["#FF4D6A", "#FF8C69"]} style={styles.addNowGradient}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addNowText}>Share a moment</Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* Premium */}
      {user.premiumTier === "free" && (
        <Pressable style={styles.premiumCard}>
          <LinearGradient colors={["#FF4D6A", "#FF8C69"]} style={styles.premiumGradient}>
            <Ionicons name="star" size={24} color="#FFFFFF" />
            <View style={styles.premiumText}>
              <Text style={styles.premiumTitle}>Upgrade to Premium</Text>
              <Text style={styles.premiumSub}>15 likes/day · Advanced filters · Priority visibility</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
          </LinearGradient>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  content: {
    gap: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#0D0D0D",
    letterSpacing: -0.5,
  },
  logoutBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
  },
  hero: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 20,
    gap: 12,
  },
  avatarWrap: {
    position: "relative",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#FF4D6A",
  },
  avatarPlaceholder: {
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotoBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  name: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#0D0D0D",
  },
  age: {
    fontSize: 22,
    fontFamily: "Inter_400Regular",
    color: "#6B7280",
  },
  verifyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  verifyText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#1E40AF",
  },
  verifyLink: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#3B82F6",
    textDecorationLine: "underline",
  },
  completeness: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  completenessHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  completenessTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#0D0D0D",
  },
  completenessPct: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  progressTrack: {
    height: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  completenessHint: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#9CA3AF",
    lineHeight: 18,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: "#0D0D0D",
  },
  intentPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFE5EA",
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  intentText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#FF4D6A",
  },
  bioText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#374151",
    lineHeight: 22,
  },
  bioEdit: {
    gap: 10,
  },
  bioInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#0D0D0D",
    minHeight: 100,
    textAlignVertical: "top",
  },
  saveBioBtn: {
    backgroundColor: "#FF4D6A",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveBioText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  promptCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: "#FF4D6A",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  promptQuestion: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#FF4D6A",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  promptAnswer: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#374151",
    lineHeight: 22,
  },
  addPromptBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
  },
  addPromptText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "#FF4D6A",
  },
  nowBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#D1FAE5",
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  nowBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#065F46",
  },
  nowSubtext: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#9CA3AF",
    lineHeight: 18,
  },
  nowCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
  },
  nowCaption: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#374151",
  },
  addNowBtn: {
    borderRadius: 12,
    overflow: "hidden",
  },
  addNowGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  addNowText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  premiumCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#FF4D6A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  premiumGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    gap: 14,
  },
  premiumText: {
    flex: 1,
    gap: 3,
  },
  premiumTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  premiumSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
  },
});
