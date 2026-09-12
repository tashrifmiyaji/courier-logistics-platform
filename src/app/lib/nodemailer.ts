import nodemailer from "nodemailer";
import config from "../config";

export const transporter = nodemailer.createTransport({
	host: "smtp.gmail.com",
	port: 587,
	secure: false,
	auth: {
		user: config.smtp_user,
		pass: config.smtp_password,
	},
});
