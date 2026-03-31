const { EmailClient } = require("@azure/communication-email");

function getAzureEmailConfig() {
  return {
    connectionString: String(process.env.AZURE_EMAIL_CONNECTION_STRING || "").trim(),
    from: String(process.env.MAIL_FROM || "").trim()
  };
}

function isAzureMailConfigured() {
  const cfg = getAzureEmailConfig();
  return Boolean(cfg.connectionString && cfg.from);
}

function isMailConfigured() {
  return isAzureMailConfigured();
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
    "Youtube: https://www.youtube.com/channel/UCeUywiFV6oo5kEJY4JKyL1A",
    "Instagram: https://www.instagram.com/techtinhoofc?utm_source=qr&igsh=ZGpzMTl0cmg1eXRq",
    "LinkedIn: https://www.linkedin.com/in/clayton-rodrigues-souza-5276b875/",
    "GitHub: https://github.com/ClaytonSouza-Tec",
    "Udemy: https://www.udemy.com/user/clayton-souza-4/",
    "Microsoft Learn: https://learn.microsoft.com/en-us/users/claytonrodriguessouza-7987/transcript/vnmmpfr9m6xo0mg?tab=credentials-tab&source=docs",
    "Credly: https://www.credly.com/users/clayton-souza/badges#credly"
  ].join("\n");
}

function buildAuthorSignatureHtml() {
  return `
    <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #334155;">
      <p style="margin: 0 0 8px;"><strong>Clayton Rodrigues Souza</strong><br />Cloud Solutions Architect | DevOps | SRE | Technical Account Manager</p>
      <p style="margin: 0 0 6px;">Youtube: <a href="https://www.youtube.com/channel/UCeUywiFV6oo5kEJY4JKyL1A">https://www.youtube.com/channel/UCeUywiFV6oo5kEJY4JKyL1A</a></p>
      <p style="margin: 0 0 6px;">Instagram: <a href="https://www.instagram.com/techtinhoofc?utm_source=qr&amp;igsh=ZGpzMTl0cmg1eXRq">https://www.instagram.com/techtinhoofc?utm_source=qr&amp;igsh=ZGpzMTl0cmg1eXRq</a></p>
      <p style="margin: 0 0 6px;">LinkedIn: <a href="https://www.linkedin.com/in/clayton-rodrigues-souza-5276b875/">https://www.linkedin.com/in/clayton-rodrigues-souza-5276b875/</a></p>
      <p style="margin: 0 0 6px;">GitHub: <a href="https://github.com/ClaytonSouza-Tec">https://github.com/ClaytonSouza-Tec</a></p>
      <p style="margin: 0 0 6px;">Udemy: <a href="https://www.udemy.com/user/clayton-souza-4/">https://www.udemy.com/user/clayton-souza-4/</a></p>
      <p style="margin: 0 0 6px;">Microsoft Learn: <a href="https://learn.microsoft.com/en-us/users/claytonrodriguessouza-7987/transcript/vnmmpfr9m6xo0mg?tab=credentials-tab&amp;source=docs">https://learn.microsoft.com/en-us/users/claytonrodriguessouza-7987/transcript/vnmmpfr9m6xo0mg?tab=credentials-tab&amp;source=docs</a></p>
      <p style="margin: 0;">Credly: <a href="https://www.credly.com/users/clayton-souza/badges#credly">https://www.credly.com/users/clayton-souza/badges#credly</a></p>
    </div>
  `;
}

function buildUnsubscribeText(email) {
  return `Para cancelar inscricao clique aqui: ${buildUnsubscribeUrl(email)}`;
}

function buildUnsubscribeHtml(email) {
  return `<p style="margin-top: 24px;"><a href="${buildUnsubscribeUrl(email)}" style="color: #2563eb;">Para cancelar inscricao clique aqui</a></p>`;
}

function buildNewsItemUrl(urlPath) {
  const pathValue = String(urlPath || "").trim();
  if (!pathValue) {
    return getPublicBaseUrl();
  }

  if (/^https?:\/\//i.test(pathValue)) {
    return pathValue;
  }

  const normalizedPath = pathValue.startsWith("/") ? pathValue : `/${pathValue}`;
  return `${getPublicBaseUrl()}${normalizedPath}`;
}

async function verifyMailConfiguration() {
  if (!isAzureMailConfigured()) {
    return { enabled: false };
  }

  return { enabled: true, provider: "azure-communication-services" };
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

async function sendEmailMessage(payload) {
  if (isAzureMailConfigured()) {
    return sendWithAzureEmail(payload);
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
  const unsubscribeText = buildUnsubscribeText(email);
  const signatureText = buildAuthorSignatureText();
  const unsubscribeHtml = buildUnsubscribeHtml(email);
  const signatureHtml = buildAuthorSignatureHtml();

  return sendEmailMessage({
    to: email,
    subject: "Inscricao confirmada - CRSouza Blog",
    text: `Ola ${name || ""}, sua inscricao foi confirmada em ${dateLabel}.\n\n${unsubscribeText}\n${signatureText}`,
    html: `<p>Ola <strong>${String(name || "")}</strong>,</p><p>Sua inscricao foi confirmada em ${dateLabel}.</p>${unsubscribeHtml}${signatureHtml}`
  });
}

function buildNewsEmailText(name, newsItems, email) {
  const intro = `Ola ${name || ""}, seguem as novidades do CRSouza Blog:\n\n`;
  const body = newsItems
    .map((item, index) => {
      const articleUrl = buildNewsItemUrl(item.url);
      return `${index + 1}. ${item.title}\n${item.meta}\n${item.summary}\nLeia no blog: ${articleUrl}`;
    })
    .join("\n\n");
  const cta = "Acesse o blog e contribua com o seu comentario sobre o artigo.";
  return `${intro}${body}\n\n${cta}\n\n${buildUnsubscribeText(email)}\n${buildAuthorSignatureText()}`;
}

function buildNewsEmailHtmlWithFooter(name, newsItems, email) {
  const articles = newsItems
    .map((item) => {
      const articleUrl = buildNewsItemUrl(item.url);
      return `
      <tr>
        <td style="padding: 0 0 24px;">
          <p style="margin: 0 0 6px; color: #7c8aa5; font-size: 13px;">${item.meta}</p>
          <h2 style="margin: 0 0 10px; font-size: 20px; color: #111827;">${item.title}</h2>
          <p style="margin: 0; color: #374151; line-height: 1.6;">${item.summary}</p>
          <p style="margin: 10px 0 0;"><a href="${articleUrl}" style="color: #2563eb;">Ler artigo no blog</a></p>
        </td>
      </tr>
    `;
    })
    .join("");

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
      <tr>
        <td style="padding: 24px; background: #0f172a; color: #ffffff;">
          <h1 style="margin: 0; font-size: 28px;">CRSouza Blog</h1>
          <p style="margin: 8px 0 0; color: #cbd5e1;">Novidades da home para ${name || "voce"}</p>
        </td>
      </tr>
      <tr>
        <td style="padding: 24px; background: #ffffff;">
          ${articles}
          <p style="margin: 0 0 16px; color: #111827; font-weight: 600;">Acesse o blog e contribua com o seu comentario sobre o artigo.</p>
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
    subject: "Novas noticias no CRSouza Blog",
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
