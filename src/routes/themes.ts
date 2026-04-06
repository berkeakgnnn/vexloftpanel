import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { invalidateCache } from "../lib/cache.js";
import { authenticate } from "../middleware/auth.js";
import { checkOwnership } from "../middleware/rbac.js";
import { updateThemeSchema } from "../schemas/theme.js";

export default async function themeRoutes(app: FastifyInstance): Promise<void> {
  // GET /businesses/:slug/theme — checkOwnership, return theme
  app.get(
    "/businesses/:slug/theme",
    { preHandler: [authenticate, checkOwnership] },
    async (request, reply) => {
      const { slug } = request.params as { slug: string };

      const business = await prisma.business.findUnique({
        where: { slug },
        select: { id: true, theme: true },
      });

      if (!business) {
        return reply.status(404).send({ error: "Business not found" });
      }

      return business.theme ?? {};
    }
  );

  // PUT /businesses/:slug/theme — checkOwnership, upsert theme, invalidate cache
  app.put(
    "/businesses/:slug/theme",
    { preHandler: [authenticate, checkOwnership] },
    async (request, reply) => {
      const { slug } = request.params as { slug: string };
      const body = updateThemeSchema.parse(request.body);

      const business = await prisma.business.findUnique({
        where: { slug },
        select: { id: true },
      });

      if (!business) {
        return reply.status(404).send({ error: "Business not found" });
      }

      const theme = await prisma.businessTheme.upsert({
        where: { businessId: business.id },
        create: { businessId: business.id, ...body },
        update: body,
      });

      await invalidateCache(slug);

      return theme;
    }
  );
}
