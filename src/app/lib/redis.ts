import { createClient } from "redis";
import config from "../config";

export const redisClient = createClient({
	username: config.redis_user,
	password: config.redis_password,
	socket: {
		host: config.redis_host,
		port: Number(config.redis_port),
	},
});

let redisConnection: Promise<void> | undefined;

export const ensureRedisConnection = async () => {
	if (redisClient.isReady) return;

	redisConnection ??= redisClient
		.connect()
		.then(() => undefined)
		.catch((error) => {
			redisConnection = undefined;
			throw error;
		});

	await redisConnection;
};
