const COMMENTS_KEY = "crsouzaBlogComments";
const SUBSCRIBERS_KEY = "crsouzaBlogSubscribers";
const SUBSCRIBE_API_ENDPOINT = "/api/subscribe";

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

function getComments() {
  try {
    const raw = localStorage.getItem(COMMENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveComment(comment) {
  const comments = getComments();
  comments.unshift(comment);
  localStorage.setItem(COMMENTS_KEY, JSON.stringify(comments));
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

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const commentText = String(formData.get("comment") || "").trim();

    if (!name) {
      if (message) {
        message.textContent = "Informe seu nome para enviar o comentário.";
      }
      return;
    }

    if (!commentText) {
      if (message) {
        message.textContent = "Escreva um comentário antes de enviar.";
      }
      return;
    }

    saveComment({
      name,
      email,
      text: commentText,
      createdAt: new Date().toISOString()
    });

    form.reset();

    if (message) {
      message.textContent = "Comentário enviado com sucesso! Ele já está disponível na página Dicas.";
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
        saveSubscriber({ name, email, createdAt: new Date().toISOString() });
        if (message) {
          message.textContent = "Inscrição registrada com sucesso no modo GitHub Pages (armazenamento local do navegador).";
        }
        return;
      }

      const response = await fetch(SUBSCRIBE_API_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name, email })
      });

      if (!response.ok) {
        throw new Error("Falha ao cadastrar inscrição.");
      }

      if (message) {
        message.textContent = "Inscrição realizada com sucesso! Seu cadastro foi registrado.";
      }
    } catch {
      saveSubscriber({ name, email, createdAt: new Date().toISOString() });
      if (message) {
        message.textContent = "API indisponível no momento. Inscrição registrada localmente neste navegador.";
      }
    } finally {
      subscribeButton.disabled = false;
      subscribeButton.textContent = "Enviar inscrição";
    }
  });
}

function renderCommentsOnTipsPage() {
  const list = document.getElementById("commentsList");
  if (!list) {
    return;
  }

  const comments = getComments();

  if (!comments.length) {
    list.innerHTML = '<p class="empty-message">Ainda não há comentários. Envie o primeiro na página inicial.</p>';
    return;
  }

  list.innerHTML = comments
    .map((comment) => {
      const safeName = escapeHtml(comment.name || "Leitor");
      const safeText = escapeHtml(comment.text || "");
      const when = formatDateTime(comment.createdAt || new Date().toISOString());

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
