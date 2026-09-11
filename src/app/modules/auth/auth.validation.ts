import { z } from "zod";

export const registerSchema = z.object({
	name: z.string().trim().min(2).max(100),
	email: z.string().trim().email().toLowerCase(),
	password: z.string().min(8).max(72),
	phone: z.string().trim().min(8).max(20).optional(),
});

export const loginSchema = z.object({
	email: z.string().email().toLowerCase(),
	password: z.string().min(1),
});

export const googleLoginSchema = z.object({ idToken: z.string().min(1) });
export const refreshTokenSchema = z.object({
	refreshToken: z.string().min(1).optional(),
});
