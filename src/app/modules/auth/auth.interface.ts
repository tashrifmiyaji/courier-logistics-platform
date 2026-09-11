import type { Role } from "../../../generated/prisma/enums";

export interface TokenPayload {
	userId: string;
	email: string;
	name: string;
	role: Role;
}

export interface AuthTokens {
	accessToken: string;
	refreshToken: string;
}
