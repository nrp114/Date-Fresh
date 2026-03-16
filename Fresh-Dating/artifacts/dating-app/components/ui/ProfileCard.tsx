import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  Pressable,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { LikelihoodBadge, FreshnessBadge, VerifiedBadge } from "./Badge";
import type { UserProfile } from "@/context/AuthContext";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const CARD_W = SCREEN_W - 24;
const CARD_H = SCREEN_H * 0.68;

type LikelihoodLabel = {
  label: "high" | "moderate" | "low";
  displayText: string;
  reasons?: string[];
};

type Props = {
  profile: UserProfile;
  likelihoodLabel?: LikelihoodLabel;
  onLike?: () => void;
  onPass?: () => void;
  onReport?: () => void;
  showActions?: boolean;
};

export function ProfileCard({
  profile,
  likelihoodLabel,
  onLike,
  onPass,
  onReport,
  showActions = true,
}: Props) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const photos = profile.photos.length > 0
    ? profile.photos
    : [{ photoId: "placeholder", url: "", isPrimary: true }];
  const currentPhoto = photos[photoIndex];

  const handleTap = (side: "left" | "right") => {
    if (side === "left") {
      setPhotoIndex(Math.max(0, photoIndex - 1));
    } else {
      setPhotoIndex(Math.min(photos.length - 1, photoIndex + 1));
    }
  };

  return (
    <View style={styles.card}>
      {/* Photo */}
      <View style={styles.photoContainer}>
        {currentPhoto.url ? (
          <Image source={{ uri: currentPhoto.url }} style={styles.photo} resizeMode="cover" />
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]}>
            <Ionicons name="person" size={80} color="#D1D5DB" />
          </View>
        )}

        {/* Photo tap zones */}
        <View style={styles.tapZones}>
          <Pressable style={styles.tapZoneLeft} onPress={() => handleTap("left")} />
          <Pressable style={styles.tapZoneRight} onPress={() => handleTap("right")} />
        </View>

        {/* Photo dots */}
        {photos.length > 1 && (
          <View style={styles.photoDots}>
            {photos.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === photoIndex && styles.dotActive]}
              />
            ))}
          </View>
        )}

        {/* Gradient overlay */}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.85)"]}
          style={styles.gradient}
          pointerEvents="none"
        />

        {/* Info overlay */}
        <View style={styles.infoOverlay} pointerEvents="none">
          <View style={styles.nameRow}>
            <Text style={styles.name}>{profile.displayName}</Text>
            {profile.age && <Text style={styles.age}>{profile.age}</Text>}
            <VerifiedBadge status={profile.verificationStatus} size={20} />
          </View>

          {profile.locationCity && (
            <View style={styles.location}>
              <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.locationText}>
                {profile.locationCity}
                {profile.distanceKm ? ` · ${profile.distanceKm} km away` : ""}
              </Text>
            </View>
          )}

          {profile.relationshipIntent && (
            <Text style={styles.intent}>{profile.relationshipIntent}</Text>
          )}

          <View style={styles.badgeRow}>
            {profile.freshnessLabel && <FreshnessBadge label={profile.freshnessLabel} />}
            {likelihoodLabel && (
              <LikelihoodBadge
                label={likelihoodLabel.label}
                displayText={likelihoodLabel.displayText}
                size="sm"
              />
            )}
          </View>
        </View>
      </View>

      {/* Expandable content */}
      <Pressable onPress={() => setExpanded(!expanded)} style={styles.expandBtn}>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color="#9CA3AF"
        />
      </Pressable>

      {expanded && (
        <ScrollView style={styles.expandedContent} showsVerticalScrollIndicator={false}>
          {profile.bio ? (
            <Text style={styles.bio}>{profile.bio}</Text>
          ) : null}
          {profile.prompts.map((p) => (
            p.contentText ? (
              <View key={p.promptAnswerId} style={styles.promptCard}>
                <Text style={styles.promptQuestion}>{p.promptText}</Text>
                <Text style={styles.promptAnswer}>{p.contentText}</Text>
              </View>
            ) : null
          ))}
          {likelihoodLabel?.reasons && likelihoodLabel.reasons.length > 0 && (
            <View style={styles.reasonsCard}>
              <Ionicons name="information-circle-outline" size={14} color="#6B7280" />
              <Text style={styles.reasonsText}>
                {likelihoodLabel.reasons.join(" · ")}
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Actions */}
      {showActions && (
        <View style={styles.actions}>
          <Pressable
            style={styles.passBtn}
            onPress={onPass}
          >
            <Ionicons name="close" size={28} color="#6B7280" />
          </Pressable>

          <Pressable style={styles.likeBtn} onPress={onLike}>
            <Ionicons name="heart" size={28} color="#FFFFFF" />
          </Pressable>

          <Pressable style={styles.menuBtn} onPress={onReport}>
            <Ionicons name="ellipsis-horizontal" size={22} color="#6B7280" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_W,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  photoContainer: {
    width: "100%",
    height: CARD_H,
    position: "relative",
    backgroundColor: "#F3F4F6",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  photoPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  tapZones: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
  },
  tapZoneLeft: { flex: 1 },
  tapZoneRight: { flex: 1 },
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
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  dotActive: {
    backgroundColor: "#FFFFFF",
  },
  gradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "50%",
  },
  infoOverlay: {
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
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  age: {
    fontSize: 22,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.9)",
  },
  location: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
  },
  intent: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.75)",
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  expandBtn: {
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    backgroundColor: "#FFFFFF",
  },
  expandedContent: {
    maxHeight: 200,
    padding: 16,
    gap: 12,
    backgroundColor: "#FFFFFF",
  },
  bio: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#374151",
    lineHeight: 22,
    marginBottom: 12,
  },
  promptCard: {
    backgroundColor: "#FFF5F7",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#FF4D6A",
  },
  promptQuestion: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#FF4D6A",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  promptAnswer: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#374151",
    lineHeight: 22,
  },
  reasonsCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  reasonsText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#6B7280",
    flex: 1,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  passBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  likeBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#FF4D6A",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF4D6A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  menuBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
});
