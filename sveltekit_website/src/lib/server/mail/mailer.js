import nodemailer from 'nodemailer';
import { env } from '$env/dynamic/private';

function createTransport() {
	if (!env.SMTP_HOST) {
		throw new Error('SMTP_HOST is not configured');
	}

	return nodemailer.createTransport({
		host: env.SMTP_HOST,
		port: Number(env.SMTP_PORT ?? 587),
		secure: env.SMTP_SECURE === 'true',
		auth: env.SMTP_USER
			? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
			: undefined
	});
}

export async function sendMail(to, subject, html, { text } = {}) {
	return createTransport().sendMail({
		from: env.MAIL_FROM ?? env.SMTP_USER,
		to,
		subject,
		html,
		text
	});
}
