import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { paymentsController } from "./payments.controller";
import { initiatePaymentSchema } from "./payments.validation";

const router = Router();

router.post(
	"/initiate",
	auth(Role.CUSTOMER),
	validateRequest(initiatePaymentSchema),
	paymentsController.initiate,
);
router.all("/bkash/callback", paymentsController.callback);
router.get("/:id", auth(), paymentsController.getById);

export default router;
