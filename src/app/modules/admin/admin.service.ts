import bcrypt from "bcryptjs";
import httpStatus from "http-status";
import { Role } from "../../../generated/prisma/enums";
import config from "../../config";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { publicUserSelect } from "../../utils/api";

export const adminService = {
	async dashboard() {
		const [users, shipments, delivered, pendingPayments, revenue] =
			await prisma.$transaction([
				prisma.user.count({ where: { deletedAt: null } }),
				prisma.shipment.count({ where: { deletedAt: null } }),
				prisma.shipment.count({
					where: { status: "DELIVERED", deletedAt: null },
				}),
				prisma.payment.count({ where: { status: "PENDING" } }),
				prisma.payment.aggregate({
					where: { status: "PAID" },
					_sum: { amount: true },
				}),
			]);
		return {
			users,
			shipments,
			delivered,
			pendingPayments,
			paidRevenue: Number(revenue._sum.amount || 0),
		};
	},
	async listUsers(
		page: number,
		limit: number,
		skip: number,
		role?: Role,
		search?: string,
	) {
		const where = {
			deletedAt: null,
			...(role ? { role } : {}),
			...(search
				? {
						OR: [
							{ name: { contains: search, mode: "insensitive" as const } },
							{ email: { contains: search, mode: "insensitive" as const } },
						],
					}
				: {}),
		};
		const [total, users] = await prisma.$transaction([
			prisma.user.count({ where }),
			prisma.user.findMany({
				where,
				select: { ...publicUserSelect, courierProfile: true },
				skip,
				take: limit,
				orderBy: { createdAt: "desc" },
			}),
		]);
		return {
			users,
			meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
		};
	},
	async createCourier(data: {
		name: string;
		email: string;
		password: string;
		phone?: string;
		vehicleType: "BICYCLE" | "BIKE" | "VAN" | "TRUCK";
		currentHubId?: string;
		licenseNumber?: string;
	}) {
		if (await prisma.user.findUnique({ where: { email: data.email } }))
			throw new AppError(
				httpStatus.CONFLICT,
				"An account with this email already exists",
			);
		const password = await bcrypt.hash(
			data.password,
			Number(config.bcrypt_salt_rounds) || 12,
		);
		return prisma.$transaction(async (tx) => {
			const user = await tx.user.create({
				data: {
					name: data.name,
					email: data.email,
					password,
					phone: data.phone,
					role: "COURIER",
					isVerified: true,
				},
			});
			return tx.courierProfile.create({
				data: {
					userId: user.id,
					vehicleType: data.vehicleType,
					currentHubId: data.currentHubId,
					licenseNumber: data.licenseNumber,
					availability: "AVAILABLE",
				},
				include: { user: { select: publicUserSelect } },
			});
		});
	},
	async updateRole(id: string, role: Role, actorId: string) {
		if (id === actorId)
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"You cannot change your own role",
			);
		const existing = await prisma.user.findFirst({
			where: { id, deletedAt: null },
		});
		if (!existing) throw new AppError(httpStatus.NOT_FOUND, "User not found");
		const user = await prisma.user.update({
			where: { id },
			data: { role },
			select: publicUserSelect,
		});
		await prisma.auditLog.create({
			data: {
				userId: actorId,
				action: "USER_ROLE_CHANGED",
				entityType: "User",
				entityId: id,
				metadata: { role },
			},
		});
		return user;
	},
	async deleteUser(id: string, actorId: string) {
		if (id === actorId)
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"You cannot delete your own account",
			);
		const result = await prisma.user.updateMany({
			where: { id, deletedAt: null },
			data: { deletedAt: new Date() },
		});
		if (!result.count)
			throw new AppError(httpStatus.NOT_FOUND, "User not found");
	},
	async auditLogs(page: number, limit: number, skip: number) {
		const [total, logs] = await prisma.$transaction([
			prisma.auditLog.count(),
			prisma.auditLog.findMany({
				skip,
				take: limit,
				orderBy: { createdAt: "desc" },
				include: { user: { select: { name: true, email: true } } },
			}),
		]);
		return {
			logs,
			meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
		};
	},
};
