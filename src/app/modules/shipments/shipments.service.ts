import httpStatus from "http-status";
import {
	NotificationType,
	Role,
	ShipmentStatus,
} from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type { RequestUser } from "../../middleware/checkAuth";

const transitionMap: Partial<Record<ShipmentStatus, ShipmentStatus[]>> = {
	PENDING: ["PICKUP_SCHEDULED", "CANCELLED"],
	PICKUP_SCHEDULED: ["PICKED_UP", "CANCELLED"],
	PICKED_UP: ["AT_ORIGIN_HUB"],
	AT_ORIGIN_HUB: ["IN_TRANSIT"],
	IN_TRANSIT: ["AT_DESTINATION_HUB"],
	AT_DESTINATION_HUB: ["OUT_FOR_DELIVERY"],
	OUT_FOR_DELIVERY: ["DELIVERED", "FAILED_DELIVERY"],
	FAILED_DELIVERY: ["RETURNED"],
};

const includeDetails = {
	courier: {
		include: { user: { select: { id: true, name: true, phone: true } } },
	},
	pickupHub: true,
	deliveryHub: true,
	trackingEvents: { orderBy: { createdAt: "asc" as const } },
	payments: true,
} as const;

const trackingCode = () =>
	`CLP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

export const shipmentsService = {
	async track(code: string) {
		const shipment = await prisma.shipment.findFirst({
			where: { trackingCode: code.toUpperCase(), deletedAt: null },
			select: {
				trackingCode: true,
				status: true,
				senderName: true,
				receiverName: true,
				createdAt: true,
				deliveredAt: true,
				trackingEvents: {
					select: { status: true, note: true, location: true, createdAt: true },
					orderBy: { createdAt: "asc" },
				},
			},
		});
		if (!shipment)
			throw new AppError(httpStatus.NOT_FOUND, "Shipment not found");
		return shipment;
	},

	async create(data: Record<string, unknown>, user: RequestUser) {
		const [pickupHub, deliveryHub] = await Promise.all([
			prisma.hub.findFirst({
				where: {
					id: data.pickupHubId as string,
					isActive: true,
					deletedAt: null,
				},
			}),
			prisma.hub.findFirst({
				where: {
					id: data.deliveryHubId as string,
					isActive: true,
					deletedAt: null,
				},
			}),
		]);
		if (!pickupHub || !deliveryHub || !pickupHub.zoneId || !deliveryHub.zoneId)
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"Both active hubs must belong to a zone",
			);
		const rule = await prisma.pricingRule.findUnique({
			where: {
				fromZoneId_toZoneId: {
					fromZoneId: pickupHub.zoneId,
					toZoneId: deliveryHub.zoneId,
				},
			},
		});
		if (!rule)
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"No delivery pricing rule exists for this route",
			);
		const deliveryCharge =
			Number(rule.baseFare) + Number(rule.perKgRate) * Number(data.weightKg);
		return prisma.$transaction(async (tx) => {
			const status = data.scheduledPickupAt
				? ShipmentStatus.PICKUP_SCHEDULED
				: ShipmentStatus.PENDING;
			const created = await tx.shipment.create({
				data: {
					...data,
					customerId: user.userId,
					trackingCode: trackingCode(),
					deliveryCharge,
					status,
				} as never,
			});
			await tx.trackingEvent.create({
				data: {
					shipmentId: created.id,
					status,
					note:
						status === ShipmentStatus.PENDING
							? "Shipment created"
							: "Pickup scheduled",
					location: pickupHub.name,
				},
			});
			await tx.notification.create({
				data: {
					userId: user.userId,
					type: NotificationType.SHIPMENT_CREATED,
					title: "Shipment created",
					message: `Your tracking code is ${created.trackingCode}`,
				},
			});
			await tx.auditLog.create({
				data: {
					userId: user.userId,
					action: "SHIPMENT_CREATED",
					entityType: "Shipment",
					entityId: created.id,
				},
			});
			return created;
		});
	},

	async list(
		user: RequestUser,
		query: {
			page: number;
			limit: number;
			skip: number;
			status?: ShipmentStatus;
			search?: string;
		},
	) {
		const where: Record<string, unknown> = {
			deletedAt: null,
			...(query.status ? { status: query.status } : {}),
			...(query.search
				? {
						OR: [
							{ trackingCode: { contains: query.search, mode: "insensitive" } },
							{ senderName: { contains: query.search, mode: "insensitive" } },
							{ receiverName: { contains: query.search, mode: "insensitive" } },
						],
					}
				: {}),
		};
		if (user.role === Role.CUSTOMER) where.customerId = user.userId;
		if (user.role === Role.COURIER) {
			const profile = await prisma.courierProfile.findUnique({
				where: { userId: user.userId },
			});
			where.courierId = profile?.id || "__none__";
		}
		const [total, shipments] = await prisma.$transaction([
			prisma.shipment.count({ where: where as never }),
			prisma.shipment.findMany({
				where: where as never,
				skip: query.skip,
				take: query.limit,
				orderBy: { createdAt: "desc" },
				include: {
					pickupHub: true,
					deliveryHub: true,
					courier: {
						include: { user: { select: { name: true, phone: true } } },
					},
				},
			}),
		]);
		return {
			shipments,
			meta: {
				page: query.page,
				limit: query.limit,
				total,
				totalPages: Math.ceil(total / query.limit),
			},
		};
	},

	async getById(id: string, user: RequestUser) {
		const shipment = await prisma.shipment.findFirst({
			where: { id, deletedAt: null },
			include: includeDetails,
		});
		if (!shipment)
			throw new AppError(httpStatus.NOT_FOUND, "Shipment not found");
		const owner = shipment.customerId === user.userId;
		const assigned = shipment.courier?.userId === user.userId;
		if (user.role !== Role.ADMIN && !owner && !assigned)
			throw new AppError(
				httpStatus.FORBIDDEN,
				"You cannot access this shipment",
			);
		return shipment;
	},

	async cancel(id: string, user: RequestUser) {
		const shipment = await prisma.shipment.findFirst({
			where: { id, customerId: user.userId, deletedAt: null },
		});
		if (!shipment)
			throw new AppError(httpStatus.NOT_FOUND, "Shipment not found");
		if (
			!(
				[
					ShipmentStatus.PENDING,
					ShipmentStatus.PICKUP_SCHEDULED,
				] as ShipmentStatus[]
			).includes(shipment.status)
		)
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"This shipment can no longer be cancelled",
			);
		return prisma.$transaction(async (tx) => {
			const item = await tx.shipment.update({
				where: { id },
				data: { status: ShipmentStatus.CANCELLED },
			});
			await tx.trackingEvent.create({
				data: {
					shipmentId: id,
					status: ShipmentStatus.CANCELLED,
					note: "Cancelled by customer",
				},
			});
			return item;
		});
	},

	async assign(id: string, courierId: string, user: RequestUser) {
		const [shipment, courier] = await Promise.all([
			prisma.shipment.findFirst({ where: { id, deletedAt: null } }),
			prisma.courierProfile.findFirst({
				where: {
					id: courierId,
					deletedAt: null,
					availability: "AVAILABLE",
					user: { deletedAt: null, isVerified: true },
				},
				include: { user: true },
			}),
		]);
		if (!shipment)
			throw new AppError(httpStatus.NOT_FOUND, "Shipment not found");
		if (!courier)
			throw new AppError(httpStatus.BAD_REQUEST, "Courier is not available");
		if (shipment.courierId)
			throw new AppError(
				httpStatus.CONFLICT,
				"Shipment already has a courier assigned",
			);
		if (
			!(
				[
					ShipmentStatus.PENDING,
					ShipmentStatus.PICKUP_SCHEDULED,
				] as ShipmentStatus[]
			).includes(shipment.status)
		)
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"Shipment cannot be assigned in its current status",
			);
		return prisma.$transaction(async (tx) => {
			const item = await tx.shipment.update({
				where: { id },
				data: { courierId: courier.id },
			});
			await tx.courierProfile.update({
				where: { id: courier.id },
				data: { availability: "BUSY" },
			});
			await tx.notification.create({
				data: {
					userId: courier.userId,
					type: NotificationType.ASSIGNMENT,
					title: "New shipment assigned",
					message: `Shipment ${shipment.trackingCode} was assigned to you.`,
				},
			});
			await tx.auditLog.create({
				data: {
					userId: user.userId,
					action: "COURIER_ASSIGNED",
					entityType: "Shipment",
					entityId: id,
					metadata: { courierId },
				},
			});
			return item;
		});
	},

	async updateStatus(
		id: string,
		status: ShipmentStatus,
		note: string | undefined,
		location: string | undefined,
		user: RequestUser,
	) {
		const shipment = await prisma.shipment.findFirst({
			where: { id, deletedAt: null },
			include: { courier: true },
		});
		if (!shipment)
			throw new AppError(httpStatus.NOT_FOUND, "Shipment not found");
		if (user.role === Role.COURIER && shipment.courier?.userId !== user.userId)
			throw new AppError(
				httpStatus.FORBIDDEN,
				"This shipment is not assigned to you",
			);
		if (!transitionMap[shipment.status]?.includes(status))
			throw new AppError(
				httpStatus.BAD_REQUEST,
				`Invalid transition from ${shipment.status} to ${status}`,
			);
		return prisma.$transaction(async (tx) => {
			const item = await tx.shipment.update({
				where: { id },
				data: {
					status,
					...(status === ShipmentStatus.DELIVERED
						? { deliveredAt: new Date() }
						: {}),
				},
			});
			await tx.trackingEvent.create({
				data: { shipmentId: id, status, note, location },
			});
			await tx.notification.create({
				data: {
					userId: shipment.customerId,
					type: NotificationType.STATUS_UPDATE,
					title: "Shipment status updated",
					message: `${shipment.trackingCode} is now ${status.replaceAll("_", " ")}.`,
				},
			});
			await tx.auditLog.create({
				data: {
					userId: user.userId,
					action: "SHIPMENT_STATUS_CHANGED",
					entityType: "Shipment",
					entityId: id,
					metadata: { from: shipment.status, to: status },
				},
			});
			if (status === ShipmentStatus.DELIVERED && shipment.courierId) {
				const earning = Number(shipment.deliveryCharge) * 0.7;
				await tx.courierEarning.create({
					data: {
						courierId: shipment.courierId,
						shipmentId: id,
						amount: earning,
						type: "delivery_fee",
					},
				});
				await tx.courierProfile.update({
					where: { id: shipment.courierId },
					data: {
						availability: "AVAILABLE",
						totalDeliveries: { increment: 1 },
						earningsBalance: { increment: earning },
					},
				});
			}
			return item;
		});
	},

	async transfer(
		id: string,
		data: { fromHubId: string; toHubId: string },
		user: RequestUser,
	) {
		const shipment = await prisma.shipment.findFirst({
			where: { id, deletedAt: null },
		});
		if (!shipment)
			throw new AppError(httpStatus.NOT_FOUND, "Shipment not found");
		if (shipment.status !== ShipmentStatus.AT_ORIGIN_HUB)
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"Shipment must be at an origin hub before transfer",
			);
		if (shipment.pickupHubId !== data.fromHubId)
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"Transfer source must match the shipment origin hub",
			);
		const hubs = await prisma.hub.findMany({
			where: {
				id: { in: [data.fromHubId, data.toHubId] },
				deletedAt: null,
				isActive: true,
			},
		});
		if (hubs.length !== 2)
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"Both transfer hubs must be active",
			);
		return prisma.$transaction(async (tx) => {
			const created = await tx.hubTransfer.create({
				data: { shipmentId: id, ...data, dispatchedAt: new Date() },
			});
			await tx.shipment.update({
				where: { id },
				data: { status: ShipmentStatus.IN_TRANSIT },
			});
			await tx.trackingEvent.create({
				data: {
					shipmentId: id,
					status: ShipmentStatus.IN_TRANSIT,
					note: "Dispatched for hub transfer",
				},
			});
			await tx.auditLog.create({
				data: {
					userId: user.userId,
					action: "HUB_TRANSFER_DISPATCHED",
					entityType: "Shipment",
					entityId: id,
					metadata: data,
				},
			});
			return created;
		});
	},
};
