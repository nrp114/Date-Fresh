import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Alert,
  ScrollView,
  Platform,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { ProfileCard } from "@/components/ui/ProfileCard";

type LikelihoodLabel = {
  label: "high" | "moderate" | "low";
  displayText: string;
  reasons?: string[];
};

type Candidate = {
  profile: any;
  likelihoodLabel: LikelihoodLabel;
  explanationReasons?: string[];
};

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const { token, apiUrl } = useAuth();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [quotaRemaining, setQuotaRemaining] = useState<number | null>(null);

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["discovery"],
    queryFn: async () => {
      const res = await fetch(`${apiUrl}/discovery/batch`, { headers });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json() as Promise<{ candidates: Candidate[]; totalRemaining: number }>;
    },
    enabled: !!token,
  });

  const likeMutation = useMutation({
    mutationFn: async (receiverUserId: string) => {
      const res = await fetch(`${apiUrl}/likes`, {
        method: "POST",
        headers,
        body: JSON.stringify({ receiverUserId, targetType: "profile" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to like");
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.quotaRemaining !== undefined) setQuotaRemaining(data.quotaRemaining);
      if (data.isMatch) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          "It's a match!",
          `You and ${data.match?.otherUser?.displayName} liked each other. Send an intro to unlock chat!`,
          [
            { text: "Later", style: "cancel" },
            {
              text: "Send intro",
              onPress: () => router.push(`/chat/${data.match?.matchId}`),
            },
          ]
        );
        queryClient.invalidateQueries({ queryKey: ["matches"] });
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      setCurrentIndex(i => i + 1);
    },
    onError: (err: Error) => {
      if (err.message.includes("quota")) {
        Alert.alert("Daily limit reached", "You've used all your likes for today. Upgrade to Premium for more.");
      } else {
        Alert.alert("Error", err.message);
      }
    },
  });

  const handleLike = useCallback(() => {
    const candidate = data?.candidates[currentIndex];
    if (!candidate) return;
    likeMutation.mutate(candidate.profile.userId);
  }, [data, currentIndex]);

  const handlePass = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentIndex(i => i + 1);
  }, []);

  const handleReport = useCallback(() => {
    const candidate = data?.candidates[currentIndex];
    if (!candidate) return;
    Alert.alert("Report or block", "What would you like to do?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Block",
        style: "destructive",
        onPress: async () => {
          await fetch(`${apiUrl}/users/${candidate.profile.userId}/block`, {
            method: "POST", headers,
          });
          setCurrentIndex(i => i + 1);
        },
      },
      {
        text: "Report",
        style: "destructive",
        onPress: () => {
          Alert.alert("Report reason", "Select a reason", [
            { text: "Fake profile", onPress: () => submitReport(candidate.profile.userId, "fake_profile") },
            { text: "Inappropriate content", onPress: () => submitReport(candidate.profile.userId, "inappropriate_content") },
            { text: "Spam", onPress: () => submitReport(candidate.profile.userId, "spam_scam") },
            { text: "Cancel", style: "cancel" },
          ]);
        },
      },
    ]);
  }, [data, currentIndex]);

  const submitReport = async (userId: string, category: string) => {
    await fetch(`${apiUrl}/users/${userId}/report`, {
      method: "POST",
      headers,
      body: JSON.stringify({ category }),
    });
    setCurrentIndex(i => i + 1);
  };

  const candidates = data?.candidates || [];
  const candidate = candidates[currentIndex];
  const hasMore = currentIndex < candidates.length;

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 84 : 0;

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover</Text>
        <View style={styles.headerRight}>
          {quotaRemaining !== null && (
            <View style={styles.quotaBadge}>
              <Ionicons name="heart" size={12} color="#FF4D6A" />
              <Text style={styles.quotaText}>{quotaRemaining} left</Text>
            </View>
          )}
          <Pressable style={styles.filterBtn}>
            <Ionicons name="options-outline" size={22} color="#9CA3AF" />
          </Pressable>
        </View>
      </View>

      {/* Content */}
      <View style={[styles.content, { paddingBottom: bottomPadding }]}>
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#FF4D6A" />
          </View>
        ) : !hasMore ? (
          <View style={styles.center}>
            <LinearGradient colors={["#FF4D6A", "#FF8C69"]} style={styles.emptyIcon}>
              <Ionicons name="flame" size={40} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.emptyTitle}>All caught up</Text>
            <Text style={styles.emptyText}>
              No more profiles right now. Check back soon or update your preferences.
            </Text>
            <Pressable style={styles.refreshBtn} onPress={() => { setCurrentIndex(0); refetch(); }}>
              <Ionicons name="refresh" size={18} color="#FF4D6A" />
              <Text style={styles.refreshBtnText}>Refresh</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.cardContainer}>
            <ProfileCard
              profile={candidate.profile}
              likelihoodLabel={candidate.likelihoodLabel}
              onLike={handleLike}
              onPass={handlePass}
              onReport={handleReport}
              showActions={!likeMutation.isPending}
            />
            {likeMutation.isPending && (
              <View style={styles.sendingOverlay}>
                <ActivityIndicator color="#FF4D6A" />
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
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
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  quotaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFE5EA",
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  quotaText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#FF4D6A",
  },
  filterBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#0D0D0D",
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFE5EA",
    borderRadius: 100,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 8,
  },
  refreshBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#FF4D6A",
  },
  cardContainer: {
    position: "relative",
  },
  sendingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.5)",
    borderRadius: 20,
  },
});
