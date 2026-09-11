import { z } from "zod";

export const initiatePaymentSchema = z.object({
	shipmentId: z.string().uuid(),
	provider: z.literal("BKASH"),
});
export const bkashCallbackSchema = z.object({
	paymentId: z.string().uuid(),
	bkashPaymentId: z.string().min(1),
	status: z.string().optional(),
});
