const nodemailer = require("nodemailer");
const { EmailClient } = require("@azure/communication-email");

function toBoolean(value) {
	return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

function getAzureEmailConfig() {
	return {
		connectionString: String(process.env.AZURE_EMAIL_CONNECTION_STRING || "").trim(),
		from: String(process.env.MAIL_FROM || "").trim()
	};
}

function getSmtpConfig() {
	return {
		host: String(process.env.SMTP_HOST || "").trim(),
		port: Number(process.env.SMTP_PORT || 587),
		user: String(process.env.SMTP_USER || "").trim(),
		pass: String(process.env.SMTP_PASS || "").trim(),
		from: String(process.env.MAIL_FROM || "").trim(),
		secure: toBoolean(process.env.SMTP_SECURE)
	};
}

function isAzureMailConfigured() {
	const cfg = getAzureEmailConfig();
	return Boolean(cfg.connectionString && cfg.from);
}

function isSmtpConfigured() {
	const cfg = getSmtpConfig();
	return Boolean(cfg.host && cfg.port && cfg.user && cfg.pass && cfg.from);
}

function isMailConfigured() {
	return isAzureMailConfigured() || isSmtpConfigured();
}

function createSmtpTransporter() {
	const cfg = getSmtpConfig();
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
	if (isAzureMailConfigured()) {
		return { enabled: true, provider: "azure-communication-services" };
	}

	if (!isSmtpConfigured()) {
		return { enabled: false };
	}

	const transporter = createSmtpTransporter();
	await transporter.verify();
	return { enabled: true, provider: "smtp" };
}

async function sendWithAzureEmail({ to, subject, text, html }) {
	const cfg = getAzureEmailConfig();
	const client = new EmailClient(cfg.connectionString);
	const poller = await client.beginSend({
		senderAddress: cfg.from,
		content: {
			subject,
			plainText: text,
			html
		},
		recipients: {
			to: [{ address: to }]
		}
	});

	const result = await poller.pollUntilDone();
	if (result.status !== "Succeeded") {
		throw new Error(`Falha ao enviar e-mail via Azure Communication Services. Status: ${result.status}`);
	}

	return { enabled: true, provider: "azure-communication-services", result };
}

async function sendWithSmtp({ to, subject, text, html }) {
	const cfg = getSmtpConfig();
	const transporter = createSmtpTransporter();
	await transporter.sendMail({
		from: cfg.from,
		to,
		subject,
		text,
		html
	});
	return { enabled: true, provider: "smtp" };
}

async function sendEmailMessage(payload) {
	if (isAzureMailConfigured()) {
		return sendWithAzureEmail(payload);
	}

	if (isSmtpConfigured()) {
		return sendWithSmtp(payload);
	}

	return { enabled: false };
}

async function sendSubscriptionConfirmationEmail({ name, email, createdAt }) {
	if (!isMailConfigured()) {
		return { enabled: false };
	}

	const dateLabel = new Intl.DateTimeFormat("pt-BR", {
		dateStyle: "short",
		timeStyle: "short"
	}).format(createdAt || new Date());

	return sendEmailMessage({
		to: email,
		subject: "Inscrição confirmada - CRSouza Blog",
		text: `Olá ${name || ""}, sua inscrição foi confirmada em ${dateLabel}.`,
		html: `<p>Olá <strong>${String(name || "")}</strong>,</p><p>Sua inscrição foi confirmada em ${dateLabel}.</p>`
	});
}

function buildNewsEmailHtml(name, newsItems) {
	const articles = newsItems
		.map((item) => `
			<tr>
				<td style="padding: 0 0 24px;">
					<p style="margin: 0 0 6px; color: #7c8aa5; font-size: 13px;">${item.meta}</p>
					<h2 style="margin: 0 0 10px; font-size: 20px; color: #111827;">${item.title}</h2>
					<p style="margin: 0; color: #374151; line-height: 1.6;">${item.summary}</p>
				</td>
			</tr>
		`)
		.join("");

	return `
		<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
			<tr>
				<td style="padding: 24px; background: #0f172a; color: #ffffff;">
					<h1 style="margin: 0; font-size: 28px;">CRSouza Blog</h1>
					<p style="margin: 8px 0 0; color: #cbd5e1;">Novidades da home para ${name || "você"}</p>
				</td>
			</tr>
			<tr>
				<td style="padding: 24px; background: #ffffff;">
					${articles}
				</td>
			</tr>
		</table>
	`;
}

function buildNewsEmailText(name, newsItems) {
	const intro = `Olá ${name || ""}, seguem as novidades do CRSouza Blog:\n\n`;
	const body = newsItems
		.map((item, index) => `${index + 1}. ${item.title}\n${item.meta}\n${item.summary}`)
		.join("\n\n");
	return `${intro}${body}`;
}

async function sendNewsUpdateEmail({ name, email, newsItems }) {
	if (!isMailConfigured()) {
		return { enabled: false };
	}

	return sendEmailMessage({
		to: email,
		subject: "Novas notícias no CRSouza Blog",
		text: buildNewsEmailText(name, newsItems),
		html: buildNewsEmailHtml(name, newsItems)
	});
}

module.exports = {
	isMailConfigured,
	verifyMailConfiguration,
	sendSubscriptionConfirmationEmail,
	sendNewsUpdateEmail
};
