import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { shipmentsController } from "./shipments.controller";
import {
	assignCourierSchema,
	createShipmentSchema,
	transferShipmentSchema,
	updateShipmentStatusSchema,
} from "./shipments.validation";

const router = Router();

router.get("/track/:trackingCode", shipmentsController.track);
router.post(
	"/",
	auth(Role.CUSTOMER),
	validateRequest(createShipmentSchema),
	shipmentsController.create,
);
router.get("/", auth(), shipmentsController.list);
router.get("/:id", auth(), shipmentsController.getById);
router.patch("/:id/cancel", auth(Role.CUSTOMER), shipmentsController.cancel);
router.post(
	"/:id/assign",
	auth(Role.ADMIN),
	validateRequest(assignCourierSchema),
	shipmentsController.assign,
);
router.patch(
	"/:id/status",
	auth(Role.ADMIN, Role.COURIER),
	validateRequest(updateShipmentStatusSchema),
	shipmentsController.updateStatus,
);
router.post(
	"/:id/transfers",
	auth(Role.ADMIN),
	validateRequest(transferShipmentSchema),
	shipmentsController.transfer,
);

export default router;
