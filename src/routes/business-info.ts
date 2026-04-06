import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { invalidateCache } from "../lib/cache.js";
import { authenticate } from "../middleware/auth.js";
import { checkOwnership } from "../middleware/rbac.js";

const updateBusinessInfoSchema = z.object({
  tagline: z.string().nullable().optional(),
  established: z.string().nullable().optional(),
  locationTr: z.string().optional(),
  locationEn: z.string().optional(),
  hoursTr: z.string().optional(),
  hoursEn: z.string().optional(),
  phone: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  instagram: z.string().nullable().optional(),
});

export default async function businessInfoRoutes(app: FastifyInstance): Promise<void> {
  // GET /businesses/:slug/info — checkOwnership, return info
  app.get(
    "/businesses/:slug/info",
    { preHandler: [authenticate, checkOwnership] },
    async (request, reply) => {
      const { slug } = request.params as { slug: string };

      const business = await prisma.business.findUnique({
        where: { slug },
        select: { id: true, info: true },
      });

      if (!business) {
        return reply.status(404).send({ error: "Business not found" });
      }

      return business.info ?? {};
    }
  );

  // PUT /businesses/:slug/info — checkOwnership, upsert info, invalidate cache
  app.put(
    "/businesses/:slug/info",
    { preHandler: [authenticate, checkOwnership] },
    async (request, reply) => {
      const { slug } = request.params as { slug: string };
      const body = updateBusinessInfoSchema.parse(request.body);

      const business = await prisma.business.findUnique({
        where: { slug },
        select: { id: true },
      });

      if (!business) {
        return reply.status(404).send({ error: "Business not found" });
      }

      const info = await prisma.businessInfo.upsert({
        where: { businessId: business.id },
        create: { businessId: business.id, ...body },
        update: body,
      });

      await invalidateCache(slug);

      return info;
    }
  );
}
