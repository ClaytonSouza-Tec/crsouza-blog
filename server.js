const express = require("express");

require("dotenv").config();

const {
  initializeDataStore,
  upsertSubscriber,
  isDuplicateSubscriberError,
  removeSubscriber,
  addComment,
  listComments,
  isAzureStorageConfigured
} = require("./lib/subscribers");
const {
  isMailConfigured,
  verifyMailConfiguration,
  sendSubscriptionConfirmationEmail
} = require("./lib/mail-service");
const {
  ensureAnalyticsTable,
  trackEvent,
  getMonthlyReport
} = require("./lib/analytics");

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }

  next();
});

app.use(express.json());
app.use(express.static(__dirname));

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getPagePathFromReferrer(referrer) {
  try {
    const url = new URL(String(referrer || ""));
    return `${url.pathname || "/"}${url.search || ""}`;
  } catch {
    return "/";
  }
}

app.get("/unsubscribe", async (req, res) => {
  const email = String(req.query?.email || "").trim().toLowerCase();

  if (!isValidEmail(email)) {
    res.status(400).send(`<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Cancelar inscrição</title>
  </head>
  <body style="font-family: Arial, sans-serif; padding: 32px; background: #0f172a; color: #e2e8f0;">
    <h1 style="color: #f8fafc;">Link inválido</h1>
    <p>O link de cancelamento está inválido ou incompleto.</p>
  </body>
</html>`);
    return;
  }

  try {
    const result = await removeSubscriber(email);
    const title = result.removed ? "Inscrição cancelada" : "Inscrição já cancelada";
    const message = result.removed
      ? `O e-mail ${email} foi removido com sucesso da lista de inscrições.`
      : `O e-mail ${email} já não estava mais inscrito.`;

    res.status(200).send(`<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
  </head>
  <body style="font-family: Arial, sans-serif; padding: 32px; background: #0f172a; color: #e2e8f0;">
    <div style="max-width: 640px; margin: 0 auto; background: #111827; border: 1px solid #334155; border-radius: 16px; padding: 24px;">
      <h1 style="margin-top: 0; color: #f8fafc;">${title}</h1>
      <p style="line-height: 1.6;">${message}</p>
      <p><a href="/index.html" style="color: #38bdf8;">Voltar para o blog</a></p>
    </div>
  </body>
</html>`);
  } catch (error) {
    console.error("Erro ao cancelar inscrição:", error.message || error);
    res.status(500).send(`<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Erro ao cancelar inscrição</title>
  </head>
  <body style="font-family: Arial, sans-serif; padding: 32px; background: #0f172a; color: #e2e8f0;">
    <h1 style="color: #f8fafc;">Erro ao cancelar inscrição</h1>
    <p>Não foi possível concluir o cancelamento neste momento.</p>
  </body>
</html>`);
  }
});

app.post("/api/subscribe", async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const email = String(req.body?.email || "").trim().toLowerCase();

  if (!name || !email) {
    res.status(400).json({ error: "Nome e e-mail são obrigatórios." });
    return;
  }

  if (!isValidEmail(email)) {
    res.status(400).json({ error: "E-mail inválido." });
    return;
  }

  const now = new Date().toISOString();
  const nowDate = new Date(now);

  try {
    await upsertSubscriber({
      name,
      email,
      createdAt: now,
      updatedAt: now
    });

    await trackEvent(
      {
        eventType: "subscribe_submit_success",
        pagePath: getPagePathFromReferrer(req.headers.referer),
        targetType: "form",
        targetId: "subscribeForm",
        targetLabel: "Inscricao",
        sessionId: String(req.headers["x-session-id"] || ""),
        referrer: String(req.headers.referer || ""),
        source: "server"
      },
      {
        userAgent: String(req.headers["user-agent"] || "")
      }
    ).catch((error) => {
      console.warn("Falha ao registrar analytics de inscricao:", error.message || error);
    });

    const mailResult = await sendSubscriptionConfirmationEmail({
      name,
      email,
      createdAt: nowDate
    });

    if (!mailResult.enabled) {
      console.warn("Azure Communication Services Email não configurado. Inscrição registrada sem envio de e-mail.");
      res.status(202).json({
        ok: true,
        message: "Inscrição registrada. Configure AZURE_EMAIL_CONNECTION_STRING e MAIL_FROM para habilitar o envio de e-mail."
      });
      return;
    }

    res.status(200).json({
      ok: true,
      message: "Inscrição realizada com sucesso. O e-mail de confirmação foi enviado."
    });
  } catch (error) {
    console.error("Erro ao processar inscricao:", error.message || error);
    console.error("Stack trace:", error.stack);

    if (isDuplicateSubscriberError(error)) {
      res.status(409).json({ error: "E-mail já inscrito." });
      return;
    }

    // Verifica se o erro é de envio de e-mail
    const errorMsg = String(error.message || "").toLowerCase();
    const isEmailError = /smtp|auth|mail|greeting|connection|timeout|certificate|azure|communication|email/i.test(errorMsg);
    
    if (isEmailError) {
      console.error("[Subscribe] Erro identificado como sendo de e-mail:", error.message);
      res.status(502).json({
        error: "Inscrição registrada, mas houve falha no envio do e-mail. Tente novamente em alguns momentos."
      });
      return;
    }

    res.status(500).json({ error: "Falha ao cadastrar inscrição." });
  }
});

app.get("/health", (req, res) => {
  const storageMode = isAzureStorageConfigured() ? "azure-table-storage" : "not-configured";
  const emailMode = process.env.AZURE_EMAIL_CONNECTION_STRING
    ? "azure-communication-services"
    : "not-configured";

  res.status(200).json({
    ok: true,
    storageMode,
    emailMode,
    usingAzureStorage: isAzureStorageConfigured(),
    usingAzureEmail: Boolean(process.env.AZURE_EMAIL_CONNECTION_STRING)
  });
});

app.post("/api/analytics/events", async (req, res) => {
  try {
    const eventType = String(req.body?.eventType || "").trim();
    if (!eventType) {
      res.status(400).json({ error: "eventType e obrigatorio." });
      return;
    }

    await trackEvent(
      {
        eventType,
        pagePath: req.body?.pagePath,
        targetType: req.body?.targetType,
        targetId: req.body?.targetId,
        targetLabel: req.body?.targetLabel,
        sessionId: req.body?.sessionId,
        timestamp: req.body?.timestamp,
        referrer: req.body?.referrer || req.headers.referer,
        source: req.body?.source || "web"
      },
      {
        userAgent: String(req.headers["user-agent"] || "")
      }
    );

    res.status(201).json({ ok: true });
  } catch (error) {
    console.error("Erro ao registrar evento de analytics:", error.message || error);
    res.status(500).json({ error: "Falha ao registrar evento de analytics." });
  }
});

app.get("/api/analytics/reports/monthly", async (req, res) => {
  try {
    const month = String(req.query?.month || "").trim();
    const report = await getMonthlyReport(month);
    res.status(200).json({ ok: true, report });
  } catch (error) {
    console.error("Erro ao gerar relatorio mensal de analytics:", error.message || error);
    res.status(500).json({ error: "Falha ao gerar relatorio mensal de analytics." });
  }
});

app.post("/api/comments", async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const comment = String(req.body?.comment || "").trim();

  if (!name || !comment) {
    res.status(400).json({ error: "Nome e comentário são obrigatórios." });
    return;
  }

  if (comment.length > 500) {
    res.status(400).json({ error: "Comentário não pode ter mais de 500 caracteres." });
    return;
  }

  try {
    const now = new Date().toISOString();
    await addComment({
      name,
      text: comment,
      createdAt: now
    });

    await trackEvent(
      {
        eventType: "comment_submit_success",
        pagePath: getPagePathFromReferrer(req.headers.referer),
        targetType: "form",
        targetId: "commentForm",
        targetLabel: "Comentario",
        sessionId: String(req.headers["x-session-id"] || ""),
        referrer: String(req.headers.referer || ""),
        source: "server"
      },
      {
        userAgent: String(req.headers["user-agent"] || "")
      }
    ).catch((error) => {
      console.warn("Falha ao registrar analytics de comentario:", error.message || error);
    });

    const allComments = await listComments();

    res.status(201).json({
      ok: true,
      message: "Comentário adicionado com sucesso.",
      comments: allComments
    });
  } catch (error) {
    console.error("Erro ao salvar comentário:", error.message || error);
    res.status(500).json({ error: "Falha ao salvar comentário." });
  }
});

app.get("/api/comments", async (req, res) => {
  try {
    const comments = await listComments();
    res.status(200).json({ comments });
  } catch (error) {
    console.error("Erro ao buscar comentários:", error.message || error);
    res.status(500).json({ error: "Falha ao buscar comentários." });
  }
});

app.get("/health/email-debug", async (req, res) => {
  try {
    const mailConfig = verifyMailConfiguration();
    const result = await mailConfig;
    
    const azureEmailConnStr = process.env.AZURE_EMAIL_CONNECTION_STRING ? "✓ Configurado" : "✗ Não configurado";
    const mailFrom = process.env.MAIL_FROM ? `✓ ${process.env.MAIL_FROM}` : "✗ Não configurado";
    const nodeEnv = process.env.NODE_ENV || "não definido";
    
    res.status(200).json({
      mailConfigured: result.enabled,
      provider: result.provider,
      environment: nodeEnv,
      azure: {
        connectionString: azureEmailConnStr,
        mailFrom: mailFrom
      }
    });
  } catch (error) {
    res.status(500).json({
      error: "Falha ao verificar configuração de e-mail",
      details: error.message
    });
  }
});

app.post("/health/test-email", async (req, res) => {
  const toEmail = String(req.body?.email || "").trim();
  
  if (!toEmail) {
    res.status(400).json({ error: "E-mail de teste é obrigatório (body: {email: 'test@example.com'})" });
    return;
  }
  
  try {
    console.log(`[Test] Enviando e-mail de teste para ${toEmail}`);
    
    const result = await sendSubscriptionConfirmationEmail({
      name: "Teste",
      email: toEmail,
      createdAt: new Date()
    });
    
    if (!result.enabled) {
      return res.status(503).json({
        error: "E-mail não configurado",
        details: "Configure AZURE_EMAIL_CONNECTION_STRING e MAIL_FROM"
      });
    }
    
    res.status(200).json({
      success: true,
      provider: result.provider,
      message: `E-mail de teste enviado com sucesso para ${toEmail}`,
      details: result
    });
  } catch (error) {
    console.error("[Test] Erro ao enviar e-mail de teste:", error);
    res.status(500).json({
      error: "Falha ao enviar e-mail de teste",
      message: error.message,
      details: String(error)
    });
  }
});

if (isMailConfigured()) {
  verifyMailConfiguration()
    .then(() => {
      console.log("Serviço de e-mail configurado e validado com sucesso.");
    })
    .catch((error) => {
      console.error("Falha ao validar serviço de e-mail:", error.message || error);
    });
} else {
  console.warn("Serviço de e-mail não configurado. Defina AZURE_EMAIL_CONNECTION_STRING e MAIL_FROM.");
}

initializeDataStore()
  .then(async () => {
    await ensureAnalyticsTable();
    console.log(`Persistência ativa: ${isAzureStorageConfigured() ? "Azure Table Storage" : "Não configurada"}`);
    app.listen(PORT, () => {
      console.log(`Servidor iniciado em http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Falha ao inicializar banco de inscritos:", error.message || error);
    process.exit(1);
  });