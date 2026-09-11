import httpStatus from "http-status";
import { getParam } from "../../utils/api";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { usersService } from "./users.service";

export const usersController = {
	getProfile: catchAsync(async (req, res) =>
		sendResponse(res, {
			success: true,
			statusCode: httpStatus.OK,
			message: "Profile retrieved successfully",
			data: await usersService.getProfile(req.user!.userId),
		}),
	),
	updateProfile: catchAsync(async (req, res) =>
		sendResponse(res, {
			success: true,
			statusCode: httpStatus.OK,
			message: "Profile updated successfully",
			data: await usersService.updateProfile(req.user!.userId, req.body),
		}),
	),
	getNotifications: catchAsync(async (req, res) =>
		sendResponse(res, {
			success: true,
			statusCode: httpStatus.OK,
			message: "Notifications retrieved successfully",
			data: await usersService.getNotifications(req.user!.userId),
		}),
	),
	markNotificationRead: catchAsync(async (req, res) => {
		await usersService.markNotificationRead(
			getParam(req.params.id),
			req.user!.userId,
		);
		sendResponse(res, {
			success: true,
			statusCode: httpStatus.OK,
			message: "Notification marked as read",
			data: null,
		});
	}),
	updateAvailability: catchAsync(async (req, res) =>
		sendResponse(res, {
			success: true,
			statusCode: httpStatus.OK,
			message: "Courier availability updated",
			data: await usersService.updateAvailability(
				req.user!.userId,
				req.body.availability,
			),
		}),
	),
};

export default usersController;
