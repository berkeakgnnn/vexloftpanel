import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(6),
});

export const refreshSchema = z.object({
  refreshToken: z.string(),
});
