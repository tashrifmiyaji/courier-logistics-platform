import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { authService } from "./auth.service";

export const authController = {
	register: catchAsync(async (req, res) => {
		const data = await authService.register(req.body);
		sendResponse(res, {
			success: true,
			statusCode: httpStatus.CREATED,
			message: "Customer registered successfully",
			data,
		});
	}),
	login: catchAsync(async (req, res) => {
		const data = await authService.login(req.body.email, req.body.password);
		authService.setRefreshCookie(res, data.refreshToken);
		sendResponse(res, {
			success: true,
			statusCode: httpStatus.OK,
			message: "Logged in successfully",
			data,
		});
	}),
	google: catchAsync(async (req, res) => {
		const data = await authService.google(req.body.idToken);
		authService.setRefreshCookie(res, data.refreshToken);
		sendResponse(res, {
			success: true,
			statusCode: httpStatus.OK,
			message: "Google login successful",
			data,
		});
	}),
	refresh: catchAsync(async (req, res) => {
		const token = req.cookies.refreshToken || req.body.refreshToken;
		if (!token) throw new Error("Refresh token is required");
		const data = await authService.refresh(token);
		authService.setRefreshCookie(res, data.refreshToken);
		sendResponse(res, {
			success: true,
			statusCode: httpStatus.OK,
			message: "Access token refreshed",
			data,
		});
	}),
	logout: catchAsync(async (req, res) => {
		await authService.logout(
			req.cookies.refreshToken || req.body.refreshToken,
			req.user!.userId,
		);
		authService.clearRefreshCookie(res);
		sendResponse(res, {
			success: true,
			statusCode: httpStatus.OK,
			message: "Logged out successfully",
			data: null,
		});
	}),
};

export default authController;
