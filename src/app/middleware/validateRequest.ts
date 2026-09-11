import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import z from "zod";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";

export const validateRequest = (zodSchema: z.ZodType) => {
	return catchAsync((req: Request, res: Response, next: NextFunction) => {
		// const payload = req.body ? req.body : {}
		const payload = req.body ?? {};

		const result = zodSchema.safeParse(payload);

		if (!result.success) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				result.error.issues[0]?.message || "Validation failed",
				"",
				result.error.issues.map((issue) => ({
					field: issue.path.join("."),
					message: issue.message,
				})),
			);
		}

		req.body = result.data;

		next();
	});
};
