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

async function reconcilePendingPayment(payment: {
	id: string;
	transactionId: string | null;
	amount: { toString(): string };
	shipment: { customerId: string; trackingCode: string };
}) {
	if (!payment.transactionId)
		throw new AppError(
			httpStatus.CONFLICT,
			"An earlier bKash attempt is unresolved. Contact support to verify its status before creating another payment.",
		);

	const idToken = await getBkashIdToken();
	if (!idToken)
		throw new AppError(
			httpStatus.SERVICE_UNAVAILABLE,
			"No bKash access token is available",
		);
	const response = await fetch(bkashUrl("/tokenized/checkout/payment/status"), {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
			authorization: idToken,
			"x-app-key": config.bkash_app_key,
		},
		body: JSON.stringify({ paymentID: payment.transactionId }),
	});
	const result = (await response.json()) as {
		statusCode?: string;
		statusMessage?: string;
		transactionStatus?: string;
		trxID?: string;
		amount?: string;
	};
	if (!response.ok || result.statusCode !== "0000")
		throw new AppError(
			httpStatus.BAD_GATEWAY,
			result.statusMessage || "Could not verify the previous bKash session",
		);

	const transactionStatus = result.transactionStatus?.toLowerCase();
	if (transactionStatus === "completed") {
		if (Number(result.amount) !== Number(payment.amount))
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"bKash amount does not match payment amount",
			);
		await prisma.$transaction(async (tx) => {
			const updated = await tx.payment.updateMany({
				where: { id: payment.id, status: "PENDING" },
				data: {
					status: "PAID",
					transactionId: result.trxID || payment.transactionId,
					paidAt: new Date(),
				},
			});
			if (updated.count)
				await tx.notification.create({
					data: {
						userId: payment.shipment.customerId,
						type: NotificationType.PAYMENT_CONFIRMATION,
						title: "Payment confirmed",
						message: `Payment for ${payment.shipment.trackingCode} has been confirmed.`,
					},
				});
		});
		return "PAID";
	}

	if (["cancelled", "declined", "failed"].includes(transactionStatus || "")) {
		await prisma.payment.updateMany({
			where: { id: payment.id, status: "PENDING" },
			data: { status: "FAILED" },
		});
		return "FAILED";
	}

	return "PENDING";
}

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
		if (existing?.status === "PENDING" && existing.checkoutUrl)
			return { paymentId: existing.id, paymentURL: existing.checkoutUrl };
		if (existing?.status === "PENDING") {
			const status = await reconcilePendingPayment({
				id: existing.id,
				transactionId: existing.transactionId,
				amount: existing.amount,
				shipment,
			});
			if (status === "PAID")
				throw new AppError(
					httpStatus.CONFLICT,
					"This shipment has already been paid",
				);
			if (status === "PENDING")
				throw new AppError(
					httpStatus.CONFLICT,
					"The previous bKash session is still active. Wait for bKash to finish processing before retrying; another payment cannot be started safely yet.",
				);
		}
		const payment = await prisma.payment.create({
			data: {
				shipmentId,
				amount: shipment.deliveryCharge,
				provider: PaymentProvider.BKASH,
			},
		});
		const idToken = await getBkashIdToken();
		if (!idToken) {
			await prisma.payment.update({
				where: { id: payment.id },
				data: { status: "FAILED" },
			});
			throw new AppError(
				httpStatus.INTERNAL_SERVER_ERROR,
				"No bKash access token is available",
			);
		}
		const response = await fetch(bkashUrl("/tokenized/checkout/create"), {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				authorization: idToken || "",
				"x-app-key": config.bkash_app_key,
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
			data: {
				transactionId: result.paymentID,
				checkoutUrl: result.bkashURL,
			},
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
		if (payment.transactionId && payment.transactionId !== bkashPaymentId)
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"Payment transaction does not match",
			);
		if (status && status.toLowerCase() !== "success")
			return prisma.payment.update({
				where: { id: paymentId },
				data: { status: "FAILED" },
			});
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
			transactionStatus?: string;
		};
		if (!response.ok || result.statusCode !== "0000")
			throw new AppError(
				httpStatus.BAD_GATEWAY,
				result.statusMessage || "bKash payment verification failed",
			);
		if (
			result.transactionStatus &&
			result.transactionStatus.toLowerCase() !== "completed"
		)
			return prisma.payment.update({
				where: { id: paymentId },
				data: { status: "FAILED" },
			});
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
