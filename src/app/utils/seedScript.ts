// src/app/utils/seedScript.ts
//
// Run with:  tsx src/app/utils/seedScript.ts
// (or hook it up as the "seed" command in prisma.config.ts — see prisma.config.ts)
//
// Matches this generator block:
//   generator client {
//     provider = "prisma-client"
//     output   = "../../src/generated/prisma"
//   }
// With the new `prisma-client` generator, PrismaClient comes from
// "<output>/client" and enums come from "<output>/enums" (they're split
// into separate files, unlike the old @prisma/client single import).

import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../../generated/prisma/client";
import {
  Role,
  VehicleType,
  CourierAvailability,
  ShipmentStatus,
  PaymentProvider,
  PaymentStatus,
  NotificationType,
} from "../../generated/prisma/enums";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function clearDatabase() {
  // delete in reverse-dependency order so foreign keys don't complain
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.courierEarning.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.hubTransfer.deleteMany();
  await prisma.trackingEvent.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.pricingRule.deleteMany();
  await prisma.courierProfile.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.hub.deleteMany();
  await prisma.zone.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  console.log("🌱 Seeding started...");
  await clearDatabase();

  // ---------------------------------------------------------
  // 1. Admin (demo credentials required by the assignment)
  // ---------------------------------------------------------
  const adminPassword = await bcrypt.hash("Admin@1234", 10);
  const admin = await prisma.user.create({
    data: {
      name: "System Admin",
      email: "admin@courier.com",
      password: adminPassword,
      role: Role.ADMIN,
      isVerified: true,
    },
  });

  // ---------------------------------------------------------
  // 2. Zones + Hubs
  // ---------------------------------------------------------
  const dhakaZone = await prisma.zone.create({ data: { name: "Dhaka" } });
  const chattogramZone = await prisma.zone.create({ data: { name: "Chattogram" } });
  const sylhetZone = await prisma.zone.create({ data: { name: "Sylhet" } });

  const dhakaHub = await prisma.hub.create({
    data: { name: "Dhaka Central Hub", code: "DHK-01", zoneId: dhakaZone.id, address: "Motijheel, Dhaka", city: "Dhaka" },
  });
  const chattogramHub = await prisma.hub.create({
    data: { name: "Chattogram Hub", code: "CTG-01", zoneId: chattogramZone.id, address: "Agrabad, Chattogram", city: "Chattogram" },
  });
  const sylhetHub = await prisma.hub.create({
    data: { name: "Sylhet Hub", code: "SYL-01", zoneId: sylhetZone.id, address: "Zindabazar, Sylhet", city: "Sylhet" },
  });

  // ---------------------------------------------------------
  // 3. Pricing rules between zones
  // ---------------------------------------------------------
  await prisma.pricingRule.createMany({
    data: [
      { fromZoneId: dhakaZone.id, toZoneId: dhakaZone.id, baseFare: 50, perKgRate: 10 },
      { fromZoneId: dhakaZone.id, toZoneId: chattogramZone.id, baseFare: 80, perKgRate: 15 },
      { fromZoneId: dhakaZone.id, toZoneId: sylhetZone.id, baseFare: 90, perKgRate: 18 },
      { fromZoneId: chattogramZone.id, toZoneId: sylhetZone.id, baseFare: 100, perKgRate: 20 },
    ],
  });

  // ---------------------------------------------------------
  // 4. Couriers
  // ---------------------------------------------------------
  const courierPassword = await bcrypt.hash("Courier@1234", 10);
  const courierSeedData = [
    { name: "Rafiul Islam", email: "rafiul.courier@courier.com", vehicleType: VehicleType.BIKE, hubId: dhakaHub.id },
    { name: "Kamal Hossain", email: "kamal.courier@courier.com", vehicleType: VehicleType.VAN, hubId: chattogramHub.id },
    { name: "Sumon Ahmed", email: "sumon.courier@courier.com", vehicleType: VehicleType.BICYCLE, hubId: sylhetHub.id },
  ];

  const courierProfiles = [];
  for (const c of courierSeedData) {
    const user = await prisma.user.create({
      data: { name: c.name, email: c.email, password: courierPassword, role: Role.COURIER, isVerified: true },
    });
    const profile = await prisma.courierProfile.create({
      data: {
        userId: user.id,
        vehicleType: c.vehicleType,
        availability: CourierAvailability.AVAILABLE,
        currentHubId: c.hubId,
        rating: 4.5,
      },
    });
    courierProfiles.push(profile);
  }

  // ---------------------------------------------------------
  // 5. Customers
  // ---------------------------------------------------------
  const customerPassword = await bcrypt.hash("Customer@1234", 10);
  const customerSeedData = [
    { name: "Nusrat Jahan", email: "nusrat@example.com" },
    { name: "Tanvir Ahmed", email: "tanvir@example.com" },
  ];

  const customers = [];
  for (const c of customerSeedData) {
    const customer = await prisma.user.create({
      data: { name: c.name, email: c.email, password: customerPassword, role: Role.CUSTOMER, isVerified: true },
    });
    customers.push(customer);
  }

  // ---------------------------------------------------------
  // 6. Sample shipment #1 — in transit, paid
  // ---------------------------------------------------------
  const shipment1 = await prisma.shipment.create({
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
      { shipmentId: shipment1.id, status: ShipmentStatus.PENDING, note: "Shipment created" },
      { shipmentId: shipment1.id, status: ShipmentStatus.PICKUP_SCHEDULED, note: "Pickup scheduled" },
      { shipmentId: shipment1.id, status: ShipmentStatus.PICKED_UP, note: "Picked up by courier", location: "Gulshan, Dhaka" },
      { shipmentId: shipment1.id, status: ShipmentStatus.AT_ORIGIN_HUB, note: "Arrived at origin hub", location: dhakaHub.name },
      { shipmentId: shipment1.id, status: ShipmentStatus.IN_TRANSIT, note: "In transit to destination hub" },
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

  // ---------------------------------------------------------
  // 7. Sample shipment #2 — still pending, unassigned
  // ---------------------------------------------------------
  const shipment2 = await prisma.shipment.create({
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
    data: { shipmentId: shipment2.id, status: ShipmentStatus.PENDING, note: "Shipment created, awaiting pickup" },
  });

  // ---------------------------------------------------------
  // 8. Notifications + audit log sample
  // ---------------------------------------------------------
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

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: "SHIPMENT_STATUS_CHANGED",
      entityType: "Shipment",
      entityId: shipment1.id,
      metadata: { from: "AT_ORIGIN_HUB", to: "IN_TRANSIT" },
    },
  });

  console.log("✅ Seeding completed!");
  console.log("---------------------------------------------");
  console.log("Demo Admin Login (for evaluation):");
  console.log("  email   :", admin.email);
  console.log("  password: Admin@1234");
  console.log("---------------------------------------------");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });