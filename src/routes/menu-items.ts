import { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { invalidateCache } from "../lib/cache.js";
import { authenticate } from "../middleware/auth.js";
import { checkOwnership } from "../middleware/rbac.js";
import {
  createMenuItemSchema,
  updateMenuItemSchema,
  reorderMenuItemsSchema,
} from "../schemas/menu-item.js";

export default async function menuItemRoutes(app: FastifyInstance): Promise<void> {
  // GET /businesses/:slug/menu-items — optional ?categoryId query filter
  app.get(
    "/businesses/:slug/menu-items",
    { preHandler: [authenticate, checkOwnership] },
    async (request, reply) => {
      const { slug } = request.params as { slug: string };
      const { categoryId } = request.query as { categoryId?: string };

      const business = await prisma.business.findUnique({
        where: { slug },
        select: { id: true },
      });

      if (!business) {
        return reply.status(404).send({ error: "Business not found" });
      }

      const items = await prisma.menuItem.findMany({
        where: {
          businessId: business.id,
          ...(categoryId ? { categoryId } : {}),
        },
        orderBy: { sortOrder: "asc" },
      });

      return items;
    }
  );

  // POST /businesses/:slug/menu-items — create item, verify categoryId belongs to business
  app.post(
    "/businesses/:slug/menu-items",
    { preHandler: [authenticate, checkOwnership] },
    async (request, reply) => {
      const { slug } = request.params as { slug: string };
      const body = createMenuItemSchema.parse(request.body);

      const business = await prisma.business.findUnique({
        where: { slug },
        select: { id: true },
      });

      if (!business) {
        return reply.status(404).send({ error: "Business not found" });
      }

      // Verify the categoryId belongs to this business
      const category = await prisma.category.findFirst({
        where: { id: body.categoryId, businessId: business.id },
      });

      if (!category) {
        return reply.status(400).send({ error: "Category not found in this business" });
      }

      // Determine next sortOrder within the category
      const maxOrder = await prisma.menuItem.aggregate({
        where: { categoryId: body.categoryId },
        _max: { sortOrder: true },
      });
      const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

      // Prisma Json fields require Prisma.DbNull to store SQL NULL
      const badges =
        body.badges === null
          ? Prisma.DbNull
          : body.badges === undefined
            ? undefined
            : body.badges;

      const item = await prisma.menuItem.create({
        data: {
          businessId: business.id,
          categoryId: body.categoryId,
          nameTr: body.nameTr,
          nameEn: body.nameEn,
          descriptionTr: body.descriptionTr,
          descriptionEn: body.descriptionEn,
          price: body.price,
          image: body.image ?? null,
          badges,
          sortOrder,
        },
      });

      await invalidateCache(slug);

      return reply.status(201).send(item);
    }
  );

  // PUT /businesses/:slug/menu-items/reorder — must come BEFORE /:id
  app.put(
    "/businesses/:slug/menu-items/reorder",
    { preHandler: [authenticate, checkOwnership] },
    async (request, reply) => {
      const { slug } = request.params as { slug: string };
      const items = reorderMenuItemsSchema.parse(request.body);

      const business = await prisma.business.findUnique({
        where: { slug },
        select: { id: true },
      });

      if (!business) {
        return reply.status(404).send({ error: "Business not found" });
      }

      await prisma.$transaction(
        items.map((item) =>
          prisma.menuItem.update({
            where: { id: item.id },
            data: { sortOrder: item.sortOrder },
          })
        )
      );

      await invalidateCache(slug);

      return { message: "Menu items reordered successfully" };
    }
  );

  // PUT /businesses/:slug/menu-items/:id — update menu item
  app.put(
    "/businesses/:slug/menu-items/:id",
    { preHandler: [authenticate, checkOwnership] },
    async (request, reply) => {
      const { slug, id } = request.params as { slug: string; id: string };
      const body = updateMenuItemSchema.parse(request.body);

      const business = await prisma.business.findUnique({
        where: { slug },
        select: { id: true },
      });

      if (!business) {
        return reply.status(404).send({ error: "Business not found" });
      }

      const existing = await prisma.menuItem.findFirst({
        where: { id, businessId: business.id },
      });

      if (!existing) {
        return reply.status(404).send({ error: "Menu item not found" });
      }

      // If categoryId is changing, verify it belongs to this business
      if (body.categoryId && body.categoryId !== existing.categoryId) {
        const category = await prisma.category.findFirst({
          where: { id: body.categoryId, businessId: business.id },
        });
        if (!category) {
          return reply.status(400).send({ error: "Category not found in this business" });
        }
      }

      // Extract categoryId to use Prisma's connect pattern for relation field
      const { categoryId, badges: badgesRaw, ...rest } = body;

      const badges =
        badgesRaw === null
          ? Prisma.DbNull
          : badgesRaw === undefined
            ? undefined
            : badgesRaw;

      const item = await prisma.menuItem.update({
        where: { id },
        data: {
          ...rest,
          badges,
          ...(categoryId ? { category: { connect: { id: categoryId } } } : {}),
        },
      });

      await invalidateCache(slug);

      return item;
    }
  );

  // DELETE /businesses/:slug/menu-items/:id — delete menu item
  app.delete(
    "/businesses/:slug/menu-items/:id",
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

      const existing = await prisma.menuItem.findFirst({
        where: { id, businessId: business.id },
      });

      if (!existing) {
        return reply.status(404).send({ error: "Menu item not found" });
      }

      await prisma.menuItem.delete({ where: { id } });
      await invalidateCache(slug);

      return { message: "Menu item deleted successfully" };
    }
  );
}
