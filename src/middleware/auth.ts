import { FastifyRequest, FastifyReply } from "fastify";
import { verifyAccessToken } from "../lib/jwt.js";

export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "Missing or invalid authorization header" });
  }

  try {
    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);
    request.user = payload;
  } catch {
    return reply.status(401).send({ error: "Invalid or expired token" });
  }
}
