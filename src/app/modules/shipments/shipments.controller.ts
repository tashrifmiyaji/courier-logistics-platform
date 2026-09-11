import httpStatus from "http-status";
import { ShipmentStatus } from "../../../generated/prisma/enums";
import { getPagination, getParam } from "../../utils/api";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { shipmentsService } from "./shipments.service";

export const shipmentsController = {
	track: catchAsync(async (req, res) => {
		const data = await shipmentsService.track(
			getParam(req.params.trackingCode),
		);
		sendResponse(res, {
			success: true,
			statusCode: httpStatus.OK,
			message: "Tracking information retrieved",
			data,
		});
	}),
	create: catchAsync(async (req, res) => {
		const data = await shipmentsService.create(req.body, req.user!);
		sendResponse(res, {
			success: true,
			statusCode: httpStatus.CREATED,
			message: "Shipment created successfully",
			data,
		});
	}),
	list: catchAsync(async (req, res) => {
		const pagination = getPagination(req);
		const status =
			typeof req.query.status === "string" &&
			Object.values(ShipmentStatus).includes(req.query.status as ShipmentStatus)
				? (req.query.status as ShipmentStatus)
				: undefined;
		const search =
			typeof req.query.search === "string"
				? req.query.search.trim()
				: undefined;
		const result = await shipmentsService.list(req.user!, {
			...pagination,
			status,
			search,
		});
		sendResponse(res, {
			success: true,
			statusCode: httpStatus.OK,
			message: "Shipments retrieved successfully",
			data: result.shipments,
			meta: result.meta,
		});
	}),
	getById: catchAsync(async (req, res) => {
		const data = await shipmentsService.getById(
			getParam(req.params.id),
			req.user!,
		);
		sendResponse(res, {
			success: true,
			statusCode: httpStatus.OK,
			message: "Shipment retrieved successfully",
			data,
		});
	}),
	cancel: catchAsync(async (req, res) => {
		const data = await shipmentsService.cancel(
			getParam(req.params.id),
			req.user!,
		);
		sendResponse(res, {
			success: true,
			statusCode: httpStatus.OK,
			message: "Shipment cancelled successfully",
			data,
		});
	}),
	assign: catchAsync(async (req, res) => {
		const data = await shipmentsService.assign(
			getParam(req.params.id),
			req.body.courierId,
			req.user!,
		);
		sendResponse(res, {
			success: true,
			statusCode: httpStatus.OK,
			message: "Courier assigned successfully",
			data,
		});
	}),
	updateStatus: catchAsync(async (req, res) => {
		const data = await shipmentsService.updateStatus(
			getParam(req.params.id),
			req.body.status,
			req.body.note,
			req.body.location,
			req.user!,
		);
		sendResponse(res, {
			success: true,
			statusCode: httpStatus.OK,
			message: "Shipment status updated",
			data,
		});
	}),
	transfer: catchAsync(async (req, res) => {
		const data = await shipmentsService.transfer(
			getParam(req.params.id),
			req.body,
			req.user!,
		);
		sendResponse(res, {
			success: true,
			statusCode: httpStatus.CREATED,
			message: "Hub transfer dispatched",
			data,
		});
	}),
};
