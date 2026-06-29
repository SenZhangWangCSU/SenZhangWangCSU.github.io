const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector(".site-nav");
const navLinks = Array.from(document.querySelectorAll(".site-nav a"));
const languageLink = document.querySelector(".language-switch a");
const themeToggle = document.querySelector(".theme-toggle");
const themeToggleText = document.querySelector(".theme-toggle-text");
const root = document.documentElement;
const themeStorageKey = "bd4ui-theme";

function applyTheme(theme) {
  const nextTheme = theme === "ink" ? "ink" : "light";
  root.dataset.theme = nextTheme;
  if (themeToggle) {
    const isInk = nextTheme === "ink";
    themeToggle.setAttribute("aria-pressed", String(isInk));
    if (themeToggleText) {
      themeToggleText.textContent = isInk
        ? (themeToggle.dataset.darkLabel || "Ink")
        : (themeToggle.dataset.lightLabel || "Light");
    }
  }
}

applyTheme(window.localStorage.getItem(themeStorageKey) || "light");

themeToggle?.addEventListener("click", () => {
  const nextTheme = root.dataset.theme === "ink" ? "light" : "ink";
  applyTheme(nextTheme);
  window.localStorage.setItem(themeStorageKey, nextTheme);
  window.dispatchEvent(new CustomEvent("themechange", { detail: nextTheme }));
});

languageLink?.addEventListener("click", (event) => {
  if (!window.location.hash) return;
  const target = new URL(languageLink.getAttribute("href"), window.location.href);
  target.hash = window.location.hash;
  languageLink.href = target.href;
});

if (navToggle && siteNav) {
  navToggle.addEventListener("click", () => {
    const expanded = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!expanded));
    siteNav.classList.toggle("open", !expanded);
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      navToggle.setAttribute("aria-expanded", "false");
      siteNav.classList.remove("open");
    });
  });
}

const sectionLinks = navLinks.filter((link) => (link.getAttribute("href") || "").startsWith("#"));

const sections = sectionLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

const activeObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const activeId = `#${entry.target.id}`;
      sectionLinks.forEach((link) => {
        link.classList.toggle("active", link.getAttribute("href") === activeId);
      });
    });
  },
  { rootMargin: "-28% 0px -58% 0px", threshold: 0.01 }
);

sections.forEach((section) => activeObserver.observe(section));

const filterButtons = Array.from(document.querySelectorAll(".filter-button"));
const pubSearch = document.querySelector("#pubSearch");
const pubYearFilter = document.querySelector("#pubYearFilter");
const pubVisibleCount = document.querySelector("#pubVisibleCount");
const pubToggle = document.querySelector(".pub-toggle");
const publications = Array.from(document.querySelectorAll(".publication-item"));
let activeYear = "all";
let publicationsExpanded = false;
const collapsedLimit = 6;

function normalize(value) {
  return value.trim().toLowerCase();
}

function filterPublications() {
  const query = normalize(pubSearch?.value || "");
  let visibleIndex = 0;
  let visibleCount = 0;

  publications.forEach((item) => {
    const yearMatch = activeYear === "all" || item.dataset.year === activeYear;
    const text = normalize(`${item.textContent} ${item.dataset.keywords || ""}`);
    const queryMatch = !query || text.includes(query);
    const matched = yearMatch && queryMatch;
    const collapsed = !publicationsExpanded && activeYear === "all" && !query && visibleIndex >= collapsedLimit;

    item.classList.toggle("hidden", !matched);
    item.classList.toggle("collapsed-hidden", matched && collapsed);

    if (matched) {
      visibleIndex += 1;
      visibleCount += 1;
    }
  });

  if (pubVisibleCount) pubVisibleCount.textContent = String(visibleCount);

  if (pubToggle) {
    const canCollapse = activeYear === "all" && !query && visibleCount > collapsedLimit;
    pubToggle.hidden = !canCollapse;
    pubToggle.textContent = publicationsExpanded
      ? pubToggle.dataset.expandedLabel
      : pubToggle.dataset.collapsedLabel;
  }
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeYear = button.dataset.filter || "all";
    filterButtons.forEach((item) => item.classList.toggle("active", item === button));
    filterPublications();
  });
});

pubYearFilter?.addEventListener("change", () => {
  activeYear = pubYearFilter.value || "all";
  publicationsExpanded = activeYear !== "all";
  filterPublications();
});

pubSearch?.addEventListener("input", filterPublications);

pubToggle?.addEventListener("click", () => {
  publicationsExpanded = !publicationsExpanded;
  filterPublications();
});

filterPublications();

const canvas = document.querySelector("#cityGraph");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (canvas) {
  const ctx = canvas.getContext("2d");
  let width = 0;
  let height = 0;
  let dpr = 1;
  let nodes = [];
  let routes = [];
  let frame = 0;
  let colors = {};

  function readCssColor(name) {
    return getComputedStyle(root).getPropertyValue(name).trim();
  }

  function syncThemeColors() {
    colors = {
      ink: readCssColor("--ink"),
      blue: readCssColor("--blue"),
      green: readCssColor("--green"),
      coral: readCssColor("--coral"),
      gold: readCssColor("--gold"),
      graphBg: readCssColor("--graph-bg"),
      graphGridBlue: readCssColor("--graph-grid-blue"),
      graphGridGreen: readCssColor("--graph-grid-green"),
      graphGlowBlue: readCssColor("--graph-glow-blue"),
      graphGlowGreen: readCssColor("--graph-glow-green"),
      graphRoute: readCssColor("--graph-route"),
      graphNodeFill: readCssColor("--graph-node-fill")
    };
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(320, Math.floor(rect.width));
    height = Math.max(320, Math.floor(rect.height));
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    createScene();
    drawScene();
  }

  function createScene() {
    const columns = width < 520 ? 4 : 6;
    const rows = width < 520 ? 4 : 5;
    const paddingX = width * 0.12;
    const paddingY = height * 0.16;
    nodes = [];

    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < columns; x += 1) {
        const jitterX = Math.sin(x * 1.7 + y * 0.9) * 13;
        const jitterY = Math.cos(x * 0.8 + y * 1.4) * 12;
        nodes.push({
          x: paddingX + (x / (columns - 1)) * (width - paddingX * 2) + jitterX,
          y: paddingY + (y / (rows - 1)) * (height - paddingY * 2) + jitterY,
          r: 4 + ((x + y) % 3),
          type: (x + y) % 4
        });
      }
    }

    routes = [];
    nodes.forEach((node, index) => {
      const right = index + 1;
      const down = index + columns;
      if (right < nodes.length && Math.floor(right / columns) === Math.floor(index / columns)) {
        routes.push([index, right]);
      }
      if (down < nodes.length) {
        routes.push([index, down]);
      }
      if ((index + columns + 1) < nodes.length && index % columns < columns - 1 && index % 2 === 0) {
        routes.push([index, index + columns + 1]);
      }
    });
  }

  function drawBackground() {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = colors.graphBg;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalAlpha = 0.9;
    for (let x = -40; x < width + 60; x += 42) {
      ctx.strokeStyle = colors.graphGridBlue;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + height * 0.18, height);
      ctx.stroke();
    }
    for (let y = 16; y < height; y += 42) {
      ctx.strokeStyle = colors.graphGridGreen;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y - width * 0.12);
      ctx.stroke();
    }
    ctx.restore();

    const gradient = ctx.createRadialGradient(width * 0.68, height * 0.2, 30, width * 0.68, height * 0.2, width * 0.72);
    gradient.addColorStop(0, colors.graphGlowBlue);
    gradient.addColorStop(0.5, colors.graphGlowGreen);
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  function drawRoutes(time) {
    routes.forEach(([from, to], index) => {
      const a = nodes[from];
      const b = nodes[to];
      ctx.strokeStyle = colors.graphRoute;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      if ((index + Math.floor(time / 40)) % 3 === 0) {
        const progress = reducedMotion ? 0.55 : ((time * 0.0012 + index * 0.09) % 1);
        const x = a.x + (b.x - a.x) * progress;
        const y = a.y + (b.y - a.y) * progress;
        ctx.fillStyle = index % 2 ? colors.coral : colors.gold;
        ctx.beginPath();
        ctx.arc(x, y, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  function drawNodes(time) {
    const palette = [colors.blue, colors.green, colors.coral, colors.gold];

    nodes.forEach((node, index) => {
      const pulse = reducedMotion ? 0 : Math.sin(time * 0.002 + index) * 1.2;
      ctx.fillStyle = colors.graphNodeFill;
      ctx.strokeStyle = palette[node.type];
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.r + pulse + 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = palette[node.type];
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawLabels() {
    const labels = [
      { text: "Road", x: width * 0.17, y: height * 0.13, color: colors.blue },
      { text: "POI", x: width * 0.74, y: height * 0.14, color: colors.green },
      { text: "Mobility", x: width * 0.18, y: height * 0.84, color: colors.coral },
      { text: "Events", x: width * 0.7, y: height * 0.78, color: colors.gold }
    ];

    labels.forEach((label) => {
      ctx.fillStyle = label.color;
      ctx.font = "700 12px Segoe UI, Arial, sans-serif";
      ctx.fillText(label.text, label.x, label.y);
    });
  }

  function drawScene(time = 0) {
    drawBackground();
    drawRoutes(time);
    drawNodes(time);
    drawLabels();
  }

  function animate(time) {
    frame = requestAnimationFrame(animate);
    drawScene(time);
  }

  syncThemeColors();
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("themechange", () => {
    syncThemeColors();
    drawScene(0);
  });

  if (reducedMotion) {
    drawScene(0);
  } else {
    frame = requestAnimationFrame(animate);
  }

  window.addEventListener("pagehide", () => {
    if (frame) cancelAnimationFrame(frame);
  });
}
