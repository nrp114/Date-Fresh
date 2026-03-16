import { Router } from "express";
import { db } from "@workspace/db";
import { likesTable, matchesTable, introArtifactsTable, usersTable } from "@workspace/db";
import { eq, and, or } from "drizzle-orm";
import { requireAuth, generateId } from "../lib/auth.js";
import { buildUserProfile, computeLikelihoodLabel } from "../lib/profile.js";

const router = Router();

const FREE_DAILY_LIKES = 5;
const PREMIUM_DAILY_LIKES = 15;

router.post("/", requireAuth, async (req, res) => {
  try {
    const senderUserId = (req as any).userId;
    const { receiverUserId, targetType, targetId, message } = req.body;

    if (!receiverUserId || !targetType) {
      res.status(400).json({ error: "MISSING_FIELDS" });
      return;
    }

    // Check quota
    const sender = await db.select().from(usersTable).where(eq(usersTable.userId, senderUserId)).limit(1);
    const user = sender[0];
    const now = new Date();
    const resetAt = new Date(user.dailyLikesResetAt);
    const hoursSinceReset = (now.getTime() - resetAt.getTime()) / 3600000;
    let dailyUsed = user.dailyLikesUsed;
    if (hoursSinceReset >= 24) {
      dailyUsed = 0;
      await db.update(usersTable).set({ dailyLikesUsed: 0, dailyLikesResetAt: now }).where(eq(usersTable.userId, senderUserId));
    }

    const limit = user.premiumTier === "premium" ? PREMIUM_DAILY_LIKES : FREE_DAILY_LIKES;
    if (dailyUsed >= limit) {
      res.status(429).json({ error: "QUOTA_EXCEEDED", message: "Daily like quota exceeded" });
      return;
    }

    // Create like
    const likeId = generateId();
    const likelihood = computeLikelihoodLabel({});
    await db.insert(likesTable).values({
      likeId,
      senderUserId,
      receiverUserId,
      targetType,
      targetId: targetId || null,
      message: message || null,
      state: "tray",
      likelihoodLabel: likelihood.label,
    });

    await db.update(usersTable).set({ dailyLikesUsed: dailyUsed + 1 }).where(eq(usersTable.userId, senderUserId));

    // Check for mutual like => match
    const mutual = await db
      .select()
      .from(likesTable)
      .where(
        and(
          eq(likesTable.senderUserId, receiverUserId),
          eq(likesTable.receiverUserId, senderUserId),
          eq(likesTable.state, "tray")
        )
      )
      .limit(1);

    let match = null;
    let isMatch = false;

    if (mutual[0]) {
      // Create match
      const matchId = generateId();
      await db.insert(matchesTable).values({
        matchId,
        userAId: senderUserId,
        userBId: receiverUserId,
        state: "active",
        introState: "none",
      });

      // Update both likes to matched
      await db.update(likesTable).set({ state: "matched" }).where(eq(likesTable.likeId, likeId));
      await db.update(likesTable).set({ state: "matched" }).where(eq(likesTable.likeId, mutual[0].likeId));

      isMatch = true;
      const otherProfile = await buildUserProfile(receiverUserId, senderUserId);
      match = {
        matchId,
        otherUser: otherProfile,
        state: "active",
        introState: "none",
        intros: [],
        createdAt: new Date().toISOString(),
      };
    }

    const senderProfile = await buildUserProfile(senderUserId);
    const like = {
      likeId,
      senderUserId,
      receiverUserId,
      targetType,
      message: message || null,
      state: isMatch ? "matched" : "tray",
      likelihoodLabel: likelihood,
      createdAt: new Date().toISOString(),
      senderProfile,
    };

    res.status(201).json({
      like,
      match,
      isMatch,
      quotaRemaining: limit - dailyUsed - 1,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const tray = await db
      .select()
      .from(likesTable)
      .where(and(eq(likesTable.receiverUserId, userId), eq(likesTable.state, "tray")))
      .limit(12);

    const enriched = await Promise.all(
      tray.map(async (l) => {
        const senderProfile = await buildUserProfile(l.senderUserId, userId);
        return {
          likeId: l.likeId,
          senderUserId: l.senderUserId,
          receiverUserId: l.receiverUserId,
          targetType: l.targetType,
          message: l.message,
          state: l.state,
          createdAt: l.createdAt?.toISOString(),
          senderProfile,
          likelihoodLabel: computeLikelihoodLabel({}),
        };
      })
    );

    res.json({
      tray: enriched,
      backlogCount: 0,
      trayCount: enriched.length,
      queueStatus: enriched.length > 10 ? "busy" : "open",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

router.post("/:likeId/withdraw", requireAuth, async (req, res) => {
  try {
    const { likeId } = req.params;
    await db.update(likesTable).set({ state: "withdrawn" }).where(eq(likesTable.likeId, likeId));
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

export default router;
