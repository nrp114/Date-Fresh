import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";

type Message = {
  messageId: string;
  matchId: string;
  senderUserId: string;
  text: string;
  createdAt: string;
  readAt?: string;
};

type IntroArtifact = {
  introId: string;
  matchId: string;
  senderUserId: string;
  artifactType: "text" | "audio" | "video";
  text?: string;
  durationSeconds?: number;
  createdAt: string;
};

type MatchDetail = {
  matchId: string;
  otherUser: any;
  state: string;
  introState: string;
  chatUnlockedAt?: string;
  intros: IntroArtifact[];
  createdAt: string;
};

function MessageBubble({ msg, isMe }: { msg: Message; isMe: boolean }) {
  const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <View style={[styles.bubbleWrap, isMe && styles.bubbleWrapMe]}>
      <View style={[styles.bubble, isMe && styles.bubbleMe]}>
        <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{msg.text}</Text>
      </View>
      <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>{time}</Text>
    </View>
  );
}

function IntroCard({
  intro,
  isMe,
  otherUserName,
}: { intro: IntroArtifact; isMe: boolean; otherUserName: string }) {
  return (
    <View style={[styles.introCard, isMe && styles.introCardMe]}>
      <View style={styles.introIconWrap}>
        <LinearGradient colors={["#FF4D6A", "#FF8C69"]} style={styles.introIcon}>
          <Ionicons
            name={intro.artifactType === "text" ? "chatbubble" : intro.artifactType === "audio" ? "mic" : "videocam"}
            size={18}
            color="#FFFFFF"
          />
        </LinearGradient>
      </View>
      <View style={styles.introContent}>
        <Text style={styles.introLabel}>
          {isMe ? "Your" : `${otherUserName}'s`} intro
          {intro.durationSeconds ? ` · ${intro.durationSeconds}s` : ""}
        </Text>
        {intro.text ? (
          <Text style={styles.introText}>{intro.text}</Text>
        ) : (
          <Text style={styles.introTextPlaceholder}>{intro.artifactType} intro</Text>
        )}
      </View>
    </View>
  );
}

function IntroComposer({
  matchId,
  onSend,
  sending,
}: { matchId: string; onSend: (type: "text", text: string) => void; sending: boolean }) {
  const [text, setText] = useState("");

  return (
    <View style={styles.introComposer}>
      <Text style={styles.introComposerTitle}>Send your intro</Text>
      <Text style={styles.introComposerSub}>
        Introduce yourself — keep it short and genuine!
      </Text>
      <TextInput
        style={styles.introInput}
        placeholder="Say something real about yourself..."
        placeholderTextColor="#9CA3AF"
        value={text}
        onChangeText={setText}
        multiline
        maxLength={200}
      />
      <Text style={styles.introCharCount}>{text.length}/200</Text>
      <Pressable
        style={[styles.introSendBtn, (sending || !text.trim()) && { opacity: 0.5 }]}
        onPress={() => onSend("text", text)}
        disabled={sending || !text.trim()}
      >
        <LinearGradient colors={["#FF4D6A", "#FF7A60"]} style={styles.introSendGradient}>
          {sending ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="send" size={16} color="#FFFFFF" />
              <Text style={styles.introSendText}>Send intro</Text>
            </>
          )}
        </LinearGradient>
      </Pressable>
    </View>
  );
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const { token, user, apiUrl } = useAuth();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const listRef = useRef<FlatList>(null);
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const { data: match, isLoading: matchLoading } = useQuery({
    queryKey: ["match", matchId],
    queryFn: async () => {
      const res = await fetch(`${apiUrl}/matches/${matchId}`, { headers });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<MatchDetail>;
    },
    enabled: !!token && !!matchId,
    refetchInterval: 5000,
  });

  const { data: messages = [], isLoading: msgsLoading } = useQuery({
    queryKey: ["messages", matchId],
    queryFn: async () => {
      const res = await fetch(`${apiUrl}/matches/${matchId}/messages`, { headers });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<Message[]>;
    },
    enabled: !!token && !!matchId && match?.introState === "unlocked",
    refetchInterval: 3000,
  });

  const introMutation = useMutation({
    mutationFn: async ({ type, text }: { type: string; text: string }) => {
      const res = await fetch(`${apiUrl}/matches/${matchId}/intro`, {
        method: "POST",
        headers,
        body: JSON.stringify({ artifactType: type, text }),
      });
      if (!res.ok) throw new Error("Failed to send intro");
      return res.json();
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
    onError: (err: Error) => Alert.alert("Error", err.message),
  });

  const msgMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch(`${apiUrl}/matches/${matchId}/messages`, {
        method: "POST",
        headers,
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", matchId] });
      setInput("");
    },
    onError: (err: Error) => Alert.alert("Error", err.message),
  });

  const sendMessage = useCallback(() => {
    if (!input.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    msgMutation.mutate(input.trim());
  }, [input]);

  const isUnlocked = match?.introState === "unlocked";
  const hasSentIntro = match?.intros.some(i => i.senderUserId === user?.userId);
  const otherUser = match?.otherUser;
  const primaryPhoto = otherUser?.photos?.find((p: any) => p.isPrimary) || otherUser?.photos?.[0];

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#0D0D0D" />
        </Pressable>

        <Pressable style={styles.headerProfile} onPress={() => {}}>
          {primaryPhoto?.url ? (
            <Image source={{ uri: primaryPhoto.url }} style={styles.headerAvatar} />
          ) : (
            <View style={[styles.headerAvatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={18} color="#D1D5DB" />
            </View>
          )}
          <View>
            <Text style={styles.headerName}>{otherUser?.displayName || "Match"}</Text>
            {otherUser?.locationCity && (
              <Text style={styles.headerLocation}>{otherUser.locationCity}</Text>
            )}
          </View>
        </Pressable>

        <Pressable style={styles.menuBtn}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#6B7280" />
        </Pressable>
      </View>

      {matchLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#FF4D6A" size="large" />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior="padding"
          keyboardVerticalOffset={topPad + 60}
        >
          {/* Intros section */}
          {match && match.intros.length > 0 && (
            <View style={styles.introsSection}>
              <Text style={styles.introsSectionLabel}>Intros</Text>
              {match.intros.map(intro => (
                <IntroCard
                  key={intro.introId}
                  intro={intro}
                  isMe={intro.senderUserId === user?.userId}
                  otherUserName={otherUser?.displayName || "They"}
                />
              ))}
              {!isUnlocked && (
                <View style={styles.lockedBanner}>
                  <Ionicons name="lock-closed" size={14} color="#9CA3AF" />
                  <Text style={styles.lockedText}>
                    {match.introState === "pending_mine"
                      ? `Waiting for ${otherUser?.displayName} to send their intro`
                      : "Reply to their intro to unlock the chat"}
                  </Text>
                </View>
              )}
              {isUnlocked && (
                <View style={styles.unlockedBanner}>
                  <Ionicons name="chatbubble" size={14} color="#10B981" />
                  <Text style={styles.unlockedText}>Chat unlocked — say hi!</Text>
                </View>
              )}
            </View>
          )}

          {/* Intro composer */}
          {!hasSentIntro && !isUnlocked && (
            <IntroComposer
              matchId={matchId}
              onSend={(type, text) => introMutation.mutate({ type, text })}
              sending={introMutation.isPending}
            />
          )}

          {/* Messages */}
          {isUnlocked && (
            <>
              <FlatList
                ref={listRef}
                data={[...messages].reverse()}
                keyExtractor={m => m.messageId}
                inverted
                contentContainerStyle={[styles.msgList, { paddingBottom: 16 }]}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <MessageBubble msg={item} isMe={item.senderUserId === user?.userId} />
                )}
                ListEmptyComponent={
                  <View style={styles.emptyMessages}>
                    <Text style={styles.emptyMessagesText}>
                      Chat is open! Start a conversation with {otherUser?.displayName}.
                    </Text>
                  </View>
                }
              />

              {/* Input */}
              <View style={[styles.inputBar, { paddingBottom: bottomPad + 8 }]}>
                <TextInput
                  style={styles.msgInput}
                  value={input}
                  onChangeText={setInput}
                  placeholder="Message..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  maxLength={1000}
                />
                <Pressable
                  style={[styles.sendBtn, (!input.trim() || msgMutation.isPending) && styles.sendBtnDisabled]}
                  onPress={sendMessage}
                  disabled={!input.trim() || msgMutation.isPending}
                >
                  {msgMutation.isPending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
                  )}
                </Pressable>
              </View>
            </>
          )}
        </KeyboardAvoidingView>
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    backgroundColor: "#FFFFFF",
    gap: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerProfile: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  headerName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#0D0D0D",
  },
  headerLocation: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#9CA3AF",
  },
  menuBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  introsSection: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    padding: 16,
    gap: 12,
  },
  introsSectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  introCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 14,
  },
  introCardMe: {
    backgroundColor: "#FFF5F7",
  },
  introIconWrap: {},
  introIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  introContent: {
    flex: 1,
    gap: 4,
  },
  introLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  introText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#374151",
    lineHeight: 22,
  },
  introTextPlaceholder: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  lockedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 12,
  },
  lockedText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#6B7280",
    flex: 1,
    lineHeight: 18,
  },
  unlockedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#D1FAE5",
    borderRadius: 10,
    padding: 12,
  },
  unlockedText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#065F46",
  },
  introComposer: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    padding: 16,
    gap: 12,
  },
  introComposerTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#0D0D0D",
  },
  introComposerSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#6B7280",
    lineHeight: 20,
  },
  introInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#0D0D0D",
    minHeight: 80,
    textAlignVertical: "top",
  },
  introCharCount: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#9CA3AF",
    textAlign: "right",
  },
  introSendBtn: {
    borderRadius: 12,
    overflow: "hidden",
  },
  introSendGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  introSendText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  msgList: {
    padding: 16,
    gap: 8,
  },
  bubbleWrap: {
    alignSelf: "flex-start",
    maxWidth: "78%",
    gap: 4,
    marginBottom: 8,
  },
  bubbleWrapMe: {
    alignSelf: "flex-end",
  },
  bubble: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  bubbleMe: {
    backgroundColor: "#FF4D6A",
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#374151",
    lineHeight: 22,
  },
  bubbleTextMe: {
    color: "#FFFFFF",
  },
  bubbleTime: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#9CA3AF",
  },
  bubbleTimeMe: {
    textAlign: "right",
  },
  emptyMessages: {
    padding: 32,
    alignItems: "center",
  },
  emptyMessagesText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 20,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  msgInput: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#0D0D0D",
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FF4D6A",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF4D6A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  sendBtnDisabled: {
    opacity: 0.4,
    shadowOpacity: 0,
  },
});
