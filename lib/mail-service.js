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

function getPublicBaseUrl() {
	const blogUrl = String(process.env.BLOG_URL || "").trim();
	const websiteHostname = String(process.env.WEBSITE_HOSTNAME || "").trim();
	const rawBaseUrl = blogUrl || (websiteHostname ? `https://${websiteHostname}` : "http://localhost:3000");

	return rawBaseUrl.replace(/\/index\.html$/i, "").replace(/\/$/, "");
}

function buildUnsubscribeUrl(email) {
	return `${getPublicBaseUrl()}/unsubscribe?email=${encodeURIComponent(String(email || "").trim().toLowerCase())}`;
}

function buildAuthorSignatureText() {
	return [
		"",
		"Clayton Rodrigues Souza",
		"Cloud Solutions Architect | DevOps | SRE | Technical Account Manager",
		"",
		"🎥 Youtube: https://www.youtube.com/channel/UCeUywiFV6oo5kEJY4JKyL1A",
		"📷 Instagram: https://www.instagram.com/techtinhoofc?utm_source=qr&igsh=ZGpzMTl0cmg1eXRq",
		"💼 LinkedIn: https://www.linkedin.com/in/clayton-rodrigues-souza-5276b875/",
		"🐱 GitHub: https://github.com/ClaytonSouza-Tec",
		"🎓 Udemy: https://www.udemy.com/user/clayton-souza-4/",
		"📚 Transcrição Microsoft: https://learn.microsoft.com/en-us/users/claytonrodriguessouza-7987/transcript/vnmmpfr9m6xo0mg?tab=credentials-tab&source=docs",
		"🏆 Credly: https://www.credly.com/users/clayton-souza/badges#credly"
	].join("\n");
}

function buildAuthorSignatureHtml() {
	return `
		<div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #334155;">
			<p style="margin: 0 0 8px;"><strong>Clayton Rodrigues Souza</strong><br />Cloud Solutions Architect | DevOps | SRE | Technical Account Manager</p>
			<p style="margin: 0 0 6px;">🎥 Youtube: <a href="https://www.youtube.com/channel/UCeUywiFV6oo5kEJY4JKyL1A">https://www.youtube.com/channel/UCeUywiFV6oo5kEJY4JKyL1A</a></p>
			<p style="margin: 0 0 6px;">📷 Instagram: <a href="https://www.instagram.com/techtinhoofc?utm_source=qr&amp;igsh=ZGpzMTl0cmg1eXRq">https://www.instagram.com/techtinhoofc?utm_source=qr&amp;igsh=ZGpzMTl0cmg1eXRq</a></p>
			<p style="margin: 0 0 6px;">💼 LinkedIn: <a href="https://www.linkedin.com/in/clayton-rodrigues-souza-5276b875/">https://www.linkedin.com/in/clayton-rodrigues-souza-5276b875/</a></p>
			<p style="margin: 0 0 6px;">🐱 GitHub: <a href="https://github.com/ClaytonSouza-Tec">https://github.com/ClaytonSouza-Tec</a></p>
			<p style="margin: 0 0 6px;">🎓 Udemy: <a href="https://www.udemy.com/user/clayton-souza-4/">https://www.udemy.com/user/clayton-souza-4/</a></p>
			<p style="margin: 0 0 6px;">📚 Transcrição Microsoft: <a href="https://learn.microsoft.com/en-us/users/claytonrodriguessouza-7987/transcript/vnmmpfr9m6xo0mg?tab=credentials-tab&amp;source=docs">https://learn.microsoft.com/en-us/users/claytonrodriguessouza-7987/transcript/vnmmpfr9m6xo0mg?tab=credentials-tab&amp;source=docs</a></p>
			<p style="margin: 0;">🏆 Credly: <a href="https://www.credly.com/users/clayton-souza/badges#credly">https://www.credly.com/users/clayton-souza/badges#credly</a></p>
		</div>
	`;
}

function buildUnsubscribeText(email) {
	return `Para cancelar inscrição clique aqui: ${buildUnsubscribeUrl(email)}`;
}

function buildUnsubscribeHtml(email) {
	return `<p style="margin-top: 24px;"><a href="${buildUnsubscribeUrl(email)}" style="color: #2563eb;">Para cancelar inscrição clique aqui</a></p>`;
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
	
	// Log da tentativa de envio
	console.log(`[Azure Email] Tentando enviar para ${to} com MailFrom: ${cfg.from}`);
	
	try {
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

		console.log(`[Azure Email] beginSend retornou poller ID: ${poller.operationId}`);
		
		const result = await poller.pollUntilDone();
		
		if (result.status !== "Succeeded") {
			console.error(`[Azure Email] Erro no status: ${result.status}`, result);
			throw new Error(`Falha ao enviar e-mail via Azure Communication Services. Status: ${result.status}`);
		}

		console.log(`[Azure Email] E-mail enviado com sucesso para ${to}`);
		return { enabled: true, provider: "azure-communication-services", result };
	} catch (error) {
		console.error("[Azure Email] Erro ao enviar:", error.message || error);
		console.error("[Azure Email] Detalhes do erro:", error);
		throw error;
	}
}

async function sendWithSmtp({ to, subject, text, html }) {
	const cfg = getSmtpConfig();
	console.log(`[SMTP] Tentando enviar para ${to} com MailFrom: ${cfg.from} (host: ${cfg.host}:${cfg.port})`);
	
	try {
		const transporter = createSmtpTransporter();
		await transporter.sendMail({
			from: cfg.from,
			to,
			subject,
			text,
			html
		});
		console.log(`[SMTP] E-mail enviado com sucesso para ${to}`);
		return { enabled: true, provider: "smtp" };
	} catch (error) {
		console.error("[SMTP] Erro ao enviar:", error.message || error);
		throw error;
	}
}

async function sendEmailMessage(payload) {
	if (isAzureMailConfigured()) {
		console.log("[Mail] Usando Azure Communication Services Email");
		return sendWithAzureEmail(payload);
	}

	if (isSmtpConfigured()) {
		console.log("[Mail] Usando SMTP");
		return sendWithSmtp(payload);
	}

	console.warn("[Mail] Nenhum provedor de e-mail configurado (Azure Communication Services ou SMTP)");
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
	const unsubscribeText = buildUnsubscribeText(email);
	const signatureText = buildAuthorSignatureText();
	const unsubscribeHtml = buildUnsubscribeHtml(email);
	const signatureHtml = buildAuthorSignatureHtml();

	return sendEmailMessage({
		to: email,
		subject: "Inscrição confirmada - CRSouza Blog",
		text: `Olá ${name || ""}, sua inscrição foi confirmada em ${dateLabel}.\n\n${unsubscribeText}\n${signatureText}`,
		html: `<p>Olá <strong>${String(name || "")}</strong>,</p><p>Sua inscrição foi confirmada em ${dateLabel}.</p>${unsubscribeHtml}${signatureHtml}`
	});
}

function buildNewsEmailText(name, newsItems, email) {
	const intro = `Olá ${name || ""}, seguem as novidades do CRSouza Blog:\n\n`;
	const body = newsItems
		.map((item, index) => `${index + 1}. ${item.title}\n${item.meta}\n${item.summary}`)
		.join("\n\n");
	return `${intro}${body}\n\n${buildUnsubscribeText(email)}\n${buildAuthorSignatureText()}`;
}

function buildNewsEmailHtmlWithFooter(name, newsItems, email) {
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
					${buildUnsubscribeHtml(email)}
					${buildAuthorSignatureHtml()}
				</td>
			</tr>
		</table>
	`;
}

async function sendNewsUpdateEmail({ name, email, newsItems }) {
	if (!isMailConfigured()) {
		return { enabled: false };
	}

	return sendEmailMessage({
		to: email,
		subject: "Novas notícias no CRSouza Blog",
		text: buildNewsEmailText(name, newsItems, email),
		html: buildNewsEmailHtmlWithFooter(name, newsItems, email)
	});
}

module.exports = {
	isMailConfigured,
	verifyMailConfiguration,
	sendSubscriptionConfirmationEmail,
	sendNewsUpdateEmail
};
