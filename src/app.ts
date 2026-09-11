import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import express, {
	type Application,
	type Request,
	type Response,
} from "express";
import httpStatus from "http-status";
import config from "./app/config";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";
import adminRoutes from "./app/modules/admin/admin.routes";
import authRoutes from "./app/modules/auth/auth.routes";
import operationsRoutes from "./app/modules/operations/operations.routes";
import paymentRoutes from "./app/modules/payments/payments.routes";
import shipmentRoutes from "./app/modules/shipments/shipments.routes";
import userRoutes from "./app/modules/users/users.routes";

const app: Application = express();

app.use(helmet());
app.use(
	rateLimit({
		windowMs: 15 * 60 * 1000,
		limit: 200,
		standardHeaders: "draft-8",
		legacyHeaders: false,
		message: {
			success: false,
			message: "Too many requests. Please try again later.",
			errors: [],
		},
	}),
);

app.use(
	cors({
		origin: config.frontend_url,
		credentials: true,
	}),
);

// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser());

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/shipments", shipmentRoutes);
app.use("/api/v1/operations", operationsRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/admin", adminRoutes);

// Basic route
app.get("/", async (req: Request, res: Response) => {
	res.status(httpStatus.OK).json({
		success: true,
		message: "Courier Logistics Platform.",
	});
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;
