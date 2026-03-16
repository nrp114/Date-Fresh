import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  profilePhotosTable,
  promptAnswersTable,
  nowItemsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, generateId } from "../lib/auth.js";
import { buildUserProfile } from "../lib/profile.js";

const router = Router();

router.get("/me", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const profile = await buildUserProfile(userId);
  if (!profile) { res.status(404).json({ error: "NOT_FOUND" }); return; }
  res.json(profile);
});

router.patch("/me", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const { displayName, bio, relationshipIntent, locationCity } = req.body;
  const updates: Record<string, any> = { updatedAt: new Date() };
  if (displayName) updates.displayName = displayName;
  if (bio !== undefined) updates.bio = bio;
  if (relationshipIntent) updates.relationshipIntent = relationshipIntent;
  if (locationCity !== undefined) updates.locationCity = locationCity;
  await db.update(usersTable).set(updates).where(eq(usersTable.userId, userId));
  const profile = await buildUserProfile(userId);
  res.json(profile);
});

router.post("/me/now-items", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const { mediaType, caption, url } = req.body;
  const nowItemId = generateId();
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000); // 7 days
  await db.insert(nowItemsTable).values({
    nowItemId,
    userId,
    mediaType,
    caption: caption || null,
    url: url || null,
    expiresAt,
    visibilityState: "active",
  });
  const item = { nowItemId, mediaType, caption, url, createdAt: new Date().toISOString(), expiresAt: expiresAt.toISOString() };
  res.status(201).json(item);
});

router.delete("/me/now-items/:nowItemId", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const { nowItemId } = req.params;
  await db.delete(nowItemsTable).where(eq(nowItemsTable.nowItemId, nowItemId));
  res.status(204).send();
});

// Get any user profile
router.get("/:userId", requireAuth, async (req, res) => {
  const viewerUserId = (req as any).userId;
  const { userId } = req.params;
  const profile = await buildUserProfile(userId, viewerUserId);
  if (!profile) { res.status(404).json({ error: "NOT_FOUND" }); return; }
  res.json(profile);
});

export default router;
