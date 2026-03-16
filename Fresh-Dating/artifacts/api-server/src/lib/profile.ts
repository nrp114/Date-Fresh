import { db } from "@workspace/db";
import {
  usersTable,
  profilePhotosTable,
  promptAnswersTable,
  nowItemsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

export async function buildUserProfile(userId: string, viewerUserId?: string) {
  const user = await db.select().from(usersTable).where(eq(usersTable.userId, userId)).limit(1);
  if (!user[0]) return null;
  const u = user[0];

  const photos = await db.select().from(profilePhotosTable).where(eq(profilePhotosTable.userId, userId));
  const prompts = await db.select().from(promptAnswersTable).where(eq(promptAnswersTable.userId, userId));
  const nowItems = await db.select().from(nowItemsTable).where(eq(nowItemsTable.userId, userId));

  const dob = new Date(u.dateOfBirth);
  const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000));

  return {
    userId: u.userId,
    displayName: u.displayName,
    bio: u.bio,
    age,
    genderIdentity: u.genderIdentity,
    orientation: u.orientation,
    relationshipIntent: u.relationshipIntent,
    verificationStatus: u.verificationStatus,
    freshnessScore: u.freshnessScore,
    freshnessLabel: u.freshnessLabel ?? "active_today",
    profileCompletenessScore: u.profileCompletenessScore,
    premiumTier: u.premiumTier,
    lastActiveAt: u.lastActiveAt?.toISOString(),
    locationCity: u.locationCity,
    distanceKm: viewerUserId && viewerUserId !== userId ? Math.floor(Math.random() * 30 + 1) : undefined,
    photos: photos.map(p => ({
      photoId: p.photoId,
      url: p.url,
      isPrimary: p.isPrimary === 1,
      freshnessLabel: p.freshnessLabel,
      uploadedAt: p.uploadedAt?.toISOString(),
    })),
    prompts: prompts.map(p => ({
      promptAnswerId: p.promptAnswerId,
      promptText: p.promptText,
      answerType: p.answerType,
      contentText: p.contentText,
      updatedAt: p.updatedAt?.toISOString(),
    })),
    nowItems: nowItems.map(n => ({
      nowItemId: n.nowItemId,
      mediaType: n.mediaType,
      caption: n.caption,
      url: n.url,
      createdAt: n.createdAt?.toISOString(),
      expiresAt: n.expiresAt?.toISOString(),
    })),
  };
}

export function computeLikelihoodLabel(receiverUser: any) {
  const labels = ["high", "moderate", "low"] as const;
  const displayTexts = {
    high: "High chance of reply",
    moderate: "Moderate chance of reply",
    low: "Low chance of reply",
  };
  const label = labels[Math.floor(Math.random() * labels.length)];
  return {
    label,
    displayText: displayTexts[label],
    reasons: [
      "relationship goals align",
      "profile is recently active",
    ].slice(0, Math.floor(Math.random() * 2) + 1),
  };
}
