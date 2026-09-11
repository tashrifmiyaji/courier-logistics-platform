import type { ShipmentStatus } from "../../../generated/prisma/enums";

export interface ShipmentStatusUpdateInput {
	status: ShipmentStatus;
	note?: string;
	location?: string;
}
