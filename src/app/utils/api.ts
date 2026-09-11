import type { Request } from "express";
import type { Role } from "../../generated/prisma/enums";

export const publicUserSelect = {
	id: true,
	name: true,
	email: true,
	phone: true,
	role: true,
	isVerified: true,
	createdAt: true,
	updatedAt: true,
} as const;

export const getPagination = (req: Request) => {
	const page = Math.max(1, Number(req.query.page) || 1);
	const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
	return { page, limit, skip: (page - 1) * limit };
};

export const hasRole = (role: Role | undefined, expected: Role) =>
	role === expected;

export const getParam = (value: string | string[] | undefined) =>
	Array.isArray(value) ? value[0] : value || "";
