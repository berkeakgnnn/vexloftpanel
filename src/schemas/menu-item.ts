import { z } from "zod";

export const createMenuItemSchema = z.object({
  categoryId: z.string().uuid(),
  nameTr: z.string().min(1),
  nameEn: z.string().min(1),
  descriptionTr: z.string().default(""),
  descriptionEn: z.string().default(""),
  price: z.number().positive(),
  image: z.string().nullable().optional(),
  badges: z.record(z.string(), z.string()).nullable().optional(),
});

export const updateMenuItemSchema = z.object({
  categoryId: z.string().uuid().optional(),
  nameTr: z.string().min(1).optional(),
  nameEn: z.string().min(1).optional(),
  descriptionTr: z.string().optional(),
  descriptionEn: z.string().optional(),
  price: z.number().positive().optional(),
  image: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  badges: z.record(z.string(), z.string()).nullable().optional(),
});

export const reorderMenuItemsSchema = z.array(
  z.object({ id: z.string().uuid(), sortOrder: z.number().int() })
);
