const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function rand(a, b) {
  return a + Math.random() * (b - a);
}

function sample(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function showToast(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.classList.add("is-on");
  window.clearTimeout(showToast._t);
  showToast._t = window.setTimeout(() => el.classList.remove("is-on"), 2000);
}

function setShiftText() {
  const el = $("[data-shift]");
  if (!el) return;
  const phrases = ["помнит вас", "сгибает время", "говорит светом", "делает гравитацию мягче", "оставляет привкус", "приходит тихо"];
  let i = 0;
  window.setInterval(() => {
    i = (i + 1) % phrases.length;
    el.setAttribute("data-shift", phrases[i]);
    el.textContent = phrases[i];
  }, 3600);
}

function createMotes() {
  const root = $("#motes");
  if (!root) return;

  const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const count = prefersReduced ? 10 : 22;

  for (let i = 0; i < count; i++) {
    const d = document.createElement("div");
    d.className = "mote";
    const x = rand(0, 100);
    const y = rand(0, 100);
    const dx = rand(-36, 36);
    const dy = rand(-42, 42);
    const dur = rand(5.5, 10.5);
    const size = rand(6, 12);
    const op = rand(0.18, 0.45);

    d.style.left = `${x}%`;
    d.style.top = `${y}%`;
    d.style.setProperty("--dx", String(dx));
    d.style.setProperty("--dy", String(dy));
    d.style.setProperty("--dur", `${dur}s`);
    d.style.width = `${size}px`;
    d.style.height = `${size}px`;
    d.style.opacity = `${op}`;

    root.appendChild(d);
  }
}

function bindParallax() {
  const sheen = $("#sheen");
  if (!sheen) return;

  const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (prefersReduced) return;

  let raf = 0;
  window.addEventListener(
    "pointermove",
    (e) => {
      const { innerWidth: w, innerHeight: h } = window;
      const nx = (e.clientX / w) * 2 - 1;
      const ny = (e.clientY / h) * 2 - 1;
      const tx = clamp(nx * 28, -28, 28);
      const ty = clamp(ny * 22, -22, 22);

      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        sheen.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
      });
    },
    { passive: true }
  );
}

function bindPageTransitions() {
  const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (prefersReduced) {
    document.body.classList.add("is-ready");
    return;
  }

  requestAnimationFrame(() => document.body.classList.add("is-ready"));

  document.addEventListener("click", (e) => {
    const a = e.target?.closest?.("a[data-nav], a.nav__link, a.brand, a.footer__link");
    if (!a) return;
    const href = a.getAttribute("href") || "";
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
    if (!href.endsWith(".html")) return;
    e.preventDefault();
    document.body.classList.add("is-leaving");
    window.setTimeout(() => (window.location.href = href), 220);
  });
}

function safeImage(imgEl, fallbackSel) {
  if (!imgEl) return;
  imgEl.addEventListener("load", () => imgEl.classList.add("is-ok"), { once: true });
  imgEl.addEventListener(
    "error",
    () => {
      imgEl.classList.remove("is-ok");
      if (fallbackSel) {
        const fb = imgEl.closest(fallbackSel);
        if (fb) fb.classList.add("is-fallback");
      }
    },
    { once: true }
  );
}

const STORE_KEYS = {
  users: "somnia_users_v1",
  session: "somnia_session_v1",
  orders: "somnia_orders_v1",
};

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getSession() {
  return readJson(STORE_KEYS.session, null);
}

function setSession(session) {
  writeJson(STORE_KEYS.session, session);
}

function clearSession() {
  localStorage.removeItem(STORE_KEYS.session);
}

function addOrder(order) {
  const orders = readJson(STORE_KEYS.orders, []);
  orders.unshift({ id: crypto?.randomUUID?.() || String(Date.now()), createdAt: Date.now(), ...order });
  writeJson(STORE_KEYS.orders, orders.slice(0, 50));
}

function getOrdersFor(email) {
  const orders = readJson(STORE_KEYS.orders, []);
  return orders.filter((o) => (o.userEmail || "") === (email || "")).slice(0, 20);
}

function getGuestOrders() {
  const orders = readJson(STORE_KEYS.orders, []);
  return orders.filter((o) => !o.userEmail).slice(0, 20);
}

function claimGuestOrders(email) {
  const orders = readJson(STORE_KEYS.orders, []);
  let changed = false;
  for (const o of orders) {
    if (!o.userEmail && o.source === "quiz") {
      o.userEmail = email;
      changed = true;
    }
  }
  if (changed) writeJson(STORE_KEYS.orders, orders);
}

function fmtDate(ts) {
  try {
    return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(ts));
  } catch {
    return new Date(ts).toLocaleString();
  }
}

function buildSessionCard(item) {
  const el = document.createElement("article");
  el.className = "sessionCard";
  el.dataset.sessionId = item.id;
  el.dataset.duration = "10";

  el.innerHTML = `
    <div class="sessionCard__media">
      <div class="sessionCard__fallback" aria-hidden="true"></div>
      <div class="sessionCard__gloss" aria-hidden="true"></div>
      <img class="sessionCard__img" alt="" />
    </div>
    <div class="sessionCard__body">
      <h3 class="sessionCard__title"></h3>
      <p class="sessionCard__sub"></p>
      <div class="durTabs" role="tablist" aria-label="Длительность">
        <button class="durTab is-active" type="button" data-dur="10" role="tab" aria-selected="true">10 минут</button>
        <button class="durTab" type="button" data-dur="20" role="tab" aria-selected="false">20 минут</button>
        <button class="durTab" type="button" data-dur="30" role="tab" aria-selected="false">30 минут</button>
      </div>
    </div>
  `;

  $(".sessionCard__title", el).textContent = item.title;
  $(".sessionCard__sub", el).textContent = item.subtitle;

  const img = $(".sessionCard__img", el);
  img.src = item.image;
  safeImage(img);

  el.addEventListener("click", (e) => {
    const tab = e.target?.closest?.(".durTab");
    if (!tab) return;
    const dur = tab.getAttribute("data-dur");
    if (!dur) return;
    el.dataset.duration = dur;
    $$(".durTab", el).forEach((t) => {
      const isActive = t === tab;
      t.classList.toggle("is-active", isActive);
      t.setAttribute("aria-selected", isActive ? "true" : "false");
    });
  });

  el.addEventListener("dblclick", () => {
    const toast = $("#toast");
    const dur = el.dataset.duration || "10";
    const session = getSession();
    addOrder({
      source: "home",
      title: item.title,
      durationMin: Number(dur),
      image: item.image,
      userEmail: session?.email || null,
    });
    showToast(toast, session?.email ? "Добавлено в заказы." : "Добавлено как гость. Войдите, чтобы увидеть в кабинете.");
  });

  return el;
}

function bindCarousel(root) {
  const track = $("[data-carousel-track]", root);
  const viewport = $("[data-carousel-viewport]", root);
  const prev = $("[data-carousel-prev]", root);
  const next = $("[data-carousel-next]", root);
  if (!track || !viewport || !prev || !next) return;

  const scrollByCards = (dir) => {
    const card = $(".sessionCard", track);
    const step = card ? card.getBoundingClientRect().width + 12 : 260;
    track.scrollBy({ left: dir * step * 2, behavior: "smooth" });
  };

  prev.addEventListener("click", () => scrollByCards(-1));
  next.addEventListener("click", () => scrollByCards(1));

  let isDown = false;
  let startX = 0;
  let startLeft = 0;

  const onDown = (e) => {
    isDown = true;
    track.setPointerCapture?.(e.pointerId);
    startX = e.clientX;
    startLeft = track.scrollLeft;
  };
  const onMove = (e) => {
    if (!isDown) return;
    const dx = e.clientX - startX;
    track.scrollLeft = startLeft - dx;
  };
  const onUp = () => {
    isDown = false;
  };

  track.addEventListener("pointerdown", onDown, { passive: true });
  track.addEventListener("pointermove", onMove, { passive: true });
  track.addEventListener("pointerup", onUp, { passive: true });
  track.addEventListener("pointercancel", onUp, { passive: true });
  track.addEventListener("mouseleave", onUp, { passive: true });
}

function initHome() {
  const blocks = [
    {
      key: "best",
      base: 1,
      items: [
        ["Тёплый лифт в небо", "Плавно вверх — как будто так и надо."],
        ["Тихая вода в комнате", "Свет преломляется на стенах, как память."],
        ["Коридор из стекла", "Двери ведут в знакомое, но иначе."],
        ["Парк без времени", "Ни часов, ни спешки — только воздух."],
        ["Мягкий мегаполис", "Город звучит приглушённо, как в наушниках."],
        ["Письма из завтра", "Конверты пахнут дождём и озоном."],
        ["Лестница‑облако", "Ступени исчезают, когда на них не смотришь."],
        ["Сон с улыбкой", "Сюжет добрый, но слегка невозможный."],
      ],
    },
    {
      key: "users",
      base: 9,
      items: [
        ["Метро из травы", "Поезда шуршат, как листья."],
        ["Музей шёпота", "Экспонаты рассказывают без слов."],
        ["Кухня на луне", "Чай кипит медленно, как мысль."],
        ["Комната‑аквариум", "Рыбы плывут сквозь лампы."],
        ["Пляж из стеклянных бус", "Песок звенит при шаге."],
        ["Почта облаков", "Сортировка по оттенку света."],
        ["Сад зеркал", "Отражения чуть опаздывают."],
        ["Трамвай в тумане", "Остановки похожи на имена."],
      ],
    },
    {
      key: "new",
      base: 17,
      items: [
        ["Комета в кармане", "Свет тёплый, как дыхание."],
        ["Отель из бумаги", "Стены тонкие, но держат небо."],
        ["Переулок‑петля", "Выход есть, если улыбнуться."],
        ["Оранжерея памяти", "Листья шуршат вчерашним."],
        ["Лифт‑океан", "Кнопки пахнут солью."],
        ["Снежная библиотека", "Книги хрустят, но не мёрзнут."],
        ["Светофор для звёзд", "Зелёный — это «мечтай»."],
        ["Кинотеатр сна", "Экран показывает то, что вы забыли."],
      ],
    },
  ];

  for (const b of blocks) {
    const root = document.querySelector(`.carousel[data-carousel="${b.key}"]`);
    if (!root) continue;
    const track = $("[data-carousel-track]", root);
    if (!track) continue;

    const items = b.items.map((it, i) => ({
      id: `${b.key}-${i + 1}`,
      title: it[0],
      subtitle: it[1],
      image: `./session-${String(b.base + i).padStart(2, "0")}.jpg`,
    }));

    track.innerHTML = "";
    for (const item of items) track.appendChild(buildSessionCard(item));
    bindCarousel(root);
  }
}

const QUIZ = {
  questions: [
    {
      title: "Когда вы закрываете глаза, что приходит первым?",
      options: [
        { label: "Светлая поверхность, чуть влажная", a: 2 },
        { label: "Тёплый воздух и тихий шум", b: 2 },
        { label: "Коридор и двери без табличек", c: 2 },
        { label: "Небо слишком близко", d: 2 },
      ],
    },
    {
      title: "Какой звук кажется безопасным?",
      options: [
        { label: "Далёкое метро (как морской прибой)", c: 1, b: 1 },
        { label: "Лёгкий дождь по стеклу", a: 2 },
        { label: "Вентилятор / белый шум", b: 2 },
        { label: "Тишина, но с эхом", d: 2 },
      ],
    },
    {
      title: "Вы бы выбрали сюжет…",
      options: [
        { label: "где всё красиво и мягко светится", a: 2 },
        { label: "где есть добрый спутник", b: 2 },
        { label: "где мир чуть «неправильный», но не страшно", c: 2 },
        { label: "где есть масштаб и ощущение мифа", d: 2 },
      ],
    },
    {
      title: "Какой предмет вы берёте с собой в сон?",
      options: [
        { label: "полупрозрачную карту", c: 2 },
        { label: "стеклянный брелок с бликом", a: 2 },
        { label: "плед, который пахнет домом", b: 2 },
        { label: "маленькую комету (в кармане)", d: 2 },
      ],
    },
    {
      title: "Какое «правило» вам ближе?",
      options: [
        { label: "Свет всегда на вашей стороне", a: 2 },
        { label: "Любая странность — мягкая", c: 2 },
        { label: "Вы не один(одна), даже во сне", b: 2 },
        { label: "Вы больше, чем сюжет", d: 2 },
      ],
    },
  ],
  results: {
    a: {
      title: "Нежный свет и стекло",
      text:
        "Сон‑аквариум: в комнате вода не мокрая, а воздушная. Лучи медленно вращаются, как музыка. Всё сияет тихо — будто вас узнают.",
      image: "./result-a.jpg",
      reco: ["10–20 минут", "имpossible light", "мягкие отражения"],
    },
    b: {
      title: "Тёплая близость",
      text:
        "Сон‑проводник: рядом появляется добрый незнакомец, который объясняет правила мира без слов. Вы идёте по городу, где окна дышат.",
      image: "./result-b.jpg",
      reco: ["20 минут", "kind strangers", "уютная геометрия"],
    },
    c: {
      title: "Тихая странность",
      text:
        "Сон‑петля: всё привычно, кроме одной детали. Двери открываются в ту же комнату, но каждый раз чуть светлее. Странно — и спокойно.",
      image: "./result-c.jpg",
      reco: ["10–30 минут", "сюрреализм без тревоги", "плавающие правила"],
    },
    d: {
      title: "Миф в мягкой оболочке",
      text:
        "Сон‑масштаб: лестница становится рекой, а река — небом. Вы находите символ, который не пугает, а защищает. Просыпаетесь с ощущением смысла.",
      image: "./result-d.jpg",
      reco: ["30 минут", "mythic", "пульсирующий горизонт"],
    },
  },
};

function initQuiz() {
  const form = $("#quizForm");
  const stage = $("#quizStage");
  const prev = $("#quizPrev");
  const next = $("#quizNext");
  const submit = $("#quizSubmit");
  const progress = $("#quizProgress");
  const result = $("#quizResult");
  const toast = $("#toast");

  if (!form || !stage || !prev || !next || !submit || !progress || !result) return;

  let idx = 0;
  const answers = new Array(QUIZ.questions.length).fill(null);

  const render = () => {
    const q = QUIZ.questions[idx];
    progress.textContent = `Вопрос ${idx + 1} из ${QUIZ.questions.length}`;
    stage.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.className = "q";
    wrap.innerHTML = `
      <h2 class="q__title"></h2>
      <div class="q__opts"></div>
    `;
    $(".q__title", wrap).textContent = q.title;
    const opts = $(".q__opts", wrap);

    q.options.forEach((o, oi) => {
      const id = `q${idx}_o${oi}`;
      const lab = document.createElement("label");
      lab.className = "opt";
      lab.innerHTML = `
        <input type="radio" name="q${idx}" value="${oi}" ${answers[idx] === oi ? "checked" : ""} />
        <span></span>
      `;
      $("span", lab).textContent = o.label;
      opts.appendChild(lab);
    });

    stage.appendChild(wrap);

    prev.disabled = idx === 0;
    next.hidden = idx === QUIZ.questions.length - 1;
    submit.hidden = idx !== QUIZ.questions.length - 1;
  };

  const readCurrentAnswer = () => {
    const checked = $(`input[name="q${idx}"]:checked`, stage);
    if (!checked) return null;
    return Number(checked.value);
  };

  const goto = (n) => {
    idx = clamp(n, 0, QUIZ.questions.length - 1);
    render();
  };

  stage.addEventListener("change", () => {
    const a = readCurrentAnswer();
    answers[idx] = a;
  });

  prev.addEventListener("click", () => {
    answers[idx] = readCurrentAnswer();
    goto(idx - 1);
  });

  next.addEventListener("click", () => {
    const a = readCurrentAnswer();
    if (a == null) {
      showToast(toast, "Выберите вариант ответа.");
      return;
    }
    answers[idx] = a;
    goto(idx + 1);
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    answers[idx] = readCurrentAnswer();
    if (answers.some((v) => v == null)) {
      showToast(toast, "Ответьте на все 5 вопросов.");
      return;
    }

    const score = { a: 0, b: 0, c: 0, d: 0 };
    QUIZ.questions.forEach((q, qi) => {
      const opt = q.options[answers[qi]];
      for (const k of ["a", "b", "c", "d"]) score[k] += Number(opt[k] || 0);
    });

    const winner = Object.entries(score).sort((x, y) => y[1] - x[1])[0][0];
    const res = QUIZ.results[winner];

    $("#resultTitle").textContent = res.title;
    $("#resultText").textContent = res.text;
    const img = $("#resultImg");
    img.src = res.image;
    safeImage(img);

    result.hidden = false;
    result.scrollIntoView({ behavior: "smooth", block: "start" });
    showToast(toast, "Результат готов.");

    $("#orderFromQuiz").onclick = () => {
      const session = getSession();
      addOrder({
        source: "quiz",
        title: res.title,
        durationMin: 20,
        image: res.image,
        userEmail: session?.email || null,
      });
      showToast(toast, session?.email ? "Заказ оформлен." : "Заказ сохранён как гость. Войдите, чтобы увидеть в кабинете.");
      if (!session?.email) window.setTimeout(() => (window.location.href = "./auth.html"), 600);
    };
  });

  render();
}

function initAuth() {
  const tabs = $$("[data-auth-tab]");
  const form = $("#authForm");
  const submit = $("#authSubmit");
  const hint = $("#authHint");
  const dash = $("#dashboard");
  const toast = $("#toast");
  const emailEl = $("#email");
  const passEl = $("#password");
  const logout = $("#logoutBtn");
  const ordersList = $("#ordersList");
  const recoList = $("#recoList");

  if (!form || !submit || !hint || !dash || !emailEl || !passEl || !ordersList || !recoList || !logout) return;

  let mode = "login"; // login | register

  const setMode = (m) => {
    mode = m;
    tabs.forEach((t) => {
      const isActive = t.getAttribute("data-auth-tab") === m;
      t.classList.toggle("is-active", isActive);
      t.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    submit.textContent = m === "login" ? "Войти" : "Зарегистрироваться";
    hint.textContent = m === "login" ? "Или зарегистрируйтесь" : "Уже есть аккаунт? Войдите";
  };

  tabs.forEach((t) =>
    t.addEventListener("click", () => {
      setMode(t.getAttribute("data-auth-tab") || "login");
    })
  );

  const renderDash = (session) => {
    if (!session?.email) {
      dash.hidden = true;
      return;
    }
    dash.hidden = false;

    const orders = getOrdersFor(session.email);
    ordersList.innerHTML = "";
    if (!orders.length) {
      ordersList.innerHTML = `<div class="pill">Пока нет заказов. Оформите из теста или двойным кликом по карточке на главной.</div>`;
    } else {
      for (const o of orders) {
        const row = document.createElement("div");
        row.innerHTML = `
          <div><strong>${o.title}</strong></div>
          <div class="pillRow">
            <span class="pill">${o.durationMin} минут</span>
            <span class="pill">${fmtDate(o.createdAt)}</span>
          </div>
        `;
        ordersList.appendChild(row);
      }
    }

    const reco = [
      "Попробуйте «Тихая странность» на 10 минут.",
      "Сеанс «Нежный свет и стекло» — хороший старт перед сном.",
      "Если день шумный: 20 минут белого шума и мягкая геометрия.",
    ];
    recoList.innerHTML = "";
    recoList.appendChild(Object.assign(document.createElement("div"), { className: "pill", textContent: `Вы вошли как ${session.email}` }));
    reco.forEach((r) => recoList.appendChild(Object.assign(document.createElement("div"), { className: "pill", textContent: r })));
  };

  const sessionNow = getSession();
  if (sessionNow?.email) {
    renderDash(sessionNow);
    showToast(toast, "Добро пожаловать обратно.");
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = (emailEl.value || "").trim().toLowerCase();
    const pass = passEl.value || "";
    if (!email || !pass) {
      showToast(toast, "Заполните email и пароль.");
      return;
    }

    const users = readJson(STORE_KEYS.users, {});
    if (mode === "register") {
      if (users[email]) {
        showToast(toast, "Такой email уже зарегистрирован.");
        return;
      }
      users[email] = { email, pass };
      writeJson(STORE_KEYS.users, users);
      setSession({ email });
      claimGuestOrders(email);
      showToast(toast, "Аккаунт создан. Вы вошли.");
      renderDash({ email });
      return;
    }

    if (!users[email] || users[email].pass !== pass) {
      showToast(toast, "Неверный email или пароль.");
      return;
    }
    setSession({ email });
    claimGuestOrders(email);
    showToast(toast, "Вход выполнен.");
    renderDash({ email });
  });

  logout.addEventListener("click", () => {
    clearSession();
    dash.hidden = true;
    showToast(toast, "Вы вышли.");
  });

  setMode("login");
}

function boot() {
  const y = $("#year");
  if (y) y.textContent = String(new Date().getFullYear());

  createMotes();
  bindParallax();
  bindPageTransitions();
  setShiftText();

  const page = document.body?.dataset?.page;
  if (page === "home") initHome();
  if (page === "quiz") initQuiz();
  if (page === "auth") initAuth();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
