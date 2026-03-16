import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { LikelihoodBadge, FreshnessBadge } from "@/components/ui/Badge";

type Like = {
  likeId: string;
  senderUserId: string;
  senderProfile: any;
  message?: string;
  state: string;
  createdAt: string;
  likelihoodLabel?: { label: "high" | "moderate" | "low"; displayText: string };
};

function LikeCard({ like, onLike, onPass }: { like: Like; onLike: () => void; onPass: () => void }) {
  const profile = like.senderProfile;
  const primaryPhoto = profile?.photos?.find((p: any) => p.isPrimary) || profile?.photos?.[0];

  return (
    <View style={styles.likeCard}>
      <View style={styles.likeAvatar}>
        {primaryPhoto?.url ? (
          <Image source={{ uri: primaryPhoto.url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={28} color="#D1D5DB" />
          </View>
        )}
        {profile?.verificationStatus === "verified" && (
          <View style={styles.verifiedDot}>
            <Ionicons name="checkmark-circle" size={18} color="#3B82F6" />
          </View>
        )}
      </View>

      <View style={styles.likeInfo}>
        <View style={styles.likeHeader}>
          <Text style={styles.likeName}>{profile?.displayName || "Someone"}</Text>
          {profile?.age && <Text style={styles.likeAge}>{profile.age}</Text>}
        </View>

        {profile?.locationCity && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={12} color="#9CA3AF" />
            <Text style={styles.locationText}>{profile.locationCity}</Text>
            {profile.distanceKm && <Text style={styles.locationText}>· {profile.distanceKm}km</Text>}
          </View>
        )}

        {profile?.freshnessLabel && <FreshnessBadge label={profile.freshnessLabel} />}

        {like.message && (
          <Text style={styles.message} numberOfLines={2}>"{like.message}"</Text>
        )}

        {like.likelihoodLabel && (
          <LikelihoodBadge label={like.likelihoodLabel.label} displayText={like.likelihoodLabel.displayText} size="sm" />
        )}
      </View>

      <View style={styles.likeActions}>
        <Pressable style={styles.passBtn} onPress={onPass}>
          <Ionicons name="close" size={20} color="#9CA3AF" />
        </Pressable>
        <Pressable style={styles.likeBackBtn} onPress={onLike}>
          <Ionicons name="heart" size={20} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}

export default function LikesScreen() {
  const insets = useSafeAreaInsets();
  const { token, apiUrl } = useAuth();
  const queryClient = useQueryClient();
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["incoming-likes"],
    queryFn: async () => {
      const res = await fetch(`${apiUrl}/likes`, { headers });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{
        tray: Like[];
        backlogCount: number;
        trayCount: number;
        queueStatus: string;
      }>;
    },
    enabled: !!token,
  });

  const likeMutation = useMutation({
    mutationFn: async (senderUserId: string) => {
      const res = await fetch(`${apiUrl}/likes`, {
        method: "POST",
        headers,
        body: JSON.stringify({ receiverUserId: senderUserId, targetType: "profile" }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["incoming-likes"] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      if (data.isMatch) {
        router.push(`/chat/${data.match?.matchId}`);
      }
    },
  });

  const passLike = useCallback(async (likeId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await fetch(`${apiUrl}/likes/${likeId}/withdraw`, { method: "POST", headers });
    queryClient.invalidateQueries({ queryKey: ["incoming-likes"] });
  }, []);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 84 : 0;

  const tray = data?.tray || [];

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Likes</Text>
        <View style={styles.headerRight}>
          {data?.trayCount != null && data.trayCount > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{data.trayCount}</Text>
            </View>
          )}
          {data?.queueStatus === "busy" && (
            <View style={styles.busyBadge}>
              <Ionicons name="alert-circle-outline" size={12} color="#F59E0B" />
              <Text style={styles.busyText}>Queue busy</Text>
            </View>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF4D6A" />
        </View>
      ) : tray.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="heart-outline" size={40} color="#FF4D6A" />
          </View>
          <Text style={styles.emptyTitle}>No likes yet</Text>
          <Text style={styles.emptyText}>
            When someone likes you, they'll appear here for you to review.
          </Text>
        </View>
      ) : (
        <FlatList
          data={tray}
          keyExtractor={item => item.likeId}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPadding + 16 }]}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isLoading}
          renderItem={({ item }) => (
            <LikeCard
              like={item}
              onLike={() => likeMutation.mutate(item.senderUserId)}
              onPass={() => passLike(item.likeId)}
            />
          )}
        />
      )}
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
    gap: 8,
  },
  countBadge: {
    backgroundColor: "#FF4D6A",
    borderRadius: 100,
    minWidth: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  countText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  busyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  busyText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#92400E",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFE5EA",
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
  list: {
    padding: 16,
    gap: 12,
  },
  likeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 10,
  },
  likeAvatar: {
    position: "relative",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarPlaceholder: {
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  verifiedDot: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
  },
  likeInfo: {
    flex: 1,
    gap: 5,
  },
  likeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  likeName: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: "#0D0D0D",
  },
  likeAge: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#6B7280",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#9CA3AF",
  },
  message: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#6B7280",
    fontStyle: "italic",
    lineHeight: 18,
  },
  likeActions: {
    gap: 10,
    alignItems: "center",
  },
  passBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  likeBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FF4D6A",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF4D6A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
});
