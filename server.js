const express = require("express");

require("dotenv").config();

const {
  initializeDataStore,
  upsertSubscriber,
  isDuplicateSubscriberError,
  addComment,
  listComments,
  isAzureStorageConfigured
} = require("./lib/subscribers");
const {
  isMailConfigured,
  verifyMailConfiguration,
  sendSubscriptionConfirmationEmail
} = require("./lib/mail-service");

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

    const mailResult = await sendSubscriptionConfirmationEmail({
      name,
      email,
      createdAt: nowDate
    });

    if (!mailResult.enabled) {
      console.warn("SMTP não configurado. Inscrição registrada sem envio de e-mail.");
      res.status(202).json({
        ok: true,
        message: "Inscrição registrada. Configure o SMTP no arquivo .env para habilitar o envio de e-mail."
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
  const storageMode = isAzureStorageConfigured() ? "azure-table-storage" : "local-fallback";
  const emailMode = process.env.AZURE_EMAIL_CONNECTION_STRING
    ? "azure-communication-services"
    : (isMailConfigured() ? "smtp" : "not-configured");

  res.status(200).json({
    ok: true,
    storageMode,
    emailMode,
    usingAzureStorage: isAzureStorageConfigured(),
    usingAzureEmail: Boolean(process.env.AZURE_EMAIL_CONNECTION_STRING)
  });
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
    const smtpHost = process.env.SMTP_HOST ? "✓ Configurado" : "✗ Não configurado";
    const nodeEnv = process.env.NODE_ENV || "não definido";
    
    res.status(200).json({
      mailConfigured: result.enabled,
      provider: result.provider,
      environment: nodeEnv,
      azure: {
        connectionString: azureEmailConnStr,
        mailFrom: mailFrom
      },
      smtp: {
        host: smtpHost,
        port: process.env.SMTP_PORT || "não definido"
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
        details: "Configure AZURE_EMAIL_CONNECTION_STRING e MAIL_FROM, ou SMTP_HOST/SMTP_USER/SMTP_PASS"
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
  console.warn("Serviço de e-mail não configurado. Defina AZURE_EMAIL_CONNECTION_STRING e MAIL_FROM, ou mantenha SMTP_* para fallback local.");
}

initializeDataStore()
  .then(() => {
    console.log(`Persistência ativa: ${isAzureStorageConfigured() ? "Azure Table Storage" : "SQLite/Markdown local"}`);
    app.listen(PORT, () => {
      console.log(`Servidor iniciado em http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Falha ao inicializar banco de inscritos:", error.message || error);
    process.exit(1);
  });