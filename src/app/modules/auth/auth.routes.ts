import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { authController } from "./auth.controller";
import {
	googleLoginSchema,
	loginSchema,
	refreshTokenSchema,
	registerSchema,
} from "./auth.validation";

const router = Router();

router.post(
	"/register",
	validateRequest(registerSchema),
	authController.register,
);
router.post("/login", validateRequest(loginSchema), authController.login);
router.post(
	"/google",
	validateRequest(googleLoginSchema),
	authController.google,
);
router.post(
	"/refresh-token",
	validateRequest(refreshTokenSchema),
	authController.refresh,
);
router.post(
	"/logout",
	auth(Role.ADMIN, Role.CUSTOMER, Role.COURIER),
	authController.logout,
);

export default router;
