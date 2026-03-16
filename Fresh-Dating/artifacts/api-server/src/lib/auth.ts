import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "trustdating_salt").digest("hex");
}

export function generateToken(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ userId, iat: Date.now() })).toString("base64");
  const sig = crypto.createHash("sha256").update(payload + "trustdating_jwt_secret").digest("hex");
  return `${payload}.${sig}`;
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    const [payload, sig] = token.split(".");
    const expectedSig = crypto.createHash("sha256").update(payload + "trustdating_jwt_secret").digest("hex");
    if (sig !== expectedSig) return null;
    const data = JSON.parse(Buffer.from(payload, "base64").toString());
    return { userId: data.userId };
  } catch {
    return null;
  }
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized", message: "Missing auth token" });
    return;
  }
  const token = auth.slice(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid token" });
    return;
  }
  (req as any).userId = decoded.userId;
  next();
}
