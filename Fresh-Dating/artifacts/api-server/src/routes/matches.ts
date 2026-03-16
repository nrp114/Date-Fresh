import { Router } from "express";
import { db } from "@workspace/db";
import { matchesTable, introArtifactsTable, messagesTable } from "@workspace/db";
import { eq, or, and } from "drizzle-orm";
import { requireAuth, generateId } from "../lib/auth.js";
import { buildUserProfile } from "../lib/profile.js";

const router = Router();

async function buildMatchDetail(match: any, userId: string) {
  const otherUserId = match.userAId === userId ? match.userBId : match.userAId;
  const otherUser = await buildUserProfile(otherUserId, userId);
  const intros = await db.select().from(introArtifactsTable).where(eq(introArtifactsTable.matchId, match.matchId));
  const messages = await db.select().from(messagesTable).where(eq(messagesTable.matchId, match.matchId)).limit(1);

  return {
    matchId: match.matchId,
    otherUser,
    state: match.state,
    introState: match.introState,
    chatUnlockedAt: match.chatUnlockedAt?.toISOString() || null,
    intros: intros.map(i => ({
      introId: i.introId,
      matchId: i.matchId,
      senderUserId: i.senderUserId,
      artifactType: i.artifactType,
      text: i.text,
      durationSeconds: i.durationSeconds,
      createdAt: i.createdAt?.toISOString(),
    })),
    lastMessage: messages[0] ? {
      messageId: messages[0].messageId,
      matchId: messages[0].matchId,
      senderUserId: messages[0].senderUserId,
      text: messages[0].text,
      createdAt: messages[0].createdAt?.toISOString(),
      readAt: messages[0].readAt?.toISOString() || null,
    } : null,
    createdAt: match.createdAt?.toISOString(),
  };
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const matches = await db
      .select()
      .from(matchesTable)
      .where(or(eq(matchesTable.userAId, userId), eq(matchesTable.userBId, userId)));

    const enriched = await Promise.all(matches.map(m => buildMatchDetail(m, userId)));
    res.json({ matches: enriched });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

router.get("/:matchId", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { matchId } = req.params;
    const match = await db.select().from(matchesTable).where(eq(matchesTable.matchId, matchId)).limit(1);
    if (!match[0]) { res.status(404).json({ error: "NOT_FOUND" }); return; }
    const detail = await buildMatchDetail(match[0], userId);
    res.json(detail);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

router.post("/:matchId/intro", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { matchId } = req.params;
    const { artifactType, text, durationSeconds } = req.body;

    const match = await db.select().from(matchesTable).where(eq(matchesTable.matchId, matchId)).limit(1);
    if (!match[0]) { res.status(404).json({ error: "NOT_FOUND" }); return; }
    const m = match[0];

    const introId = generateId();
    await db.insert(introArtifactsTable).values({
      introId,
      matchId,
      senderUserId: userId,
      artifactType,
      text: text || null,
      durationSeconds: durationSeconds || null,
    });

    // Update intro state
    const existingIntros = await db.select().from(introArtifactsTable).where(eq(introArtifactsTable.matchId, matchId));
    const otherUserId = m.userAId === userId ? m.userBId : m.userAId;
    const otherSentIntro = existingIntros.some(i => i.senderUserId === otherUserId);

    let newIntroState: "pending_mine" | "pending_theirs" | "both_sent" | "unlocked" = "pending_theirs";
    if (otherSentIntro) {
      newIntroState = "unlocked";
      await db.update(matchesTable).set({
        introState: newIntroState,
        chatUnlockedAt: new Date(),
      }).where(eq(matchesTable.matchId, matchId));
    } else {
      newIntroState = "pending_theirs";
      await db.update(matchesTable).set({ introState: newIntroState }).where(eq(matchesTable.matchId, matchId));
    }

    const intro = {
      introId,
      matchId,
      senderUserId: userId,
      artifactType,
      text: text || null,
      durationSeconds: durationSeconds || null,
      createdAt: new Date().toISOString(),
    };
    res.status(201).json(intro);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

router.get("/:matchId/intro", requireAuth, async (req, res) => {
  try {
    const { matchId } = req.params;
    const intros = await db.select().from(introArtifactsTable).where(eq(introArtifactsTable.matchId, matchId));
    res.json(intros.map(i => ({
      introId: i.introId,
      matchId: i.matchId,
      senderUserId: i.senderUserId,
      artifactType: i.artifactType,
      text: i.text,
      durationSeconds: i.durationSeconds,
      createdAt: i.createdAt?.toISOString(),
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

router.get("/:matchId/messages", requireAuth, async (req, res) => {
  try {
    const { matchId } = req.params;
    const messages = await db.select().from(messagesTable).where(eq(messagesTable.matchId, matchId));
    res.json(messages.map(m => ({
      messageId: m.messageId,
      matchId: m.matchId,
      senderUserId: m.senderUserId,
      text: m.text,
      createdAt: m.createdAt?.toISOString(),
      readAt: m.readAt?.toISOString() || null,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

router.post("/:matchId/messages", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { matchId } = req.params;
    const { text } = req.body;
    if (!text) { res.status(400).json({ error: "MISSING_TEXT" }); return; }

    const match = await db.select().from(matchesTable).where(eq(matchesTable.matchId, matchId)).limit(1);
    if (!match[0] || match[0].introState !== "unlocked") {
      res.status(403).json({ error: "CHAT_LOCKED", message: "Send an intro first to unlock chat" });
      return;
    }

    const messageId = generateId();
    await db.insert(messagesTable).values({ messageId, matchId, senderUserId: userId, text });
    res.status(201).json({
      messageId,
      matchId,
      senderUserId: userId,
      text,
      createdAt: new Date().toISOString(),
      readAt: null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

export default router;
