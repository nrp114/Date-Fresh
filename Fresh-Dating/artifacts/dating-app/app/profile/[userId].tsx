import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import { LikelihoodBadge, FreshnessBadge, VerifiedBadge } from "@/components/ui/Badge";

export default function ProfileDetailScreen() {
  const insets = useSafeAreaInsets();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { token, user: me, apiUrl } = useAuth();
  const queryClient = useQueryClient();
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const [photoIndex, setPhotoIndex] = useState(0);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const res = await fetch(`${apiUrl}/profiles/${userId}`, { headers });
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!token && !!userId,
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${apiUrl}/likes`, {
        method: "POST",
        headers,
        body: JSON.stringify({ receiverUserId: userId, targetType: "profile" }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      if (data.isMatch) {
        Alert.alert("It's a match!", `You matched with ${profile?.displayName}!`, [
          { text: "Send intro", onPress: () => router.push(`/chat/${data.match?.matchId}`) },
          { text: "Later", style: "cancel" },
        ]);
      } else {
        router.back();
      }
    },
    onError: (err: Error) => Alert.alert("Error", err.message),
  });

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (isLoading) {
    return (
      <View style={[styles.center, { paddingTop: topPad }]}>
        <ActivityIndicator size="large" color="#FF4D6A" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.center, { paddingTop: topPad }]}>
        <Text style={styles.errorText}>Profile not found</Text>
      </View>
    );
  }

  const photos = profile.photos || [];
  const currentPhoto = photos[photoIndex];
  const isMe = profile.userId === me?.userId;

  return (
    <View style={[styles.container]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Photo */}
        <View style={[styles.photoContainer, { paddingTop: topPad }]}>
          {currentPhoto?.url ? (
            <Image source={{ uri: currentPhoto.url }} style={styles.photo} resizeMode="cover" />
          ) : (
            <View style={[styles.photo, styles.photoPlaceholder]}>
              <Ionicons name="person" size={80} color="#D1D5DB" />
            </View>
          )}
          <LinearGradient
            colors={["rgba(0,0,0,0.5)", "transparent", "rgba(0,0,0,0.8)"]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          {/* Back button */}
          <Pressable style={[styles.backBtn, { top: topPad + 8 }]} onPress={() => router.back()}>
            <View style={styles.backBtnInner}>
              <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
            </View>
          </Pressable>

          {/* Info */}
          <View style={styles.photoInfo} pointerEvents="none">
            <View style={styles.nameRow}>
              <Text style={styles.name}>{profile.displayName}</Text>
              {profile.age && <Text style={styles.age}>{profile.age}</Text>}
              <VerifiedBadge status={profile.verificationStatus} size={20} />
            </View>
            {profile.locationCity && (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.8)" />
                <Text style={styles.locationText}>
                  {profile.locationCity}
                  {profile.distanceKm ? ` · ${profile.distanceKm} km` : ""}
                </Text>
              </View>
            )}
            <View style={styles.badgeRow}>
              {profile.freshnessLabel && <FreshnessBadge label={profile.freshnessLabel} />}
            </View>
          </View>

          {/* Photo dots */}
          {photos.length > 1 && (
            <View style={styles.photoDots} pointerEvents="none">
              {photos.map((_: any, i: number) => (
                <Pressable
                  key={i}
                  style={[styles.dot, i === photoIndex && styles.dotActive]}
                  onPress={() => setPhotoIndex(i)}
                />
              ))}
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.intentRow}>
            <Ionicons name="heart-outline" size={15} color="#FF4D6A" />
            <Text style={styles.intentText}>{profile.relationshipIntent}</Text>
          </View>

          {profile.bio ? (
            <View style={styles.section}>
              <Text style={styles.bioText}>{profile.bio}</Text>
            </View>
          ) : null}

          {profile.prompts?.filter((p: any) => p.contentText).map((p: any) => (
            <View key={p.promptAnswerId} style={styles.promptCard}>
              <Text style={styles.promptQuestion}>{p.promptText}</Text>
              <Text style={styles.promptAnswer}>{p.contentText}</Text>
            </View>
          ))}

          {profile.nowItems?.length > 0 && (
            <View style={styles.nowSection}>
              <View style={styles.nowHeader}>
                <Ionicons name="radio-button-on" size={12} color="#10B981" />
                <Text style={styles.nowHeaderText}>Now</Text>
              </View>
              {profile.nowItems.map((item: any) => (
                <View key={item.nowItemId} style={styles.nowCard}>
                  <Ionicons name="image-outline" size={20} color="#6B7280" />
                  <Text style={styles.nowCaption}>{item.caption || item.mediaType}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.spacer} />
        </View>
      </ScrollView>

      {/* Actions */}
      {!isMe && (
        <View style={[styles.actions, { paddingBottom: bottomPad + 16 }]}>
          <Pressable
            style={styles.passBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="close" size={26} color="#6B7280" />
          </Pressable>

          <Pressable
            style={[styles.likeBtn, likeMutation.isPending && { opacity: 0.6 }]}
            onPress={() => likeMutation.mutate()}
            disabled={likeMutation.isPending}
          >
            <LinearGradient colors={["#FF4D6A", "#FF7A60"]} style={styles.likeBtnGradient}>
              {likeMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="heart" size={22} color="#FFFFFF" />
                  <Text style={styles.likeBtnText}>Like</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#6B7280",
  },
  photoContainer: {
    height: 480,
    position: "relative",
    backgroundColor: "#F3F4F6",
  },
  photo: {
    ...StyleSheet.absoluteFillObject,
  },
  photoPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  backBtn: {
    position: "absolute",
    left: 16,
    zIndex: 10,
  },
  backBtnInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoInfo: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    gap: 6,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  name: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  age: {
    fontSize: 24,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.9)",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  photoDots: {
    position: "absolute",
    top: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
  },
  dot: {
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  dotActive: {
    backgroundColor: "#FFFFFF",
  },
  content: {
    padding: 20,
    gap: 16,
  },
  intentRow: {
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
  section: {},
  bioText: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#374151",
    lineHeight: 24,
  },
  promptCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: "#FF4D6A",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  promptQuestion: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#FF4D6A",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  promptAnswer: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#374151",
    lineHeight: 24,
  },
  nowSection: {
    gap: 10,
  },
  nowHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  nowHeaderText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#10B981",
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
  spacer: {
    height: 80,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  passBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  likeBtn: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#FF4D6A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  likeBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  likeBtnText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
});
