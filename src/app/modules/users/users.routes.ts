import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { usersController } from "./users.controller";
import { availabilitySchema, updateProfileSchema } from "./users.validation";

const router = Router();

router.get("/me", auth(), usersController.getProfile);
router.patch(
	"/me",
	auth(),
	validateRequest(updateProfileSchema),
	usersController.updateProfile,
);
router.get("/notifications", auth(), usersController.getNotifications);
router.patch(
	"/notifications/:id/read",
	auth(),
	usersController.markNotificationRead,
);
router.patch(
	"/courier/availability",
	auth(Role.COURIER),
	validateRequest(availabilitySchema),
	usersController.updateAvailability,
);

export default router;
