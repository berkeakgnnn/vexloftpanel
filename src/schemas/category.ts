import { z } from "zod";

export const createCategorySchema = z.object({
  nameTr: z.string().min(1),
  nameEn: z.string().min(1),
  layout: z.enum(["DEFAULT", "CHALKBOARD", "GRID"]).default("DEFAULT"),
  banner: z.string().optional(),
});

export const updateCategorySchema = z.object({
  nameTr: z.string().min(1).optional(),
  nameEn: z.string().min(1).optional(),
  slug: z.string().optional(),
  layout: z.enum(["DEFAULT", "CHALKBOARD", "GRID"]).optional(),
  banner: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const reorderCategoriesSchema = z.array(
  z.object({ id: z.string().uuid(), sortOrder: z.number().int() })
);
