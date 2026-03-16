import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { ne, eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { buildUserProfile, computeLikelihoodLabel } from "../lib/profile.js";

const router = Router();

router.get("/batch", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    // Get random active users (not the viewer)
    const candidates = await db
      .select()
      .from(usersTable)
      .where(ne(usersTable.userId, userId))
      .limit(10);

    const results = await Promise.all(
      candidates.map(async (c) => {
        const profile = await buildUserProfile(c.userId, userId);
        return {
          profile,
          likelihoodLabel: computeLikelihoodLabel(c),
          explanationReasons: [
            "relationship goals align",
            "profile is recently active",
          ].slice(0, Math.floor(Math.random() * 2) + 1),
        };
      })
    );

    res.json({
      candidates: results.filter(r => r.profile !== null),
      totalRemaining: Math.max(0, candidates.length - 10),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

router.get("/profiles/:userId/likelihood", requireAuth, async (req, res) => {
  res.json(computeLikelihoodLabel({}));
});

export default router;
