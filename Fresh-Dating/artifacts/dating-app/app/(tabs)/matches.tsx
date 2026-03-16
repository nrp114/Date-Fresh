import React from "react";
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
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "@/context/AuthContext";

type MatchSummary = {
  matchId: string;
  otherUser: any;
  state: string;
  introState: string;
  chatUnlockedAt?: string;
  lastMessage?: { text: string; createdAt: string };
  createdAt: string;
};

const introStateInfo: Record<string, { label: string; color: string; icon: string }> = {
  none: { label: "Send an intro", color: "#FF4D6A", icon: "mic" },
  pending_mine: { label: "Awaiting their intro", color: "#F59E0B", icon: "time-outline" },
  pending_theirs: { label: "They need to reply", color: "#3B82F6", icon: "arrow-forward" },
  both_sent: { label: "Chat unlocking...", color: "#10B981", icon: "lock-open" },
  unlocked: { label: "Chat unlocked", color: "#10B981", icon: "chatbubble" },
};

function MatchCard({ match }: { match: MatchSummary }) {
  const profile = match.otherUser;
  const primaryPhoto = profile?.photos?.find((p: any) => p.isPrimary) || profile?.photos?.[0];
  const info = introStateInfo[match.introState] || introStateInfo.none;
  const isUnlocked = match.introState === "unlocked";
  const timeAgo = getTimeAgo(match.createdAt);

  return (
    <Pressable
      style={styles.matchCard}
      onPress={() => router.push(`/chat/${match.matchId}`)}
    >
      <View style={styles.matchAvatarWrap}>
        {primaryPhoto?.url ? (
          <Image source={{ uri: primaryPhoto.url }} style={styles.matchAvatar} />
        ) : (
          <View style={[styles.matchAvatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={28} color="#D1D5DB" />
          </View>
        )}
        {profile?.verificationStatus === "verified" && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#3B82F6" />
          </View>
        )}
      </View>

      <View style={styles.matchContent}>
        <View style={styles.matchTop}>
          <Text style={styles.matchName}>{profile?.displayName || "Match"}</Text>
          <Text style={styles.matchTime}>{timeAgo}</Text>
        </View>

        {isUnlocked && match.lastMessage ? (
          <Text style={styles.lastMessage} numberOfLines={1}>
            {match.lastMessage.text}
          </Text>
        ) : (
          <View style={styles.introRow}>
            <Ionicons name={info.icon as any} size={14} color={info.color} />
            <Text style={[styles.introLabel, { color: info.color }]}>{info.label}</Text>
          </View>
        )}
      </View>

      <View style={styles.matchRight}>
        {isUnlocked ? (
          <Ionicons name="chatbubble-ellipses" size={20} color="#FF4D6A" />
        ) : (
          <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
        )}
      </View>
    </Pressable>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function MatchesScreen() {
  const insets = useSafeAreaInsets();
  const { token, apiUrl } = useAuth();
  const headers = { Authorization: `Bearer ${token}` };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const res = await fetch(`${apiUrl}/matches`, { headers });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ matches: MatchSummary[] }>;
    },
    enabled: !!token,
  });

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 84 : 0;

  const matches = data?.matches || [];

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Matches</Text>
        {matches.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{matches.length}</Text>
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF4D6A" />
        </View>
      ) : matches.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="heart-circle-outline" size={44} color="#FF4D6A" />
          </View>
          <Text style={styles.emptyTitle}>No matches yet</Text>
          <Text style={styles.emptyText}>
            When you and someone like each other, you'll see your match here.
          </Text>
          <Pressable
            style={styles.discoverBtn}
            onPress={() => router.push("/(tabs)")}
          >
            <Ionicons name="flame" size={16} color="#FFFFFF" />
            <Text style={styles.discoverBtnText}>Go discover</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={item => item.matchId}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPadding + 16 }]}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isLoading}
          renderItem={({ item }) => <MatchCard match={item} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
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
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#0D0D0D",
    letterSpacing: -0.5,
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
  discoverBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FF4D6A",
    borderRadius: 100,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 8,
  },
  discoverBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  matchCard: {
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
  },
  matchAvatarWrap: {
    position: "relative",
  },
  matchAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  verifiedBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
  },
  matchContent: {
    flex: 1,
    gap: 5,
  },
  matchTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  matchName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#0D0D0D",
  },
  matchTime: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#9CA3AF",
  },
  lastMessage: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#6B7280",
  },
  introRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  introLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  matchRight: {
    paddingLeft: 4,
  },
  separator: {
    height: 10,
  },
});
