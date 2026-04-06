import { z } from "zod";

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const updateThemeSchema = z.object({
  primaryColor: hexColor.optional(),
  accentColor: hexColor.optional(),
  bgColor: hexColor.optional(),
  cardBgColor: hexColor.optional(),
  textColor: hexColor.optional(),
  mutedTextColor: hexColor.optional(),
  borderColor: hexColor.optional(),
  fontHeading: z.string().optional(),
  fontBody: z.string().optional(),
  layoutType: z.enum(["FULLCARD", "LIST", "GRID", "HYBRID"]).optional(),
  heroImage: z.string().nullable().optional(),
  logo: z.string().nullable().optional(),
  customCSS: z.string().nullable().optional(),
});
