import { z } from "zod";
import { ShipmentStatus } from "../../../generated/prisma/enums";

export const createShipmentSchema = z
	.object({
		senderName: z.string().trim().min(2),
		senderPhone: z.string().trim().min(8).max(20),
		pickupAddress: z.string().trim().min(5),
		pickupHubId: z.string().uuid(),
		receiverName: z.string().trim().min(2),
		receiverPhone: z.string().trim().min(8).max(20),
		deliveryAddress: z.string().trim().min(5),
		deliveryHubId: z.string().uuid(),
		weightKg: z.coerce.number().positive().max(999),
		parcelType: z.string().trim().max(100).optional(),
		codAmount: z.coerce.number().nonnegative().optional(),
		scheduledPickupAt: z.coerce.date().optional(),
	})
	.refine(
		(body) => body.pickupHubId !== body.deliveryHubId,
		"Pickup and delivery hubs must be different",
	);

export const assignCourierSchema = z.object({ courierId: z.string().uuid() });
export const updateShipmentStatusSchema = z.object({
	status: z.enum(Object.values(ShipmentStatus) as [string, ...string[]]),
	note: z.string().trim().max(500).optional(),
	location: z.string().trim().max(200).optional(),
});
export const transferShipmentSchema = z
	.object({ fromHubId: z.string().uuid(), toHubId: z.string().uuid() })
	.refine(
		(body) => body.fromHubId !== body.toHubId,
		"Source and destination hubs must differ",
	);
