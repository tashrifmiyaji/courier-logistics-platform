import { z } from "zod";

export const zoneSchema = z.object({ name: z.string().trim().min(2).max(100) });
export const hubSchema = z.object({
	name: z.string().trim().min(2),
	code: z.string().trim().min(2).max(30).toUpperCase(),
	zoneId: z.string().uuid().nullable().optional(),
	address: z.string().trim().min(5),
	city: z.string().trim().min(2),
	isActive: z.boolean().optional(),
});
export const calculatePriceSchema = z.object({
	fromHubId: z.string().uuid(),
	toHubId: z.string().uuid(),
	weightKg: z.coerce.number().positive(),
});
export const pricingRuleSchema = z.object({
	fromZoneId: z.string().uuid(),
	toZoneId: z.string().uuid(),
	baseFare: z.coerce.number().nonnegative(),
	perKgRate: z.coerce.number().nonnegative(),
});
