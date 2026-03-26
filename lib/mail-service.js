const nodemailer = require("nodemailer");

function toBoolean(value) {
	return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

function getMailConfig() {
	return {
		host: String(process.env.SMTP_HOST || "").trim(),
		port: Number(process.env.SMTP_PORT || 587),
		user: String(process.env.SMTP_USER || "").trim(),
		pass: String(process.env.SMTP_PASS || "").trim(),
		from: String(process.env.MAIL_FROM || "").trim(),
		secure: toBoolean(process.env.SMTP_SECURE)
	};
}

function isMailConfigured() {
	const cfg = getMailConfig();
	return Boolean(cfg.host && cfg.port && cfg.user && cfg.pass && cfg.from);
}

function createTransporter() {
	const cfg = getMailConfig();
	return nodemailer.createTransport({
		host: cfg.host,
		port: cfg.port,
		secure: cfg.secure,
		auth: {
			user: cfg.user,
			pass: cfg.pass
		}
	});
}

async function verifyMailConfiguration() {
	if (!isMailConfigured()) {
		return { enabled: false };
	}

	const transporter = createTransporter();
	await transporter.verify();
	return { enabled: true };
}

async function sendSubscriptionConfirmationEmail({ name, email, createdAt }) {
	if (!isMailConfigured()) {
		return { enabled: false };
	}

	const cfg = getMailConfig();
	const transporter = createTransporter();
	const dateLabel = new Intl.DateTimeFormat("pt-BR", {
		dateStyle: "short",
		timeStyle: "short"
	}).format(createdAt || new Date());

	await transporter.sendMail({
		from: cfg.from,
		to: email,
		subject: "Inscrição confirmada - CRSouza Blog",
		text: `Olá ${name || ""}, sua inscrição foi confirmada em ${dateLabel}.`,
		html: `<p>Olá <strong>${String(name || "")}</strong>,</p><p>Sua inscrição foi confirmada em ${dateLabel}.</p>`
	});

	return { enabled: true };
}

module.exports = {
	isMailConfigured,
	verifyMailConfiguration,
	sendSubscriptionConfirmationEmail
};
