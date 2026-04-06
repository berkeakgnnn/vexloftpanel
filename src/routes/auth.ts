import { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import {
  generateTokens,
  verifyRefreshToken,
  storeRefreshToken,
  getStoredRefreshToken,
} from "../lib/jwt.js";
import { authenticate } from "../middleware/auth.js";
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  changePasswordSchema,
} from "../schemas/auth.js";

export default async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post("/auth/register", async (request, reply) => {
    const body = registerSchema.parse(request.body);

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      return reply.status(409).send({ error: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: { email: body.email, password: hashedPassword, name: body.name },
    });

    const payload = { userId: user.id, role: user.role };
    const tokens = generateTokens(payload);
    await storeRefreshToken(user.id, tokens.refreshToken);

    return reply.status(201).send({
      ...tokens,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  });

  app.post("/auth/login", async (request, reply) => {
    const body = loginSchema.parse(request.body);

    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) {
      return reply.status(401).send({ error: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(body.password, user.password);
    if (!valid) {
      return reply.status(401).send({ error: "Invalid email or password" });
    }

    const payload = { userId: user.id, role: user.role };
    const tokens = generateTokens(payload);
    await storeRefreshToken(user.id, tokens.refreshToken);

    return {
      ...tokens,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  });

  app.post("/auth/refresh", async (request, reply) => {
    const body = refreshSchema.parse(request.body);

    try {
      const payload = verifyRefreshToken(body.refreshToken);
      const stored = await getStoredRefreshToken(payload.userId);

      if (stored !== body.refreshToken) {
        return reply.status(401).send({ error: "Invalid refresh token" });
      }

      const newPayload = { userId: payload.userId, role: payload.role };
      const tokens = generateTokens(newPayload);
      await storeRefreshToken(payload.userId, tokens.refreshToken);

      return tokens;
    } catch {
      return reply.status(401).send({ error: "Invalid or expired refresh token" });
    }
  });

  app.get("/auth/me", { preHandler: [authenticate] }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user!.userId },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    if (!user) {
      return reply.status(404).send({ error: "User not found" });
    }

    return user;
  });

  app.post(
    "/auth/change-password",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const body = changePasswordSchema.parse(request.body);

      const user = await prisma.user.findUnique({ where: { id: request.user!.userId } });
      if (!user) {
        return reply.status(404).send({ error: "User not found" });
      }

      const valid = await bcrypt.compare(body.currentPassword, user.password);
      if (!valid) {
        return reply.status(400).send({ error: "Current password is incorrect" });
      }

      const hashedPassword = await bcrypt.hash(body.newPassword, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      return { message: "Password changed successfully" };
    }
  );
}
