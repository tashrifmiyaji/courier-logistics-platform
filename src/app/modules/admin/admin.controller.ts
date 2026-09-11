import httpStatus from "http-status";
import { Role } from "../../../generated/prisma/enums";
import { getPagination, getParam } from "../../utils/api";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { adminService } from "./admin.service";

export const adminController = {
	dashboard: catchAsync(async (_req, res) =>
		sendResponse(res, {
			success: true,
			statusCode: httpStatus.OK,
			message: "Dashboard statistics retrieved",
			data: await adminService.dashboard(),
		}),
	),
	listUsers: catchAsync(async (req, res) => {
		const pagination = getPagination(req);
		const role =
			typeof req.query.role === "string" &&
			Object.values(Role).includes(req.query.role as Role)
				? (req.query.role as Role)
				: undefined;
		const search =
			typeof req.query.search === "string" ? req.query.search : undefined;
		const result = await adminService.listUsers(
			pagination.page,
			pagination.limit,
			pagination.skip,
			role,
			search,
		);
		sendResponse(res, {
			success: true,
			statusCode: httpStatus.OK,
			message: "Users retrieved successfully",
			data: result.users,
			meta: result.meta,
		});
	}),
	createCourier: catchAsync(async (req, res) =>
		sendResponse(res, {
			success: true,
			statusCode: httpStatus.CREATED,
			message: "Courier created successfully",
			data: await adminService.createCourier(req.body),
		}),
	),
	updateRole: catchAsync(async (req, res) =>
		sendResponse(res, {
			success: true,
			statusCode: httpStatus.OK,
			message: "User role updated successfully",
			data: await adminService.updateRole(
				getParam(req.params.id),
				req.body.role,
				req.user!.userId,
			),
		}),
	),
	deleteUser: catchAsync(async (req, res) => {
		await adminService.deleteUser(getParam(req.params.id), req.user!.userId);
		sendResponse(res, {
			success: true,
			statusCode: httpStatus.OK,
			message: "User deleted successfully",
			data: null,
		});
	}),
	auditLogs: catchAsync(async (req, res) => {
		const pagination = getPagination(req);
		const result = await adminService.auditLogs(
			pagination.page,
			pagination.limit,
			pagination.skip,
		);
		sendResponse(res, {
			success: true,
			statusCode: httpStatus.OK,
			message: "Audit logs retrieved successfully",
			data: result.logs,
			meta: result.meta,
		});
	}),
};

export default adminController;
