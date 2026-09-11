import bcrypt from "bcryptjs";
import httpStatus from "http-status";
import { randomUUID } from "node:crypto";
import type { Response } from "express";
import type { Role } from "../../../generated/prisma/enums";
import config from "../../config";
import { googleClient } from "../../lib/googleAuth";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { publicUserSelect } from "../../utils/api";
import { jwtUtils } from "../../utils/jwt";

const tokenExpiry = (value: string | undefined, fallbackDays: number) => {
	const match = value?.match(/^(\d+)d$/);
	return new Date(
		Date.now() + (match ? Number(match[1]) : fallbackDays) * 86_400_000,
	);
};

const issueTokens = async (user: {
	id: string;
	email: string;
	name: string;
	role: Role;
}) => {
	const payload = {
		userId: user.id,
		email: user.email,
		name: user.name,
		role: user.role,
	};
	const accessToken = jwtUtils.createToken(
		payload,
		config.jwt_access_secret,
		config.jwt_access_expires_in as never,
	);
	const refreshToken = `${randomUUID()}.${jwtUtils.createToken(payload, config.jwt_refresh_secret, config.jwt_refresh_expires_in as never)}`;
	await prisma.refreshToken.create({
		data: {
			token: refreshToken,
			userId: user.id,
			expiresAt: tokenExpiry(config.jwt_refresh_expires_in, 30),
		},
	});
	return { accessToken, refreshToken };
};

export const authService = {
	async register(data: {
		name: string;
		email: string;
		password: string;
		phone?: string;
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
		const user = await prisma.user.create({
			data: { ...data, password, isVerified: true },
			select: publicUserSelect,
		});
		await prisma.auditLog.create({
			data: {
				userId: user.id,
				action: "USER_REGISTERED",
				entityType: "User",
				entityId: user.id,
			},
		});
		return user;
	},
	async login(email: string, password: string) {
		const user = await prisma.user.findFirst({
			where: { email, deletedAt: null },
		});
		if (!user?.password || !(await bcrypt.compare(password, user.password)))
			throw new AppError(httpStatus.UNAUTHORIZED, "Invalid email or password");
		return {
			user: {
				id: user.id,
				name: user.name,
				email: user.email,
				role: user.role,
			},
			...(await issueTokens(user)),
		};
	},
	async google(idToken: string) {
		const ticket = await googleClient.verifyIdToken({
			idToken,
			audience: config.google_client_id,
		});
		const payload = ticket.getPayload();
		if (!payload?.email || !payload.sub)
			throw new AppError(
				httpStatus.UNAUTHORIZED,
				"Google account did not provide a verified email",
			);
		const user = await prisma.user.upsert({
			where: { email: payload.email },
			update: {
				googleId: payload.sub,
				isVerified: payload.email_verified ?? false,
				deletedAt: null,
			},
			create: {
				name: payload.name || payload.email.split("@")[0],
				email: payload.email,
				googleId: payload.sub,
				isVerified: payload.email_verified ?? false,
			},
		});
		return {
			user: {
				id: user.id,
				name: user.name,
				email: user.email,
				role: user.role,
			},
			...(await issueTokens(user)),
		};
	},
	async refresh(token: string) {
		const saved = await prisma.refreshToken.findFirst({
			where: {
				token,
				revoked: false,
				expiresAt: { gt: new Date() },
				user: { deletedAt: null },
			},
			include: { user: true },
		});
		if (!saved)
			throw new AppError(
				httpStatus.UNAUTHORIZED,
				"Invalid or expired refresh token",
			);
		await prisma.refreshToken.update({
			where: { id: saved.id },
			data: { revoked: true },
		});
		return issueTokens(saved.user);
	},
	async logout(token: string | undefined, userId: string) {
		if (token)
			await prisma.refreshToken.updateMany({
				where: { token, userId },
				data: { revoked: true },
			});
	},
	setRefreshCookie(res: Response, refreshToken: string) {
		res.cookie("refreshToken", refreshToken, {
			httpOnly: true,
			secure: config.node_env === "production",
			sameSite: "lax",
			path: "/api/v1/auth",
		});
	},
	clearRefreshCookie(res: Response) {
		res.clearCookie("refreshToken", { path: "/api/v1/auth" });
	},
};
