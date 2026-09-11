import { z } from "zod";

export const updateProfileSchema = z
	.object({
		name: z.string().trim().min(2).max(100).optional(),
		phone: z.string().trim().min(8).max(20).nullable().optional(),
	})
	.refine(
		(body) => Object.keys(body).length > 0,
		"Provide at least one field to update",
	);

export const availabilitySchema = z.object({
	availability: z.enum(["AVAILABLE", "BUSY", "OFFLINE"]),
});
