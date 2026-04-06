import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { getCache, setCache } from "../lib/cache.js";

const CACHE_TTL = 300; // 5 minutes

export default async function publicRoutes(app: FastifyInstance): Promise<void> {
  // GET /public/:slug — no auth, cached public menu data
  app.get("/public/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const cacheKey = `public:menu:${slug}`;

    // Try cache first
    const cached = await getCache(cacheKey);
    if (cached) {
      return cached;
    }

    const business = await prisma.business.findUnique({
      where: { slug, isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        template: true,
        theme: true,
        info: true,
        categories: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            nameTr: true,
            nameEn: true,
            slug: true,
            banner: true,
            layout: true,
            sortOrder: true,
            items: {
              where: { isActive: true },
              orderBy: { sortOrder: "asc" },
              select: {
                id: true,
                nameTr: true,
                nameEn: true,
                descriptionTr: true,
                descriptionEn: true,
                price: true,
                image: true,
                sortOrder: true,
                badges: true,
              },
            },
          },
        },
      },
    });

    if (!business) {
      return reply.status(404).send({ error: "Business not found or inactive" });
    }

    // Cache for 5 minutes
    await setCache(cacheKey, business, CACHE_TTL);

    return business;
  });
}
