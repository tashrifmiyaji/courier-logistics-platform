import bcrypt from "bcryptjs";
import httpStatus from "http-status";
import config from "../config";
import { prisma } from "../lib/prisma";

import {
	Role,
	VehicleType,
	CourierAvailability,
	ShipmentStatus,
	PaymentProvider,
	PaymentStatus,
	NotificationType,
} from "../../generated/prisma/enums";
import { AppError } from "./AppError";

export async function seedingScript() {
	console.log("🌱 Seeding started...");

	// 1. Admin
	const seedAdmin = async () => {
		try {
			const isAdminExist = await prisma.user.findFirst({
				where: {
					role: Role.ADMIN,
				},
			});

			if (isAdminExist) {
				console.log("Admin Already Exists!");
				return isAdminExist;
			}

			const name = config.admin_name;
			const email = config.admin_email;
			const password = config.admin_password;

			if (!name || !email || !password) {
        throw new AppError(
					httpStatus.INTERNAL_SERVER_ERROR,
					"Admin Name, Email, Password Missing In Env File!!!",
				);
			}

			const hashedPassword = await bcrypt.hash(
				password,
				Number(config.bcrypt_salt_rounds),
			);

			const admin = await prisma.user.create({
				data: {
					name,
					email,
					password: hashedPassword,
					role: Role.ADMIN,
					isVerified: true,
				},
			});

			console.log("Admin Created:", admin.email);

			return admin;
		} catch (error) {
			console.log("Error Seeding Admin:", error);
			throw error;
		}
	};

	// 2. Zones & Hubs
	const seedZonesAndHubs = async () => {
		try {
			// Zones
			let dhakaZone = await prisma.zone.findFirst({
				where: {
					name: "Dhaka",
				},
			});

			let chattogramZone = await prisma.zone.findFirst({
				where: {
					name: "Chattogram",
				},
			});

			let sylhetZone = await prisma.zone.findFirst({
				where: {
					name: "Sylhet",
				},
			});

			if (!dhakaZone) {
				dhakaZone = await prisma.zone.create({
					data: {
						name: "Dhaka",
					},
				});
			}

			if (!chattogramZone) {
				chattogramZone = await prisma.zone.create({
					data: {
						name: "Chattogram",
					},
				});
			}

			if (!sylhetZone) {
				sylhetZone = await prisma.zone.create({
					data: {
						name: "Sylhet",
					},
				});
			}

			console.log("Zones seeded successfully!");

			// Hubs
			let dhakaHub = await prisma.hub.findFirst({
				where: {
					name: "Dhaka Hub",
				},
			});

			let chattogramHub = await prisma.hub.findFirst({
				where: {
					name: "Chattogram Hub",
				},
			});

			let sylhetHub = await prisma.hub.findFirst({
				where: {
					name: "Sylhet Hub",
				},
			});

			if (!dhakaHub) {
				dhakaHub = await prisma.hub.create({
					data: {
						name: "Dhaka Hub",
						code: "DHK-HUB",
						city: "Dhaka",
						address: "Dhaka",
						zoneId: dhakaZone.id,
					},
				});
			}

			if (!chattogramHub) {
				chattogramHub = await prisma.hub.create({
					data: {
						name: "Chattogram Hub",
						code: "CTG-HUB",
						city: "Chattogram",
						address: "Chattogram",
						zoneId: chattogramZone.id,
					},
				});
			}

			if (!sylhetHub) {
				sylhetHub = await prisma.hub.create({
					data: {
						name: "Sylhet Hub",
						code: "SYL-HUB",
						city: "Sylhet",
						address: "Sylhet",
						zoneId: sylhetZone.id,
					},
				});
			}

			console.log("Hubs seeded successfully!");

			return {
				dhakaZone,
				chattogramZone,
				sylhetZone,
				dhakaHub,
				chattogramHub,
				sylhetHub,
			};
		} catch (error) {
			console.log("Error Seeding Zones & Hubs:", error);
			throw error;
		}
	};

	// ---------------------------------------------------------
	// 3. Pricing Rules
	// ---------------------------------------------------------
	const seedPricingRules = async ({
		dhakaZone,
		chattogramZone,
		sylhetZone,
	}: {
		dhakaZone: { id: string };
		chattogramZone: { id: string };
		sylhetZone: { id: string };
	}) => {
		try {
			const existingRules = await prisma.pricingRule.count();

			if (existingRules > 0) {
				console.log("Pricing Rules Already Exist!");
				return;
			}

			await prisma.pricingRule.createMany({
				data: [
					{
						fromZoneId: dhakaZone.id,
						toZoneId: dhakaZone.id,
						baseFare: 50,
						perKgRate: 10,
					},
					{
						fromZoneId: dhakaZone.id,
						toZoneId: chattogramZone.id,
						baseFare: 80,
						perKgRate: 15,
					},
					{
						fromZoneId: dhakaZone.id,
						toZoneId: sylhetZone.id,
						baseFare: 90,
						perKgRate: 18,
					},
					{
						fromZoneId: chattogramZone.id,
						toZoneId: sylhetZone.id,
						baseFare: 100,
						perKgRate: 20,
					},
				],
			});

			console.log("Pricing Rules Created!");
		} catch (error) {
			console.log("Error Seeding Pricing Rules:", error);
			throw error;
		}
	};

	// ---------------------------------------------------------
	// 4. Couriers
	// ---------------------------------------------------------
	const seedCouriers = async ({
		dhakaHub,
		chattogramHub,
		sylhetHub,
	}: {
		dhakaHub: { id: string };
		chattogramHub: { id: string };
		sylhetHub: { id: string };
	}) => {
		try {
			const existingCourier = await prisma.user.findFirst({
				where: {
					role: Role.COURIER,
				},
			});

			if (existingCourier) {
				console.log("Couriers Already Exist!");

				return await prisma.courierProfile.findMany({
					where: {
						user: {
							role: Role.COURIER,
						},
					},
				});
			}

			const courierPassword = await bcrypt.hash("Courier@1234", 10);

			const courierSeedData = [
				{
					name: "Rafiul Islam",
					email: "rafiul.courier@courier.com",
					vehicleType: VehicleType.BIKE,
					hubId: dhakaHub.id,
				},
				{
					name: "Kamal Hossain",
					email: "kamal.courier@courier.com",
					vehicleType: VehicleType.VAN,
					hubId: chattogramHub.id,
				},
				{
					name: "Sumon Ahmed",
					email: "sumon.courier@courier.com",
					vehicleType: VehicleType.BICYCLE,
					hubId: sylhetHub.id,
				},
			];

			const courierProfiles = [];

			for (const courier of courierSeedData) {
				const user = await prisma.user.create({
					data: {
						name: courier.name,
						email: courier.email,
						password: courierPassword,
						role: Role.COURIER,
						isVerified: true,
					},
				});

				const profile = await prisma.courierProfile.create({
					data: {
						userId: user.id,
						vehicleType: courier.vehicleType,
						availability: CourierAvailability.AVAILABLE,
						currentHubId: courier.hubId,
						rating: 4.5,
					},
				});

				courierProfiles.push(profile);
			}

			console.log("Couriers Created!");

			return courierProfiles;
		} catch (error) {
			console.log("Error Seeding Couriers:", error);
			throw error;
		}
	};

	// ---------------------------------------------------------
	// 5. Customers
	// ---------------------------------------------------------
	const seedCustomers = async () => {
		try {
			const existingCustomers = await prisma.user.findFirst({
				where: {
					role: Role.CUSTOMER,
				},
			});

			if (existingCustomers) {
				console.log("Customers Already Exist!");

				return await prisma.user.findMany({
					where: {
						role: Role.CUSTOMER,
					},
				});
			}

			const customerPassword = await bcrypt.hash("Customer@1234", 10);

			const customerSeedData = [
				{
					name: "Nusrat Jahan",
					email: "nusrat@example.com",
				},
				{
					name: "Tanvir Ahmed",
					email: "tanvir@example.com",
				},
			];

			const customers = [];

			for (const customer of customerSeedData) {
				const createdCustomer = await prisma.user.create({
					data: {
						name: customer.name,
						email: customer.email,
						password: customerPassword,
						role: Role.CUSTOMER,
						isVerified: true,
					},
				});

				customers.push(createdCustomer);
			}

			console.log("Customers Created!");

			return customers;
		} catch (error) {
			console.log("Error Seeding Customers:", error);
			throw error;
		}
	};

	// ---------------------------------------------------------
	// 6. Shipments
	// ---------------------------------------------------------
const seedShipments = async ({
	customers,
	courierProfiles,
	dhakaHub,
	chattogramHub,
	sylhetHub,
}: {
	customers: Array<{
		id: string;
		name: string;
	}>;
	courierProfiles: Array<{
		id: string;
	}>;
	dhakaHub: {
		id: string;
		name: string;
	};
	chattogramHub: {
		id: string;
		name: string;
	};
	sylhetHub: {
		id: string;
		name: string;
	};
}) => {
	try {
		// ---------------------------------------------------------
		// Check existing shipments
		// ---------------------------------------------------------
		const existingShipments = await prisma.shipment.findMany({
			where: {
				trackingCode: {
					in: ["TRK-0001", "TRK-0002"],
				},
			},
		});

		// ---------------------------------------------------------
		// If shipments already exist
		// ---------------------------------------------------------
		if (existingShipments.length === 2) {
			console.log("Shipments Already Exist!");

			const shipment1 = existingShipments.find(
				(shipment) => shipment.trackingCode === "TRK-0001",
			);

			const shipment2 = existingShipments.find(
				(shipment) => shipment.trackingCode === "TRK-0002",
			);

			if (!shipment1 || !shipment2) {
				throw new AppError(
					httpStatus.INTERNAL_SERVER_ERROR,
					"Required demo shipments were not found!",
				);
			}

			return {
				shipment1,
				shipment2,
			};
		}

		// ---------------------------------------------------------
		// Shipment #1 — In Transit, Paid
		// ---------------------------------------------------------
		let shipment1 = existingShipments.find(
			(shipment) => shipment.trackingCode === "TRK-0001",
		);

		if (!shipment1) {
			shipment1 = await prisma.shipment.create({
				data: {
					trackingCode: "TRK-0001",

					customerId: customers[0].id,
					courierId: courierProfiles[0].id,

					senderName: customers[0].name,
					senderPhone: "01711000000",
					pickupAddress: "Gulshan, Dhaka",
					pickupHubId: dhakaHub.id,

					receiverName: "Farhana Akter",
					receiverPhone: "01911000000",
					deliveryAddress: "Agrabad, Chattogram",
					deliveryHubId: chattogramHub.id,

					weightKg: 2.5,
					parcelType: "Documents",

					deliveryCharge: 80 + 2.5 * 15,

					status: ShipmentStatus.IN_TRANSIT,
				},
			});

			await prisma.trackingEvent.createMany({
				data: [
					{
						shipmentId: shipment1.id,
						status: ShipmentStatus.PENDING,
						note: "Shipment created",
					},
					{
						shipmentId: shipment1.id,
						status: ShipmentStatus.PICKUP_SCHEDULED,
						note: "Pickup scheduled",
					},
					{
						shipmentId: shipment1.id,
						status: ShipmentStatus.PICKED_UP,
						note: "Picked up by courier",
						location: "Gulshan, Dhaka",
					},
					{
						shipmentId: shipment1.id,
						status: ShipmentStatus.AT_ORIGIN_HUB,
						note: "Arrived at origin hub",
						location: dhakaHub.name,
					},
					{
						shipmentId: shipment1.id,
						status: ShipmentStatus.IN_TRANSIT,
						note: "In transit to destination hub",
					},
				],
			});

			await prisma.hubTransfer.create({
				data: {
					shipmentId: shipment1.id,
					fromHubId: dhakaHub.id,
					toHubId: chattogramHub.id,
					dispatchedAt: new Date(),
				},
			});

			await prisma.payment.create({
				data: {
					shipmentId: shipment1.id,
					amount: shipment1.deliveryCharge,
					provider: PaymentProvider.SSLCOMMERZ,
					status: PaymentStatus.PAID,
					transactionId: "TXN-DEMO-0001",
					paidAt: new Date(),
				},
			});

			console.log("Shipment #1 Created!");
		} else {
			console.log("Shipment #1 Already Exists!");
		}

		// ---------------------------------------------------------
		// Shipment #2 — Pending, Unassigned
		// ---------------------------------------------------------
		let shipment2 = existingShipments.find(
			(shipment) => shipment.trackingCode === "TRK-0002",
		);

		if (!shipment2) {
			shipment2 = await prisma.shipment.create({
				data: {
					trackingCode: "TRK-0002",

					customerId: customers[1].id,

					senderName: customers[1].name,
					senderPhone: "01911223344",
					pickupAddress: "Banani, Dhaka",
					pickupHubId: dhakaHub.id,

					receiverName: "Rezaul Karim",
					receiverPhone: "01711223344",
					deliveryAddress: "Zindabazar, Sylhet",
					deliveryHubId: sylhetHub.id,

					weightKg: 1.2,
					parcelType: "Electronics",

					deliveryCharge: 90 + 1.2 * 18,

					status: ShipmentStatus.PENDING,
				},
			});

			await prisma.trackingEvent.create({
				data: {
					shipmentId: shipment2.id,
					status: ShipmentStatus.PENDING,
					note: "Shipment created, awaiting pickup",
				},
			});

			console.log("Shipment #2 Created!");
		} else {
			console.log("Shipment #2 Already Exists!");
		}

		// ---------------------------------------------------------
		// Return both shipments
		// ---------------------------------------------------------
		console.log("Shipments Seeded Successfully!");

		return {
			shipment1,
			shipment2,
		};
	} catch (error) {
		console.log("Error Seeding Shipments:", error);

		throw error;
	}
};
	// ---------------------------------------------------------
	// 7. Notifications + Audit Log
	// ---------------------------------------------------------
	const seedNotificationsAndAuditLog = async ({
		customers,
		shipment1,
		shipment2,
		admin,
	}: {
		customers: Array<{
			id: string;
		}>;
		shipment1: {
			id: string;
			trackingCode: string;
		};
		shipment2: {
			id: string;
			trackingCode: string;
		};
		admin: {
			id: string;
		};
	}) => {
		try {
			const existingNotification = await prisma.notification.findFirst();

			if (!existingNotification) {
				await prisma.notification.createMany({
					data: [
						{
							userId: customers[0].id,
							type: NotificationType.SHIPMENT_CREATED,
							title: "Shipment Created",
							message: `Your shipment ${shipment1.trackingCode} has been created.`,
						},
						{
							userId: customers[0].id,
							type: NotificationType.STATUS_UPDATE,
							title: "In Transit",
							message: `Shipment ${shipment1.trackingCode} is now in transit.`,
						},
						{
							userId: customers[1].id,
							type: NotificationType.SHIPMENT_CREATED,
							title: "Shipment Created",
							message: `Your shipment ${shipment2.trackingCode} has been created.`,
						},
					],
				});

				console.log("Notifications Created!");
			} else {
				console.log("Notifications Already Exist!");
			}

			const existingAuditLog = await prisma.auditLog.findFirst();

			if (!existingAuditLog) {
				await prisma.auditLog.create({
					data: {
						userId: admin.id,
						action: "SHIPMENT_STATUS_CHANGED",
						entityType: "Shipment",
						entityId: shipment1.id,
						metadata: {
							from: "AT_ORIGIN_HUB",
							to: "IN_TRANSIT",
						},
					},
				});

				console.log("Audit Log Created!");
			} else {
				console.log("Audit Log Already Exists!");
			}
		} catch (error) {
			console.log("Error Seeding Notifications & Audit Log:", error);

			throw error;
		}
	};

	// =========================================================
	// Execute All Seeds
	// =========================================================

	const admin = await seedAdmin();

	const {
		dhakaZone,
		chattogramZone,
		sylhetZone,
		dhakaHub,
		chattogramHub,
		sylhetHub,
	} = await seedZonesAndHubs();

	await seedPricingRules({
		dhakaZone,
		chattogramZone,
		sylhetZone,
	});

	const courierProfiles = await seedCouriers({
		dhakaHub,
		chattogramHub,
		sylhetHub,
	});

	const customers = await seedCustomers();

	const { shipment1, shipment2 } = await seedShipments({
		customers,
		courierProfiles,
		dhakaHub,
		chattogramHub,
		sylhetHub,
	});

	await seedNotificationsAndAuditLog({
		customers,
		shipment1,
		shipment2,
		admin,
	});

	console.log("✅ Seeding completed!");
	console.log("---------------------------------------------");
	console.log("Demo Admin Login (for evaluation):");
	console.log("  email   :", admin.email);
	console.log("  password: Admin@1234");
	console.log("---------------------------------------------");
}
