import { CONFIG } from "./config.js";

const BAND = {
  good: { label: "選ばれやすい", color: "#15803d", badgeBg: "#dcfce7", badgeFg: "#166534" },
  fair: { label: "改善余地あり", color: "#d97706", badgeBg: "#fef3c7", badgeFg: "#92400e" },
  weak: { label: "やや不利", color: "#ea580c", badgeBg: "#ffedd5", badgeFg: "#9a3412" },
  poor: { label: "要対策", color: "#dc2626", badgeBg: "#fee2e2", badgeFg: "#991b1b" },
};

const els = {
  targetUrl: document.getElementById("targetUrl"),
  scanBtn: document.getElementById("scanBtn"),
  loading: document.getElementById("loading"),
  error: document.getElementById("error"),
  result: document.getElementById("result"),
  scoreCircle: document.getElementById("scoreCircle"),
  scoreValue: document.getElementById("scoreValue"),
  bandBadge: document.getElementById("bandBadge"),
  storeName: document.getElementById("storeName"),
  storeStats: document.getElementById("storeStats"),
  summary: document.getElementById("summary"),
  simText: document.getElementById("simText"),
  detailBtn: document.getElementById("detailBtn"),
  ctaImprove: document.getElementById("ctaImprove"),
  ctaMeo: document.getElementById("ctaMeo"),
};

let currentUrl = "";

async function getActiveTabUrl() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab && tab.url ? tab.url : "";
}

function isMapsUrl(url) {
  return /https?:\/\/([^/]*\.)?(google\.[a-z.]+\/maps|maps\.google\.|maps\.app\.goo\.gl|g\.page)/i.test(
    url,
  );
}

// core の encodeReportId(JSON) と互換のレポートID生成
function encodeReportId(input) {
  const json = JSON.stringify(input);
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function setupCtaLinks() {
  els.ctaImprove.href = `${CONFIG.API_BASE}/contact/?topic=improvement`;
  els.ctaMeo.href = `${CONFIG.API_BASE}/contact/?topic=meo`;
}

async function init() {
  setupCtaLinks();
  currentUrl = await getActiveTabUrl();
  if (!currentUrl || !/^https?:\/\//i.test(currentUrl)) {
    els.targetUrl.textContent =
      "このページは診断できません（Googleマップの店舗ページを開いてください）";
    els.scanBtn.disabled = true;
    return;
  }
  if (isMapsUrl(currentUrl)) {
    els.targetUrl.textContent = currentUrl;
  } else {
    els.targetUrl.textContent =
      "Googleマップの店舗ページではないようです。店舗ページで使うと精度が上がります。";
  }
}

async function scan() {
  els.error.classList.add("hidden");
  els.result.classList.add("hidden");
  els.loading.classList.remove("hidden");
  els.scanBtn.disabled = true;

  try {
    const res = await fetch(`${CONFIG.API_BASE}/api/diagnose`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: { mapsUrl: currentUrl } }),
    });
    const data = await res.json();
    if (!res.ok) {
      showError(data.error || "診断に失敗しました。");
      return;
    }
    render(data);
  } catch (e) {
    showError("通信エラーが発生しました。時間をおいて再度お試しください。");
  } finally {
    els.loading.classList.add("hidden");
    els.scanBtn.disabled = false;
  }
}

function showError(msg) {
  els.error.textContent = msg;
  els.error.classList.remove("hidden");
}

function render(result) {
  const band = BAND[result.band] || BAND.fair;
  const store = result.input.store;

  els.scoreValue.textContent = String(result.score);
  els.scoreCircle.style.background = band.color;

  els.bandBadge.textContent = `選ばれやすさ: ${band.label}`;
  els.bandBadge.style.background = band.badgeBg;
  els.bandBadge.style.color = band.badgeFg;

  els.storeName.textContent = store.name || "店舗";
  els.storeStats.textContent = `星 ${store.rating.toFixed(1)}／口コミ ${store.reviewCount}件`;

  els.summary.textContent = result.summary;

  const five = (result.simulation.scenarios || []).find((s) => s.id === "five-only");
  if (five) {
    els.simText.textContent =
      five.reviewsNeeded == null || five.reviewsNeeded === 0
        ? `目標 星${result.simulation.targetRating} はすでに到達圏内です。`
        : `目標 星${result.simulation.targetRating} に近づくには、あと約 ${five.reviewsNeeded} 件の星5口コミが目安です（目安）。`;
  }

  const reportUrl = `${CONFIG.API_BASE}/report/${encodeReportId(result.input)}/`;
  els.detailBtn.onclick = () => chrome.tabs.create({ url: reportUrl });

  els.result.classList.remove("hidden");
}

els.scanBtn.addEventListener("click", scan);
init();
