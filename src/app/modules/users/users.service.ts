import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { publicUserSelect } from "../../utils/api";

export const usersService = {
	getProfile: (userId: string) =>
		prisma.user.findUnique({
			where: { id: userId, deletedAt: null },
			select: { ...publicUserSelect, courierProfile: true },
		}),
	updateProfile: (
		userId: string,
		data: { name?: string; phone?: string | null },
	) =>
		prisma.user.update({
			where: { id: userId },
			data,
			select: publicUserSelect,
		}),
	getNotifications: (userId: string) =>
		prisma.notification.findMany({
			where: { userId },
			orderBy: { createdAt: "desc" },
		}),
	async markNotificationRead(id: string, userId: string) {
		const result = await prisma.notification.updateMany({
			where: { id, userId },
			data: { isRead: true },
		});
		if (!result.count)
			throw new AppError(httpStatus.NOT_FOUND, "Notification not found");
	},
	updateAvailability: (
		userId: string,
		availability: "AVAILABLE" | "BUSY" | "OFFLINE",
	) =>
		prisma.courierProfile.update({ where: { userId }, data: { availability } }),
};
