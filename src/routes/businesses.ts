import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { invalidateCache } from "../lib/cache.js";
import { authenticate } from "../middleware/auth.js";
import { authorize, checkOwnership } from "../middleware/rbac.js";
import { createBusinessSchema, updateBusinessSchema } from "../schemas/business.js";

export default async function businessRoutes(app: FastifyInstance): Promise<void> {
  // GET /businesses — admin gets all (with owner), owner gets own
  app.get(
    "/businesses",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const user = request.user!;

      if (user.role === "ADMIN") {
        const businesses = await prisma.business.findMany({
          include: {
            owner: { select: { id: true, email: true, name: true } },
            _count: { select: { categories: true, menuItems: true } },
          },
          orderBy: { createdAt: "desc" },
        });
        return businesses;
      }

      // OWNER: only their own businesses
      const businesses = await prisma.business.findMany({
        where: { ownerId: user.userId },
        include: {
          _count: { select: { categories: true, menuItems: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return businesses;
    }
  );

  // POST /businesses — admin only, creates business with empty theme + info
  app.post(
    "/businesses",
    { preHandler: [authenticate, authorize("ADMIN")] },
    async (request, reply) => {
      const body = createBusinessSchema.parse(request.body);

      const existing = await prisma.business.findUnique({ where: { slug: body.slug } });
      if (existing) {
        return reply.status(409).send({ error: "Slug already in use" });
      }

      const ownerExists = await prisma.user.findUnique({ where: { id: body.ownerId } });
      if (!ownerExists) {
        return reply.status(400).send({ error: "Owner user not found" });
      }

      const business = await prisma.business.create({
        data: {
          name: body.name,
          slug: body.slug,
          template: body.template,
          ownerId: body.ownerId,
          // Auto-create empty theme and info records
          theme: { create: {} },
          info: { create: {} },
        },
        include: {
          theme: true,
          info: true,
        },
      });

      return reply.status(201).send(business);
    }
  );

  // GET /businesses/:slug — checkOwnership, include theme, info, _count
  app.get(
    "/businesses/:slug",
    { preHandler: [authenticate, checkOwnership] },
    async (request, reply) => {
      const { slug } = request.params as { slug: string };

      const business = await prisma.business.findUnique({
        where: { slug },
        include: {
          theme: true,
          info: true,
          owner: { select: { id: true, email: true, name: true } },
          _count: { select: { categories: true, menuItems: true } },
        },
      });

      if (!business) {
        return reply.status(404).send({ error: "Business not found" });
      }

      return business;
    }
  );

  // PUT /businesses/:slug — checkOwnership, update, invalidate cache
  app.put(
    "/businesses/:slug",
    { preHandler: [authenticate, checkOwnership] },
    async (request, reply) => {
      const { slug } = request.params as { slug: string };
      const body = updateBusinessSchema.parse(request.body);

      // If slug is changing, check it's not already taken
      if (body.slug && body.slug !== slug) {
        const conflict = await prisma.business.findUnique({ where: { slug: body.slug } });
        if (conflict) {
          return reply.status(409).send({ error: "Slug already in use" });
        }
      }

      const business = await prisma.business.update({
        where: { slug },
        data: body,
      });

      await invalidateCache(slug);
      // Invalidate new slug too if it changed
      if (body.slug && body.slug !== slug) {
        await invalidateCache(body.slug);
      }

      return business;
    }
  );

  // DELETE /businesses/:slug — admin only, cascade handles related data
  app.delete(
    "/businesses/:slug",
    { preHandler: [authenticate, authorize("ADMIN")] },
    async (request, reply) => {
      const { slug } = request.params as { slug: string };

      const business = await prisma.business.findUnique({ where: { slug } });
      if (!business) {
        return reply.status(404).send({ error: "Business not found" });
      }

      await prisma.business.delete({ where: { slug } });
      await invalidateCache(slug);

      return { message: "Business deleted successfully" };
    }
  );
}
