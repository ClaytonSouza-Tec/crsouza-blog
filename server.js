const express = require("express");

require("dotenv").config();

const {
  openDatabase,
  initializeDatabase,
  runQuery,
  appendSubscriberToMarkdown,
  appendCommentToMarkdown,
  getCommentsFromMarkdown
} = require("./lib/subscribers");
const {
  isMailConfigured,
  verifyMailConfiguration,
  sendSubscriptionConfirmationEmail
} = require("./lib/mail-service");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const db = openDatabase();

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
    await runQuery(
      db,
      `
      INSERT INTO subscribers (name, email, created_at, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(email)
      DO UPDATE SET name = excluded.name, updated_at = excluded.updated_at
      `,
      [name, email, now, now]
    );

    appendSubscriberToMarkdown(name, email, nowDate);

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

    if (/smtp|auth|mail|greeting|connection|timeout|certificate/i.test(String(error.message || ""))) {
      res.status(502).json({
        error: "Inscrição registrada, mas houve falha no envio do e-mail. Verifique a configuração SMTP."
      });
      return;
    }

    res.status(500).json({ error: "Falha ao cadastrar inscrição." });
  }
});

app.get("/health", (req, res) => {
  res.status(200).json({ ok: true });
});

app.post("/api/comments", (req, res) => {
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
    const now = new Date();
    appendCommentToMarkdown(name, now, comment);

    // Retorna todos os comentários atualizados
    const allComments = getCommentsFromMarkdown();

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

app.get("/api/comments", (req, res) => {
  try {
    const comments = getCommentsFromMarkdown();
    res.status(200).json({ comments });
  } catch (error) {
    console.error("Erro ao buscar comentários:", error.message || error);
    res.status(500).json({ error: "Falha ao buscar comentários." });
  }
});

if (isMailConfigured()) {
  verifyMailConfiguration()
    .then(() => {
      console.log("SMTP configurado e validado com sucesso.");
    })
    .catch((error) => {
      console.error("Falha ao validar SMTP:", error.message || error);
    });
} else {
  console.warn("SMTP não configurado. Defina SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS e MAIL_FROM no .env.");
}

initializeDatabase(db)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor iniciado em http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Falha ao inicializar banco de inscritos:", error.message || error);
    process.exit(1);
  });