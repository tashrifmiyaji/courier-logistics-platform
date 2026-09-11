import httpStatus from "http-status";
import {
	NotificationType,
	PaymentProvider,
	Role,
} from "../../../generated/prisma/enums";
import config from "../../config";
import { getBkashIdToken } from "../../lib/bkash";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

const bkashUrl = (path: string) =>
	`${config.bkash_base_url.replace(/\/$/, "")}${path}`;

export const paymentsService = {
	async initiate(shipmentId: string, userId: string, payerReference?: string) {
		const shipment = await prisma.shipment.findFirst({
			where: { id: shipmentId, customerId: userId, deletedAt: null },
		});
		if (!shipment)
			throw new AppError(httpStatus.NOT_FOUND, "Shipment not found");
		const existing = await prisma.payment.findFirst({
			where: { shipmentId, status: { in: ["PAID", "PENDING"] } },
		});
		if (existing?.status === "PAID")
			throw new AppError(httpStatus.CONFLICT, "This shipment is already paid");
		if (existing?.status === "PENDING")
			throw new AppError(
				httpStatus.CONFLICT,
				"A payment session is already pending",
			);
		const payment = await prisma.payment.create({
			data: {
				shipmentId,
				amount: shipment.deliveryCharge,
				provider: PaymentProvider.BKASH,
			},
		});
		const idToken = await getBkashIdToken();
		const response = await fetch(bkashUrl("/tokenized/checkout/create"), {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				authorization: idToken || "",
				"X-App-Key": config.bkash_app_key,
			},
			body: JSON.stringify({
				mode: "0011",
				payerReference,
				callbackURL: `${config.bkash_callback_url}?paymentId=${payment.id}`,
				amount: String(shipment.deliveryCharge),
				currency: "BDT",
				intent: "sale",
				merchantInvoiceNumber: payment.id,
			}),
		});
		const result = (await response.json()) as {
			statusCode?: string;
			statusMessage?: string;
			paymentID?: string;
			bkashURL?: string;
		};
		if (
			!response.ok ||
			result.statusCode !== "0000" ||
			!result.paymentID ||
			!result.bkashURL
		) {
			await prisma.payment.update({
				where: { id: payment.id },
				data: { status: "FAILED" },
			});
			throw new AppError(
				httpStatus.BAD_GATEWAY,
				result.statusMessage || "Could not create bKash payment",
			);
		}
		await prisma.payment.update({
			where: { id: payment.id },
			data: { transactionId: result.paymentID },
		});
		return { paymentId: payment.id, paymentURL: result.bkashURL };
	},
	async callback(
		paymentId: string,
		bkashPaymentId: string,
		status: string | undefined,
	) {
		const payment = await prisma.payment.findUnique({
			where: { id: paymentId },
			include: { shipment: true },
		});
		if (payment?.provider !== PaymentProvider.BKASH)
			throw new AppError(httpStatus.NOT_FOUND, "Payment not found");
		if (payment.status === "PAID") return payment;
		if (status?.toLowerCase() === "cancel")
			return prisma.payment.update({
				where: { id: paymentId },
				data: { status: "FAILED" },
			});
		if (payment.transactionId && payment.transactionId !== bkashPaymentId)
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"Payment transaction does not match",
			);
		const idToken = await getBkashIdToken();
		const response = await fetch(bkashUrl("/tokenized/checkout/execute"), {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				authorization: idToken || "",
				"X-App-Key": config.bkash_app_key,
			},
			body: JSON.stringify({ paymentID: bkashPaymentId }),
		});
		const result = (await response.json()) as {
			statusCode?: string;
			statusMessage?: string;
			trxID?: string;
			amount?: string;
		};
		if (!response.ok || result.statusCode !== "0000")
			throw new AppError(
				httpStatus.BAD_GATEWAY,
				result.statusMessage || "bKash payment verification failed",
			);
		if (Number(result.amount) !== Number(payment.amount))
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"bKash amount does not match payment amount",
			);
		return prisma.$transaction(async (tx) => {
			const updated = await tx.payment.update({
				where: { id: paymentId },
				data: {
					status: "PAID",
					transactionId: result.trxID || payment.transactionId,
					paidAt: new Date(),
				},
			});
			await tx.notification.create({
				data: {
					userId: payment.shipment.customerId,
					type: NotificationType.PAYMENT_CONFIRMATION,
					title: "Payment confirmed",
					message: `Payment for ${payment.shipment.trackingCode} has been confirmed.`,
				},
			});
			return updated;
		});
	},
	getById: async (id: string, userId: string, role: Role) => {
		const payment = await prisma.payment.findUnique({
			where: { id },
			include: { shipment: true },
		});
		if (!payment) throw new AppError(httpStatus.NOT_FOUND, "Payment not found");
		if (role !== Role.ADMIN && payment.shipment.customerId !== userId)
			throw new AppError(
				httpStatus.FORBIDDEN,
				"You cannot access this payment",
			);
		return payment;
	},
};
