import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

export const operationsService = {
	listZones: () =>
		prisma.zone.findMany({
			include: { _count: { select: { hubs: true } } },
			orderBy: { name: "asc" },
		}),
	createZone: (data: { name: string }) => prisma.zone.create({ data }),
	listHubs: (zoneId?: string, active?: boolean) =>
		prisma.hub.findMany({
			where: {
				deletedAt: null,
				...(zoneId ? { zoneId } : {}),
				...(active ? { isActive: true } : {}),
			},
			include: { zone: true },
			orderBy: { name: "asc" },
		}),
	createHub: (data: Record<string, unknown>) =>
		prisma.hub.create({ data: data as never }),
	updateHub: (id: string, data: Record<string, unknown>) =>
		prisma.hub.update({ where: { id }, data: data as never }),
	async deleteHub(id: string) {
		const hub = await prisma.hub.findFirst({ where: { id, deletedAt: null } });
		if (!hub) throw new AppError(httpStatus.NOT_FOUND, "Hub not found");
		return prisma.hub.update({
			where: { id },
			data: { deletedAt: new Date(), isActive: false },
		});
	},
	async calculatePrice(data: {
		fromHubId: string;
		toHubId: string;
		weightKg: number;
	}) {
		const hubs = await prisma.hub.findMany({
			where: { id: { in: [data.fromHubId, data.toHubId] }, deletedAt: null },
			select: { id: true, zoneId: true },
		});
		const from = hubs.find((hub) => hub.id === data.fromHubId);
		const to = hubs.find((hub) => hub.id === data.toHubId);
		if (!from?.zoneId || !to?.zoneId)
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"Valid hubs with zones are required",
			);
		const rule = await prisma.pricingRule.findUnique({
			where: {
				fromZoneId_toZoneId: { fromZoneId: from.zoneId, toZoneId: to.zoneId },
			},
		});
		if (!rule)
			throw new AppError(
				httpStatus.NOT_FOUND,
				"No pricing rule found for this route",
			);
		return {
			deliveryCharge:
				Number(rule.baseFare) + Number(rule.perKgRate) * data.weightKg,
			baseFare: Number(rule.baseFare),
			perKgRate: Number(rule.perKgRate),
			weightKg: data.weightKg,
		};
	},
	savePricing: (data: {
		fromZoneId: string;
		toZoneId: string;
		baseFare: number;
		perKgRate: number;
	}) =>
		prisma.pricingRule.upsert({
			where: {
				fromZoneId_toZoneId: {
					fromZoneId: data.fromZoneId,
					toZoneId: data.toZoneId,
				},
			},
			create: data,
			update: { baseFare: data.baseFare, perKgRate: data.perKgRate },
		}),
};
