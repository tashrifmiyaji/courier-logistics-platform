import httpStatus from "http-status";
import { z } from "zod";
import { getParam } from "../../utils/api";
import { catchAsync } from "../../utils/catchAsync";
import { AppError } from "../../utils/AppError";
import { sendResponse } from "../../utils/sendResponse";
import { paymentsService } from "./payments.service";

export const paymentsController = {
	initiate: catchAsync(async (req, res) => {
		const data = await paymentsService.initiate(
			req.body.shipmentId,
			req.user!.userId,
			req.user!.email,
		);
		sendResponse(res, {
			success: true,
			statusCode: httpStatus.CREATED,
			message: "bKash payment session created",
			data,
		});
	}),
	callback: catchAsync(async (req, res) => {
		const parsed = z
			.object({
				paymentId: z.string().uuid(),
				bkashPaymentId: z.string().min(1),
				status: z.string().optional(),
			})
			.safeParse({
				paymentId: req.body?.paymentId || req.query.paymentId,
				bkashPaymentId: req.body?.bkashPaymentId || req.query.paymentID,
				status: req.body?.status || req.query.status,
			});
		if (!parsed.success)
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"Invalid bKash callback data",
				"",
				parsed.error.issues.map((issue) => ({
					field: issue.path.join("."),
					message: issue.message,
				})),
			);
		const data = await paymentsService.callback(
			parsed.data.paymentId,
			parsed.data.bkashPaymentId,
			parsed.data.status,
		);
		sendResponse(res, {
			success: true,
			statusCode: httpStatus.OK,
			message: "bKash payment verified successfully",
			data,
		});
	}),
	getById: catchAsync(async (req, res) => {
		const data = await paymentsService.getById(
			getParam(req.params.id),
			req.user!.userId,
			req.user!.role,
		);
		sendResponse(res, {
			success: true,
			statusCode: httpStatus.OK,
			message: "Payment retrieved successfully",
			data,
		});
	}),
};

export default paymentsController;
