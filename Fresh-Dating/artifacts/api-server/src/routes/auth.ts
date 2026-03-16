import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, profilePhotosTable, promptAnswersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword, generateToken, generateId, requireAuth } from "../lib/auth.js";
import { buildUserProfile } from "../lib/profile.js";

const router = Router();

const DEMO_PHOTOS = [
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&q=80",
  "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&q=80",
  "https://images.unsplash.com/photo-1488161628813-04466f872be2?w=600&q=80",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80",
  "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&q=80",
];

router.post("/signup", async (req, res) => {
  try {
    const { email, password, displayName, dateOfBirth, genderIdentity, orientation, relationshipIntent } = req.body;
    if (!email || !password || !displayName || !dateOfBirth || !genderIdentity || !orientation || !relationshipIntent) {
      res.status(400).json({ error: "MISSING_FIELDS", message: "All fields required" });
      return;
    }

    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing[0]) {
      res.status(400).json({ error: "EMAIL_EXISTS", message: "Email already registered" });
      return;
    }

    const userId = generateId();
    const passwordHash = hashPassword(password);

    await db.insert(usersTable).values({
      userId,
      email,
      passwordHash,
      displayName,
      bio: "",
      dateOfBirth,
      genderIdentity,
      orientation,
      relationshipIntent,
      freshnessScore: 1.0,
      profileCompletenessScore: 0.4,
    });

    // Add a starter prompt
    await db.insert(promptAnswersTable).values({
      promptAnswerId: generateId(),
      userId,
      promptText: "A perfect Sunday looks like...",
      answerType: "text",
      contentText: "",
    });

    const token = generateToken(userId);
    const profile = await buildUserProfile(userId);
    res.status(201).json({ token, user: profile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "SERVER_ERROR", message: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (!user[0] || user[0].passwordHash !== hashPassword(password)) {
      res.status(401).json({ error: "INVALID_CREDENTIALS", message: "Invalid email or password" });
      return;
    }

    // Update last active
    await db.update(usersTable).set({ lastActiveAt: new Date() }).where(eq(usersTable.userId, user[0].userId));

    const token = generateToken(user[0].userId);
    const profile = await buildUserProfile(user[0].userId);
    res.json({ token, user: profile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "SERVER_ERROR", message: "Internal server error" });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const profile = await buildUserProfile(userId);
    if (!profile) {
      res.status(404).json({ error: "NOT_FOUND" });
      return;
    }
    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

export default router;
