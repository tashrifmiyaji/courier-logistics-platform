import httpStatus from "http-status";
import { getParam } from "../../utils/api";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { operationsService } from "./operations.service";

export const operationsController = {
	listZones: catchAsync(async (_req, res) =>
		sendResponse(res, {
			success: true,
			statusCode: httpStatus.OK,
			message: "Zones retrieved successfully",
			data: await operationsService.listZones(),
		}),
	),
	createZone: catchAsync(async (req, res) =>
		sendResponse(res, {
			success: true,
			statusCode: httpStatus.CREATED,
			message: "Zone created successfully",
			data: await operationsService.createZone(req.body),
		}),
	),
	listHubs: catchAsync(async (req, res) =>
		sendResponse(res, {
			success: true,
			statusCode: httpStatus.OK,
			message: "Hubs retrieved successfully",
			data: await operationsService.listHubs(
				typeof req.query.zoneId === "string" ? req.query.zoneId : undefined,
				req.query.active === "true",
			),
		}),
	),
	createHub: catchAsync(async (req, res) =>
		sendResponse(res, {
			success: true,
			statusCode: httpStatus.CREATED,
			message: "Hub created successfully",
			data: await operationsService.createHub(req.body),
		}),
	),
	updateHub: catchAsync(async (req, res) =>
		sendResponse(res, {
			success: true,
			statusCode: httpStatus.OK,
			message: "Hub updated successfully",
			data: await operationsService.updateHub(
				getParam(req.params.id),
				req.body,
			),
		}),
	),
	deleteHub: catchAsync(async (req, res) => {
		await operationsService.deleteHub(getParam(req.params.id));
		sendResponse(res, {
			success: true,
			statusCode: httpStatus.OK,
			message: "Hub deleted successfully",
			data: null,
		});
	}),
	calculatePrice: catchAsync(async (req, res) =>
		sendResponse(res, {
			success: true,
			statusCode: httpStatus.OK,
			message: "Delivery charge calculated",
			data: await operationsService.calculatePrice(req.body),
		}),
	),
	savePricing: catchAsync(async (req, res) =>
		sendResponse(res, {
			success: true,
			statusCode: httpStatus.OK,
			message: "Pricing rule saved successfully",
			data: await operationsService.savePricing(req.body),
		}),
	),
};

export default operationsController;
