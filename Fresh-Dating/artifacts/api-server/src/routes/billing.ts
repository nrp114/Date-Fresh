import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router = Router();

router.get("/entitlements", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const user = await db.select().from(usersTable).where(eq(usersTable.userId, userId)).limit(1);
  if (!user[0]) { res.status(404).json({ error: "NOT_FOUND" }); return; }
  const u = user[0];
  const limit = u.premiumTier === "premium" ? 15 : 5;
  const now = new Date();
  const resetAt = new Date(u.dailyLikesResetAt);
  const hoursSinceReset = (now.getTime() - resetAt.getTime()) / 3600000;
  const used = hoursSinceReset >= 24 ? 0 : u.dailyLikesUsed;
  res.json({
    premiumTier: u.premiumTier,
    dailyLikesRemaining: Math.max(0, limit - used),
    dailyLikesTotal: limit,
    advancedFilters: u.premiumTier === "premium",
  });
});

export default router;
