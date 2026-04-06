import { z } from "zod";

export const createBusinessSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  template: z.enum(["CAFE", "RESTAURANT", "PUB", "CUSTOM"]).default("CUSTOM"),
  ownerId: z.string().uuid(),
});

export const updateBusinessSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
  template: z.enum(["CAFE", "RESTAURANT", "PUB", "CUSTOM"]).optional(),
  isActive: z.boolean().optional(),
});
