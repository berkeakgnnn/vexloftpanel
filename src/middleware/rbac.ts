import { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../lib/prisma.js";

export function authorize(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      return reply.status(401).send({ error: "Not authenticated" });
    }
    if (!roles.includes(request.user.role)) {
      return reply.status(403).send({ error: "Insufficient permissions" });
    }
  };
}

export async function checkOwnership(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!request.user) {
    return reply.status(401).send({ error: "Not authenticated" });
  }

  // Admin can access everything
  if (request.user.role === "ADMIN") return;

  const { slug } = request.params as { slug: string };
  if (!slug) return;

  const business = await prisma.business.findUnique({
    where: { slug },
    select: { ownerId: true },
  });

  if (!business) {
    return reply.status(404).send({ error: "Business not found" });
  }

  if (business.ownerId !== request.user.userId) {
    return reply.status(403).send({ error: "You don't have access to this business" });
  }
}
