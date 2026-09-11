import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { operationsController } from "./operations.controller";
import {
	calculatePriceSchema,
	hubSchema,
	pricingRuleSchema,
	zoneSchema,
} from "./operations.validation";

const router = Router();

router.get("/zones", operationsController.listZones);
router.post(
	"/zones",
	auth(Role.ADMIN),
	validateRequest(zoneSchema),
	operationsController.createZone,
);
router.get("/hubs", operationsController.listHubs);
router.post(
	"/hubs",
	auth(Role.ADMIN),
	validateRequest(hubSchema),
	operationsController.createHub,
);
router.patch(
	"/hubs/:id",
	auth(Role.ADMIN),
	validateRequest(
		hubSchema
			.partial()
			.refine(
				(body) => Object.keys(body).length > 0,
				"Provide at least one field to update",
			),
	),
	operationsController.updateHub,
);
router.delete("/hubs/:id", auth(Role.ADMIN), operationsController.deleteHub);
router.post(
	"/pricing/calculate",
	validateRequest(calculatePriceSchema),
	operationsController.calculatePrice,
);
router.put(
	"/pricing",
	auth(Role.ADMIN),
	validateRequest(pricingRuleSchema),
	operationsController.savePricing,
);

export default router;
