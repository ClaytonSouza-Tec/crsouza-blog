let nodemailer = null;

try {
  nodemailer = require("nodemailer");
} catch (error) {
  console.warn("Nodemailer não está instalado. O envio de e-mails ficará desativado.");
}

const SMTP_HOST = String(process.env.SMTP_HOST || "").trim();
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = String(process.env.SMTP_SECURE || "false").trim().toLowerCase() === "true";
const SMTP_USER = String(process.env.SMTP_USER || "").trim();
const SMTP_PASS = String(process.env.SMTP_PASS || "").trim();
const MAIL_FROM = String(process.env.MAIL_FROM || "").trim();
const MAIL_REPLY_TO = String(process.env.MAIL_REPLY_TO || "").trim();
const MAIL_NOTIFY_TO = String(process.env.MAIL_NOTIFY_TO || "").trim();
const BLOG_URL = String(process.env.BLOG_URL || "http://localhost:3000/index.html").trim();

let mailTransporterPromise = null;

function isMailConfigured() {
  return Boolean(nodemailer && SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS && MAIL_FROM);
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toAbsoluteUrl(urlValue) {
  const input = String(urlValue || "").trim();
  if (!input) {
    return "";
  }

  if (/^https?:\/\//i.test(input)) {
    return input;
  }

  try {
    return new URL(input, BLOG_URL).toString();
  } catch {
    return input;
  }
}

async function getMailTransporter() {
  if (!isMailConfigured()) {
    return null;
  }

  if (!mailTransporterPromise) {
    mailTransporterPromise = (async () => {
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS
        }
      });

      await transporter.verify();
      return transporter;
    })();
  }

  return mailTransporterPromise;
}

function getSignatureTextLines() {
  return [
    "Att,",
    "",
    "Clayton Rodrigues Souza",
    "Cloud Solutions Architect | DevOps | SRE | Technical Account Manager",
    "",
    "YouTube: https://www.youtube.com/channel/UCeUywiFV6oo5kEJY4JKyL1A",
    "Instagram: https://www.instagram.com/techtinhoofc?utm_source=qr&igsh=ZGpzMTl0cmg1eXRq",
    "LinkedIn: https://www.linkedin.com/in/clayton-rodrigues-souza-5276b875/",
    "GitHub: https://github.com/ClaytonSouza-Tec",
    "Udemy: https://www.udemy.com/user/clayton-souza-4/",
    "Transcrição Microsoft: https://learn.microsoft.com/en-us/users/claytonrodriguessouza-7987/transcript/vnmmpfr9m6xo0mg?tab=credentials-tab&source=docs",
    "Credly: https://www.credly.com/users/clayton-souza/badges#credly"
  ];
}

function getSignatureHtml() {
  return [
    "<p>Att,</p>",
    "<p><strong>Clayton Rodrigues Souza</strong><br />Cloud Solutions Architect | DevOps | SRE | Technical Account Manager</p>",
    "<p><a href=\"https://www.youtube.com/channel/UCeUywiFV6oo5kEJY4JKyL1A\">YouTube</a><br />",
    "<a href=\"https://www.instagram.com/techtinhoofc?utm_source=qr&igsh=ZGpzMTl0cmg1eXRq\">Instagram</a><br />",
    "<a href=\"https://www.linkedin.com/in/clayton-rodrigues-souza-5276b875/\">LinkedIn</a><br />",
    "<a href=\"https://github.com/ClaytonSouza-Tec\">GitHub</a><br />",
    "<a href=\"https://www.udemy.com/user/clayton-souza-4/\">Udemy</a><br />",
    "<a href=\"https://learn.microsoft.com/en-us/users/claytonrodriguessouza-7987/transcript/vnmmpfr9m6xo0mg?tab=credentials-tab&source=docs\">Transcrição Microsoft</a><br />",
    "<a href=\"https://www.credly.com/users/clayton-souza/badges#credly\">Credly</a></p>"
  ].join("");
}

function buildWelcomeEmail(name) {
  const safeName = String(name || "").trim() || "leitor";

  return {
    subject: "Inscrição confirmada no CRSouza Blog",
    text: [
      `Olá, ${safeName}!`,
      "",
      "Sua inscrição no CRSouza Blog foi confirmada com sucesso.",
      "",
      "Você passará a receber novidades sobre Cloud, DevOps, IA aplicada e conteúdo educacional.",
      "Se você não solicitou essa inscrição, responda este e-mail para que possamos remover seu cadastro.",
      "",
      ...getSignatureTextLines()
    ].join("\n"),
    html: [
      `<p>Olá, <strong>${escapeHtml(safeName)}</strong>!</p>`,
      "<p>Sua inscrição no CRSouza Blog foi confirmada com sucesso.</p>",
      "<p>Você passará a receber novidades sobre Cloud, DevOps, IA aplicada e conteúdo educacional.</p>",
      "<p>Se você não solicitou essa inscrição, responda este e-mail para que possamos remover seu cadastro.</p>",
      getSignatureHtml()
    ].join("")
  };
}

function buildNewsUpdateEmail(name, newsItems) {
  const safeName = String(name || "").trim() || "leitor";
  const normalizedItems = newsItems
    .slice(0, 4)
    .map((item) => ({
      meta: String(item.meta || "").trim(),
      title: String(item.title || "").trim(),
      summary: String(item.summary || "").trim(),
      image: toAbsoluteUrl(item.image),
      imageAlt: String(item.imageAlt || item.title || "Notícia do carrossel").trim()
    }))
    .filter((item) => item.title);

  const textNewsBlocks = normalizedItems.flatMap((item, index) => [
    `${index + 1}. ${item.title}`,
    item.meta,
    item.summary,
    ""
  ]);

  const htmlNewsBlocks = normalizedItems
    .map(
      (item) => `
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 18px; border-collapse: collapse; border: 1px solid #d9e4f3;">
        <tr>
          <td width="26%" style="padding: 0; vertical-align: top;">
            <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.imageAlt)}" style="display: block; width: 100%; max-width: 100%; height: auto; border: 0;" />
          </td>
          <td width="74%" style="padding: 18px; vertical-align: top; background: #0b68bf; color: #ffffff; font-family: Arial, sans-serif;">
            <p style="margin: 0 0 12px; font-size: 14px; font-weight: 700; color: #cfe6ff;">${escapeHtml(item.meta)}</p>
            <h3 style="margin: 0 0 12px; font-size: 26px; line-height: 1.25; color: #ffffff;">${escapeHtml(item.title)}</h3>
            <p style="margin: 0; font-size: 22px; line-height: 1.45; color: #ecf5ff;">${escapeHtml(item.summary)}</p>
          </td>
        </tr>
      </table>
    `
    )
    .join("");

  return {
    subject: "Novas noticias no CRSouza Blog",
    text: [
      `Olá, ${safeName}!`,
      "",
      "Novas noticias no CRSouza Blog",
      "",
      ...textNewsBlocks,
      `Ler no Blog: ${BLOG_URL}`,
      "",
      ...getSignatureTextLines()
    ].join("\n"),
    html: [
      `<p style="font-family: Arial, sans-serif; font-size: 16px;">Olá, <strong>${escapeHtml(safeName)}</strong>!</p>`,
      "<p style=\"font-family: Arial, sans-serif; font-size: 18px;\"><strong>Novas noticias no CRSouza Blog</strong></p>",
      htmlNewsBlocks,
      `<p style="font-family: Arial, sans-serif;"><a href="${escapeHtml(BLOG_URL)}" style="display: inline-block; padding: 10px 16px; background: #0b68bf; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: 700;">Ler no Blog</a></p>`,
      getSignatureHtml()
    ].join("")
  };
}

async function sendMail({ to, subject, text, html, replyTo, logLabel }) {
  const transporter = await getMailTransporter();

  if (!transporter) {
    return {
      enabled: false
    };
  }

  try {
    console.log(`[SMTP] Enviando ${logLabel} para: ${to}`);
    const result = await transporter.sendMail({
      from: MAIL_FROM,
      to,
      replyTo: replyTo || MAIL_REPLY_TO || undefined,
      subject,
      text,
      html
    });
    console.log("[SMTP] E-mail enviado com sucesso:", result);
    return {
      enabled: true,
      result
    };
  } catch (error) {
    console.error(`[SMTP] Erro ao enviar e-mail: ${error.message || error}`);
    console.error("[SMTP] Detalhes do erro:", error);
    throw error;
  }
}

async function sendSubscriptionConfirmationEmail({ name, email, createdAt }) {
  const welcomeEmail = buildWelcomeEmail(name);
  const deliveries = [
    sendMail({
      to: email,
      subject: welcomeEmail.subject,
      text: welcomeEmail.text,
      html: welcomeEmail.html,
      logLabel: "confirmação"
    })
  ];

  if (MAIL_NOTIFY_TO) {
    deliveries.push(
      sendMail({
        to: MAIL_NOTIFY_TO,
        replyTo: email,
        subject: "Nova inscrição no CRSouza Blog",
        text: [
          "Uma nova inscrição foi recebida.",
          "",
          `Nome: ${name}`,
          `E-mail: ${email}`,
          `Data: ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(createdAt)}`
        ].join("\n"),
        html: [
          "<p>Uma nova inscrição foi recebida.</p>",
          `<p><strong>Nome:</strong> ${escapeHtml(name)}<br />`,
          `<strong>E-mail:</strong> ${escapeHtml(email)}<br />`,
          `<strong>Data:</strong> ${escapeHtml(new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(createdAt))}</p>`
        ].join(""),
        logLabel: "notificação interna"
      })
    );
  }

  const results = await Promise.all(deliveries);
  return {
    enabled: results.some((item) => item.enabled)
  };
}

async function sendNewsUpdateEmail({ name, email, newsItems }) {
  const newsEmail = buildNewsUpdateEmail(name, newsItems);
  return sendMail({
    to: email,
    subject: newsEmail.subject,
    text: newsEmail.text,
    html: newsEmail.html,
    logLabel: "newsletter"
  });
}

async function verifyMailConfiguration() {
  const transporter = await getMailTransporter();
  return Boolean(transporter);
}

module.exports = {
  BLOG_URL,
  isMailConfigured,
  verifyMailConfiguration,
  sendSubscriptionConfirmationEmail,
  sendNewsUpdateEmail
};