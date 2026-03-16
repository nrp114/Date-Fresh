import { pgTable, text, timestamp, real, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userStatusEnum = pgEnum("user_status", ["active", "paused", "banned", "deleted"]);
export const premiumTierEnum = pgEnum("premium_tier", ["free", "premium"]);
export const verificationStatusEnum = pgEnum("verification_status", ["unverified", "pending", "verified"]);
export const introStateEnum = pgEnum("intro_state", ["none", "pending_mine", "pending_theirs", "both_sent", "unlocked"]);
export const matchStateEnum = pgEnum("match_state", ["active", "unmatched", "blocked", "expired"]);
export const likeStateEnum = pgEnum("like_state", ["pending", "tray", "matched", "expired", "withdrawn"]);

export const usersTable = pgTable("users", {
  userId: text("user_id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  dateOfBirth: text("date_of_birth").notNull(),
  genderIdentity: text("gender_identity").notNull(),
  orientation: text("orientation").notNull(),
  relationshipIntent: text("relationship_intent").notNull(),
  locationCity: text("location_city"),
  status: userStatusEnum("status").default("active").notNull(),
  premiumTier: premiumTierEnum("premium_tier").default("free").notNull(),
  verificationStatus: verificationStatusEnum("verification_status").default("unverified").notNull(),
  freshnessScore: real("freshness_score").default(1.0).notNull(),
  freshnessLabel: text("freshness_label").default("active_today"),
  profileCompletenessScore: real("profile_completeness_score").default(0.0).notNull(),
  dailyLikesUsed: integer("daily_likes_used").default(0).notNull(),
  dailyLikesResetAt: timestamp("daily_likes_reset_at").defaultNow().notNull(),
  lastActiveAt: timestamp("last_active_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ userId: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

export const profilePhotosTable = pgTable("profile_photos", {
  photoId: text("photo_id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.userId),
  url: text("url").notNull(),
  isPrimary: integer("is_primary").default(0).notNull(),
  freshnessLabel: text("freshness_label"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const promptAnswersTable = pgTable("prompt_answers", {
  promptAnswerId: text("prompt_answer_id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.userId),
  promptText: text("prompt_text").notNull(),
  answerType: text("answer_type").default("text").notNull(),
  contentText: text("content_text"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const nowItemsTable = pgTable("now_items", {
  nowItemId: text("now_item_id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.userId),
  mediaType: text("media_type").notNull(),
  caption: text("caption"),
  url: text("url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
  visibilityState: text("visibility_state").default("active").notNull(),
});

export const likesTable = pgTable("likes", {
  likeId: text("like_id").primaryKey(),
  senderUserId: text("sender_user_id").notNull().references(() => usersTable.userId),
  receiverUserId: text("receiver_user_id").notNull().references(() => usersTable.userId),
  targetType: text("target_type").notNull(),
  targetId: text("target_id"),
  message: text("message"),
  state: likeStateEnum("state").default("pending").notNull(),
  likelihoodLabel: text("likelihood_label"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const matchesTable = pgTable("matches", {
  matchId: text("match_id").primaryKey(),
  userAId: text("user_a_id").notNull().references(() => usersTable.userId),
  userBId: text("user_b_id").notNull().references(() => usersTable.userId),
  state: matchStateEnum("state").default("active").notNull(),
  introState: introStateEnum("intro_state").default("none").notNull(),
  chatUnlockedAt: timestamp("chat_unlocked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const introArtifactsTable = pgTable("intro_artifacts", {
  introId: text("intro_id").primaryKey(),
  matchId: text("match_id").notNull().references(() => matchesTable.matchId),
  senderUserId: text("sender_user_id").notNull().references(() => usersTable.userId),
  artifactType: text("artifact_type").notNull(),
  text: text("text"),
  durationSeconds: integer("duration_seconds"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messagesTable = pgTable("messages", {
  messageId: text("message_id").primaryKey(),
  matchId: text("match_id").notNull().references(() => matchesTable.matchId),
  senderUserId: text("sender_user_id").notNull().references(() => usersTable.userId),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  readAt: timestamp("read_at"),
});

export const blocksTable = pgTable("blocks", {
  blockId: text("block_id").primaryKey(),
  blockerUserId: text("blocker_user_id").notNull().references(() => usersTable.userId),
  blockedUserId: text("blocked_user_id").notNull().references(() => usersTable.userId),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reportsTable = pgTable("reports", {
  reportId: text("report_id").primaryKey(),
  reporterUserId: text("reporter_user_id").notNull().references(() => usersTable.userId),
  reportedUserId: text("reported_user_id").notNull().references(() => usersTable.userId),
  category: text("category").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ProfilePhoto = typeof profilePhotosTable.$inferSelect;
export type PromptAnswer = typeof promptAnswersTable.$inferSelect;
export type NowItem = typeof nowItemsTable.$inferSelect;
export type Like = typeof likesTable.$inferSelect;
export type Match = typeof matchesTable.$inferSelect;
export type IntroArtifact = typeof introArtifactsTable.$inferSelect;
export type Message = typeof messagesTable.$inferSelect;
