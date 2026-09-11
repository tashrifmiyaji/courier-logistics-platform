import { z } from "zod";

export const createCourierSchema = z.object({
	name: z.string().trim().min(2),
	email: z.string().email().toLowerCase(),
	password: z.string().min(8),
	phone: z.string().min(8).optional(),
	vehicleType: z.enum(["BICYCLE", "BIKE", "VAN", "TRUCK"]),
	currentHubId: z.string().uuid().optional(),
	licenseNumber: z.string().max(100).optional(),
});
export const updateUserRoleSchema = z.object({
	role: z.enum(["CUSTOMER", "COURIER", "ADMIN"]),
});
