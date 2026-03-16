import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  label: "high" | "moderate" | "low";
  displayText: string;
  size?: "sm" | "md";
};

const colors = {
  high: { bg: "#D1FAE5", text: "#065F46", icon: "trending-up" as const },
  moderate: { bg: "#FEF3C7", text: "#92400E", icon: "remove" as const },
  low: { bg: "#FEE2E2", text: "#991B1B", icon: "trending-down" as const },
};

export function LikelihoodBadge({ label, displayText, size = "md" }: Props) {
  const c = colors[label];
  const isSmall = size === "sm";
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }, isSmall && styles.small]}>
      <Ionicons name={c.icon} size={isSmall ? 10 : 12} color={c.text} />
      <Text style={[styles.text, { color: c.text }, isSmall && styles.smallText]}>
        {isSmall ? label.charAt(0).toUpperCase() + label.slice(1) : displayText}
      </Text>
    </View>
  );
}

type FreshnessBadgeProps = {
  label: string;
};

export function FreshnessBadge({ label }: FreshnessBadgeProps) {
  const labelMap: Record<string, { text: string; bg: string; color: string }> = {
    active_today: { text: "Active today", bg: "#D1FAE5", color: "#065F46" },
    updated_this_week: { text: "Updated this week", bg: "#DBEAFE", color: "#1E40AF" },
    recent_media_this_month: { text: "New photos", bg: "#EDE9FE", color: "#5B21B6" },
  };
  const info = labelMap[label] || { text: "Recently active", bg: "#F3F4F6", color: "#6B7280" };
  return (
    <View style={[styles.badge, { backgroundColor: info.bg }]}>
      <Ionicons name="radio-button-on" size={8} color={info.color} />
      <Text style={[styles.text, { color: info.color }]}>{info.text}</Text>
    </View>
  );
}

type VerifiedBadgeProps = {
  status: string;
  size?: number;
};

export function VerifiedBadge({ status, size = 16 }: VerifiedBadgeProps) {
  if (status !== "verified") return null;
  return (
    <View style={styles.verifiedBadge}>
      <Ionicons name="checkmark-circle" size={size} color="#3B82F6" />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
  },
  small: {
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  text: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  smallText: {
    fontSize: 10,
  },
  verifiedBadge: {
    // just the icon inline
  },
});
