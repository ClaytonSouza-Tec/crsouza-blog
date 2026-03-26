const SUBSCRIBERS_KEY = "crsouzaBlogSubscribers";
const SUBSCRIBE_API_ENDPOINT = "/api/subscribe";
const COMMENTS_API_ENDPOINT = "/api/comments";
const COMMENT_FLASH_MESSAGE_KEY = "crsouzaBlogCommentFlashMessage";
const COMMENTS_MARKDOWN_PATH = "data/comentarios.md";

function getApiBaseUrl() {
  const { protocol, hostname, port } = window.location;

  if (protocol === "file:") {
    return "http://127.0.0.1:3000";
  }

  if ((hostname === "127.0.0.1" || hostname === "localhost") && port && port !== "3000") {
    return `${window.location.protocol}//${hostname}:3000`;
  }

  return "";
}

function buildApiUrl(path) {
  return `${getApiBaseUrl()}${path}`;
}

function parseCommentsMarkdown(markdown) {
  return String(markdown || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|"))
    .filter((line) => !/^\|\s*-/.test(line))
    .map((line) => line.split("|").map((part) => part.trim()).filter(Boolean))
    .filter((parts) => parts.length >= 4)
    .filter((parts) => !(parts[0] === "Nome" && parts[1] === "Data"))
    .map((parts) => ({
      name: parts[0],
      date: parts[1],
      time: parts[2],
      text: parts.slice(3).join(" | ")
    }))
    .filter((comment) => comment.name && comment.text)
    .reverse();
}

async function loadCommentsFromMarkdown() {
  const response = await fetch(COMMENTS_MARKDOWN_PATH, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Falha ao carregar comentarios.md");
  }

  const markdown = await response.text();
  return parseCommentsMarkdown(markdown);
}

function setCommentFlashMessage(text) {
  sessionStorage.setItem(COMMENT_FLASH_MESSAGE_KEY, String(text || ""));
}

function consumeCommentFlashMessage() {
  const text = sessionStorage.getItem(COMMENT_FLASH_MESSAGE_KEY);
  if (!text) {
    return "";
  }

  sessionStorage.removeItem(COMMENT_FLASH_MESSAGE_KEY);
  return text;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDateTime(isoDate) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short"
    }).format(new Date());
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function getSubscribers() {
  try {
    const raw = localStorage.getItem(SUBSCRIBERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSubscriber(subscriber) {
  const list = getSubscribers();
  const email = String(subscriber.email || "").toLowerCase();
  const next = list.filter((item) => String(item.email || "").toLowerCase() !== email);
  next.unshift(subscriber);
  localStorage.setItem(SUBSCRIBERS_KEY, JSON.stringify(next));
}

function isStaticHosting() {
  const host = window.location.hostname.toLowerCase();
  return window.location.protocol === "file:" || host.endsWith("github.io");
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function initCarousel() {
  const slides = Array.from(document.querySelectorAll(".carousel-slide"));
  const dotsContainer = document.getElementById("carouselDots");
  const prevBtn = document.getElementById("prevSlide");
  const nextBtn = document.getElementById("nextSlide");

  if (!slides.length || !dotsContainer || !prevBtn || !nextBtn) {
    return;
  }

  let currentIndex = slides.findIndex((slide) => slide.classList.contains("active"));
  currentIndex = currentIndex === -1 ? 0 : currentIndex;

  const dotConfig = [
    { className: "dot dot-red", target: 0 },
    { className: "dot dot-green", target: 1 },
    { className: "dot dot-blue", target: 2 },
    { className: "dot dot-yellow", target: 3 }
  ];

  const dots = dotConfig.slice(0, slides.length).map((config, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = config.className;
    dot.dataset.target = String(Math.min(config.target, slides.length - 1));
    dot.setAttribute("aria-label", `Ir para controle ${index + 1}`);

    dot.addEventListener("click", () => goTo(Number(dot.dataset.target)));
    dotsContainer.appendChild(dot);
    return dot;
  });

  function render() {
    slides.forEach((slide, index) => {
      slide.classList.toggle("active", index === currentIndex);
    });
    dots.forEach((dot) => {
      dot.classList.toggle("active", Number(dot.dataset.target) === currentIndex);
    });
  }

  function goTo(index) {
    currentIndex = (index + slides.length) % slides.length;
    render();
  }

  prevBtn.addEventListener("click", () => goTo(currentIndex - 1));
  nextBtn.addEventListener("click", () => goTo(currentIndex + 1));

  setInterval(() => {
    goTo(currentIndex + 1);
  }, 5000);

  render();
}

function initCommentForm() {
  const form = document.getElementById("commentForm");
  if (!form) {
    return;
  }

  const message = document.getElementById("formMessage");
  const pendingMessage = consumeCommentFlashMessage();

  if (message && pendingMessage) {
    message.textContent = pendingMessage;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const commentText = String(formData.get("comment") || "").trim();

    if (!name) {
      if (message) message.textContent = "Informe seu nome para enviar o comentário.";
      return;
    }

    if (!commentText) {
      if (message) message.textContent = "Escreva um comentário antes de enviar.";
      return;
    }

    const submitBtn = form.querySelector("button[type='submit']");
    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando...";

    if (isStaticHosting()) {
      if (message) {
        message.textContent = "No GitHub Pages, novos comentários não podem ser enviados. Aqui são exibidos apenas os comentários já publicados.";
      }
      submitBtn.disabled = false;
      submitBtn.textContent = "Enviar comentário";
      return;
    }

    try {
      const response = await fetch(buildApiUrl(COMMENTS_API_ENDPOINT), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, comment: commentText })
      });

      let data;
      try { data = await response.json(); } catch { data = null; }

      if (!response.ok) {
        // Servidor respondeu com erro (validação, etc.) — exibe para o usuário
        throw new Error(data?.error || "Falha ao enviar comentário.");
      }

      // Sucesso: comentário salvo no comentarios.md via API
      const successMessage = data?.message || "Comentário enviado com sucesso!";
      setCommentFlashMessage(successMessage);
      if (message) message.textContent = successMessage;
      form.reset();
      renderCommentsOnTipsPage();
    } catch (error) {
      if (message) message.textContent = error.message || "Falha ao enviar comentário.";
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Enviar comentário";
    }
  });
}

function initSubscription() {
  const subscribeButton = document.getElementById("subscribeButton");
  if (!subscribeButton) {
    return;
  }

  const nameInput = document.getElementById("name");
  const emailInput = document.getElementById("email");
  const message = document.getElementById("formMessage");

  subscribeButton.addEventListener("click", async () => {
    const name = String(nameInput?.value || "").trim();
    const email = String(emailInput?.value || "").trim();

    if (!name) {
      if (message) {
        message.textContent = "Informe seu nome para enviar a inscrição.";
      }
      return;
    }

    if (!email) {
      if (message) {
        message.textContent = "Informe seu e-mail para enviar a inscrição.";
      }
      return;
    }

    if (!isValidEmail(email)) {
      if (message) {
        message.textContent = "Informe um e-mail válido para concluir a inscrição.";
      }
      return;
    }

    subscribeButton.disabled = true;
    subscribeButton.textContent = "Enviando...";

    try {
      if (isStaticHosting()) {
        if (message) {
          message.textContent = "No GitHub Pages, a inscrição não envia e-mail porque não há backend ativo. Para receber e-mail, use a versão com servidor.";
        }
        return;
      }

      let response;

      try {
        response = await fetch(buildApiUrl(SUBSCRIBE_API_ENDPOINT), {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ name, email })
        });
      } catch {
        saveSubscriber({ name, email, createdAt: new Date().toISOString() });
        if (message) {
          message.textContent = "API indisponível no momento. Inscrição registrada localmente neste navegador.";
        }
        return;
      }

      let payload = null;

      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok) {
        throw new Error(payload?.error || "Falha ao cadastrar inscrição.");
      }

      if (message) {
        message.textContent = payload?.message || "Inscrição realizada com sucesso! Seu cadastro foi registrado.";
      }
    } catch (error) {
      if (message) {
        message.textContent = error.message || "Falha ao cadastrar inscrição.";
      }
    } finally {
      subscribeButton.disabled = false;
      subscribeButton.textContent = "Enviar inscrição";
    }
  });
}

function renderCommentsOnTipsPage() {
  const list = document.getElementById("commentsList");
  if (!list) return;

  loadAndRenderComments(list);
}

async function loadAndRenderComments(list) {
  let comments = [];
  try {
    const response = await fetch(buildApiUrl(COMMENTS_API_ENDPOINT));
    if (!response.ok) {
      throw new Error("Falha ao carregar comentários");
    }

    let data;
    try { data = await response.json(); } catch { data = null; }
    comments = data?.comments || [];
  } catch {
    try {
      comments = await loadCommentsFromMarkdown();
    } catch {
      list.innerHTML = '<p class="empty-message">Não foi possível carregar comentários no momento.</p>';
      return;
    }
  }

  if (!comments.length) {
    list.innerHTML = '<p class="empty-message">Ainda não há comentários. Seja o primeiro!</p>';
    return;
  }

  renderCommentsList(list, comments);
}

function renderCommentsList(list, comments) {
  list.innerHTML = comments
    .map((comment) => {
      const safeName = escapeHtml(comment.name || "Leitor");
      const safeText = escapeHtml(comment.text || "");
      const when = escapeHtml(
        comment.when || `${comment.date} ${comment.time}` || formatDateTime(comment.createdAt || new Date().toISOString())
      );

      return `
        <article class="comment-item searchable-item" data-tags="comentario comunidade dica">
          <p class="comment-meta"><strong>${safeName}</strong> em ${when}</p>
          <p class="text">${safeText}</p>
        </article>
      `;
    })
    .join("");
}

function initSearch() {
  const input = document.getElementById("globalSearch");
  if (!input) {
    return;
  }

  const searchableItems = Array.from(document.querySelectorAll(".searchable-item"));

  input.addEventListener("input", () => {
    const term = input.value.trim().toLowerCase();

    searchableItems.forEach((item) => {
      const text = item.textContent?.toLowerCase() || "";
      const tags = (item.getAttribute("data-tags") || "").toLowerCase();
      const match = !term || text.includes(term) || tags.includes(term);
      item.classList.toggle("hidden-by-search", !match);
    });
  });
}

function init() {
  initCarousel();
  initCommentForm();
  initSubscription();
  renderCommentsOnTipsPage();
  initSearch();
}

document.addEventListener("DOMContentLoaded", init);
