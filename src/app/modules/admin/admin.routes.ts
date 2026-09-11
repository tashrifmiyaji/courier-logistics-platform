import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { adminController } from "./admin.controller";
import { createCourierSchema, updateUserRoleSchema } from "./admin.validation";

const router = Router();
router.use(auth(Role.ADMIN));

router.get("/dashboard", adminController.dashboard);
router.get("/users", adminController.listUsers);
router.post(
	"/couriers",
	validateRequest(createCourierSchema),
	adminController.createCourier,
);
router.patch(
	"/users/:id/role",
	validateRequest(updateUserRoleSchema),
	adminController.updateRole,
);
router.delete("/users/:id", adminController.deleteUser);
router.get("/audit-logs", adminController.auditLogs);

export default router;
