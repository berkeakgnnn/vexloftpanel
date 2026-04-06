import jwt from "jsonwebtoken";
import { redis } from "./redis.js";
import type { UserPayload } from "../types/index.js";

const ACCESS_SECRET = process.env.JWT_SECRET || "dev-secret";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "dev-refresh-secret";

export function generateTokens(payload: UserPayload) {
  const accessToken = jwt.sign(payload, ACCESS_SECRET, { expiresIn: "15m" });
  const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: "7d" });
  return { accessToken, refreshToken };
}

export function verifyAccessToken(token: string): UserPayload {
  return jwt.verify(token, ACCESS_SECRET) as UserPayload;
}

export function verifyRefreshToken(token: string): UserPayload {
  return jwt.verify(token, REFRESH_SECRET) as UserPayload;
}

export async function storeRefreshToken(userId: string, token: string) {
  await redis.set(`refresh:${userId}`, token, "EX", 7 * 24 * 60 * 60);
}

export async function getStoredRefreshToken(userId: string) {
  return redis.get(`refresh:${userId}`);
}

export async function deleteRefreshToken(userId: string) {
  await redis.del(`refresh:${userId}`);
}
