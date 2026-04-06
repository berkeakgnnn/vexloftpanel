import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { invalidateCache } from "../lib/cache.js";
import { authenticate } from "../middleware/auth.js";
import { checkOwnership } from "../middleware/rbac.js";
import {
  createCategorySchema,
  updateCategorySchema,
  reorderCategoriesSchema,
} from "../schemas/category.js";

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export default async function categoryRoutes(app: FastifyInstance): Promise<void> {
  // GET /businesses/:slug/categories — list by sortOrder, include _count of items
  app.get(
    "/businesses/:slug/categories",
    { preHandler: [authenticate, checkOwnership] },
    async (request, reply) => {
      const { slug } = request.params as { slug: string };

      const business = await prisma.business.findUnique({
        where: { slug },
        select: { id: true },
      });

      if (!business) {
        return reply.status(404).send({ error: "Business not found" });
      }

      const categories = await prisma.category.findMany({
        where: { businessId: business.id },
        include: { _count: { select: { items: true } } },
        orderBy: { sortOrder: "asc" },
      });

      return categories;
    }
  );

  // POST /businesses/:slug/categories — create with auto slug and sortOrder
  app.post(
    "/businesses/:slug/categories",
    { preHandler: [authenticate, checkOwnership] },
    async (request, reply) => {
      const { slug } = request.params as { slug: string };
      const body = createCategorySchema.parse(request.body);

      const business = await prisma.business.findUnique({
        where: { slug },
        select: { id: true },
      });

      if (!business) {
        return reply.status(404).send({ error: "Business not found" });
      }

      const categorySlug = generateSlug(body.nameTr);

      // Determine next sortOrder
      const maxOrder = await prisma.category.aggregate({
        where: { businessId: business.id },
        _max: { sortOrder: true },
      });
      const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

      const category = await prisma.category.create({
        data: {
          businessId: business.id,
          nameTr: body.nameTr,
          nameEn: body.nameEn,
          slug: categorySlug,
          layout: body.layout,
          banner: body.banner,
          sortOrder,
        },
      });

      await invalidateCache(slug);

      return reply.status(201).send(category);
    }
  );

  // PUT /businesses/:slug/categories/reorder — must come BEFORE /:id to avoid route conflict
  app.put(
    "/businesses/:slug/categories/reorder",
    { preHandler: [authenticate, checkOwnership] },
    async (request, reply) => {
      const { slug } = request.params as { slug: string };
      const items = reorderCategoriesSchema.parse(request.body);

      const business = await prisma.business.findUnique({
        where: { slug },
        select: { id: true },
      });

      if (!business) {
        return reply.status(404).send({ error: "Business not found" });
      }

      // Batch update sortOrder in a transaction
      await prisma.$transaction(
        items.map((item) =>
          prisma.category.update({
            where: { id: item.id },
            data: { sortOrder: item.sortOrder },
          })
        )
      );

      await invalidateCache(slug);

      return { message: "Categories reordered successfully" };
    }
  );

  // PUT /businesses/:slug/categories/:id — update category
  app.put(
    "/businesses/:slug/categories/:id",
    { preHandler: [authenticate, checkOwnership] },
    async (request, reply) => {
      const { slug, id } = request.params as { slug: string; id: string };
      const body = updateCategorySchema.parse(request.body);

      const business = await prisma.business.findUnique({
        where: { slug },
        select: { id: true },
      });

      if (!business) {
        return reply.status(404).send({ error: "Business not found" });
      }

      const existing = await prisma.category.findFirst({
        where: { id, businessId: business.id },
      });

      if (!existing) {
        return reply.status(404).send({ error: "Category not found" });
      }

      const category = await prisma.category.update({
        where: { id },
        data: body,
      });

      await invalidateCache(slug);

      return category;
    }
  );

  // DELETE /businesses/:slug/categories/:id — delete category (cascade handles items)
  app.delete(
    "/businesses/:slug/categories/:id",
    { preHandler: [authenticate, checkOwnership] },
    async (request, reply) => {
      const { slug, id } = request.params as { slug: string; id: string };

      const business = await prisma.business.findUnique({
        where: { slug },
        select: { id: true },
      });

      if (!business) {
        return reply.status(404).send({ error: "Business not found" });
      }

      const existing = await prisma.category.findFirst({
        where: { id, businessId: business.id },
      });

      if (!existing) {
        return reply.status(404).send({ error: "Category not found" });
      }

      await prisma.category.delete({ where: { id } });
      await invalidateCache(slug);

      return { message: "Category deleted successfully" };
    }
  );
}
