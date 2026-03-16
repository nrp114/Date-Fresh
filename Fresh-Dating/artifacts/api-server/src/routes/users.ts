import { Router } from "express";
import { db } from "@workspace/db";
import { blocksTable, reportsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, generateId } from "../lib/auth.js";

const router = Router();

router.post("/:userId/block", requireAuth, async (req, res) => {
  const blockerUserId = (req as any).userId;
  const { userId: blockedUserId } = req.params;
  await db.insert(blocksTable).values({ blockId: generateId(), blockerUserId, blockedUserId });
  res.status(204).send();
});

router.post("/:userId/report", requireAuth, async (req, res) => {
  const reporterUserId = (req as any).userId;
  const { userId: reportedUserId } = req.params;
  const { category, details } = req.body;
  await db.insert(reportsTable).values({ reportId: generateId(), reporterUserId, reportedUserId, category, details: details || null });
  res.status(204).send();
});

export default router;
