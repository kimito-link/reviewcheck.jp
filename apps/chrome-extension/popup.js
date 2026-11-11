import { CONFIG } from "./config.js";
import {
  CHECKS_STORAGE_KEY,
  buildExtensionShareText,
  domainOf,
  encodeReportId,
  isDiagnosablePage,
  isMapsUrl,
  mergeCheckEntry,
  pickHighlights,
  queryFromManual,
  queryFromTab,
  recheckCopy,
  storageTargetKey,
} from "./personal.js";

const BAND = {
  good: { label: "選ばれやすい", border: "#166534", badgeBg: "#dcfce7", badgeFg: "#166534" },
  fair: { label: "改善余地あり", border: "#92400e", badgeBg: "#fef3c7", badgeFg: "#92400e" },
  weak: { label: "やや不利", border: "#9a3412", badgeBg: "#ffedd5", badgeFg: "#9a3412" },
  poor: { label: "要対策", border: "#991b1b", badgeBg: "#fee2e2", badgeFg: "#991b1b" },
};

const els = {
  targetUrl: document.getElementById("targetUrl"),
  manualForm: document.getElementById("manualForm"),
  manualQuery: document.getElementById("manualQuery"),
  manualRating: document.getElementById("manualRating"),
  manualCount: document.getElementById("manualCount"),
  scanBtn: document.getElementById("scanBtn"),
  loading: document.getElementById("loading"),
  error: document.getElementById("error"),
  result: document.getElementById("result"),
  scoreCircle: document.getElementById("scoreCircle"),
  scoreValue: document.getElementById("scoreValue"),
  bandBadge: document.getElementById("bandBadge"),
  storeName: document.getElementById("storeName"),
  storeStats: document.getElementById("storeStats"),
  points: document.getElementById("points"),
  recheck: document.getElementById("recheck"),
  recheckPrevious: document.getElementById("recheckPrevious"),
  recheckNext: document.getElementById("recheckNext"),
  copySummary: document.getElementById("copySummary"),
  copyUrl: document.getElementById("copyUrl"),
  webShare: document.getElementById("webShare"),
  shareStatus: document.getElementById("shareStatus"),
  shareFallback: document.getElementById("shareFallback"),
  detailBtn: document.getElementById("detailBtn"),
};

let currentTabUrl = "";
let currentView = null;

function hasChromeTabs() {
  return Boolean(globalThis.chrome?.tabs?.query);
}

async function getActiveTabUrl() {
  if (!hasChromeTabs()) return "";
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab && tab.url ? tab.url : "";
}

async function loadChecks() {
  if (!globalThis.chrome?.storage?.local) return {};
  try {
    const data = await chrome.storage.local.get(CHECKS_STORAGE_KEY);
    const value = data?.[CHECKS_STORAGE_KEY];
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

async function saveCheck(key, entry) {
  if (!key || !globalThis.chrome?.storage?.local) return;
  try {
    const existing = await loadChecks();
    const next = mergeCheckEntry(existing, key, entry);
    await chrome.storage.local.set({ [CHECKS_STORAGE_KEY]: next });
  } catch {
    /* 保存できなくても、今回の結果は画面に出す */
  }
}

function showTarget(url) {
  if (!url || !isDiagnosablePage(url)) {
    els.targetUrl.textContent = "このページは診断できません。下の欄に店舗名かURLを入力してください。";
    return;
  }
  const domain = domainOf(url);
  els.targetUrl.textContent = isMapsUrl(url)
    ? `${domain}（Googleマップの店舗ページ）`
    : domain;
}

function prefillFromTab(url) {
  if (!url || !isDiagnosablePage(url)) return;
  els.manualQuery.value = isMapsUrl(url) ? url : domainOf(url);
}

function setBusy(busy) {
  els.scanBtn.disabled = busy;
  els.manualQuery.disabled = busy;
  els.manualRating.disabled = busy;
  els.manualCount.disabled = busy;
  els.loading.classList.toggle("hidden", !busy);
}

function showError(message) {
  els.error.textContent = message;
  els.error.classList.remove("hidden");
}

function clearError() {
  els.error.textContent = "";
  els.error.classList.add("hidden");
}

function showRecheck(iso) {
  const copy = recheckCopy(iso);
  if (!copy) {
    els.recheck.classList.add("hidden");
    return;
  }
  els.recheckPrevious.textContent = copy.previous;
  els.recheckNext.textContent = copy.next;
  els.recheck.classList.remove("hidden");
}

function showResult(view) {
  currentView = view;
  const band = BAND[view.band] || BAND.fair;
  els.scoreValue.textContent = String(Math.round(Number(view.score)));
  els.scoreCircle.style.borderColor = band.border;
  els.bandBadge.textContent = `選ばれやすさ: ${band.label}`;
  els.bandBadge.style.background = band.badgeBg;
  els.bandBadge.style.color = band.badgeFg;
  els.storeName.textContent = view.storeName || "店舗";
  const rating = Number(view.rating);
  const count = Number(view.reviewCount);
  els.storeStats.textContent =
    Number.isFinite(rating) && Number.isFinite(count)
      ? `星 ${rating.toFixed(1)}／口コミ ${count}件`
      : "";

  els.points.replaceChildren();
  for (const point of view.points ?? []) {
    const item = document.createElement("li");
    item.textContent = point;
    els.points.append(item);
  }
  showRecheck(view.diagnosedAt);
  els.detailBtn.dataset.url = view.reportUrl || "";
  els.shareStatus.textContent = "";
  els.shareFallback.classList.add("hidden");
  els.result.classList.remove("hidden");
}

function viewFromApi(result) {
  const store = result?.input?.store ?? {};
  return {
    score: result.score,
    band: result.band,
    storeName: store.name || "店舗",
    rating: store.rating,
    reviewCount: store.reviewCount,
    points: pickHighlights(result),
    diagnosedAt: result.diagnosedAt,
    reportUrl: `${CONFIG.API_BASE}/report/${encodeReportId(result.input)}/`,
  };
}

function manualNumbers() {
  const ratingRaw = els.manualRating.value.trim();
  const countRaw = els.manualCount.value.trim();
  const store = {};
  if (ratingRaw !== "") {
    const rating = Number(ratingRaw);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return { error: "星評価は 1.0 から 5.0 で入力してください。" };
    }
    store.rating = rating;
  }
  if (countRaw !== "") {
    const reviewCount = Number(countRaw);
    if (!Number.isFinite(reviewCount) || reviewCount < 0) {
      return { error: "口コミ数は 0 以上の数で入力してください。" };
    }
    store.reviewCount = reviewCount;
  }
  return { store };
}

async function diagnose(query, key, manualStore) {
  clearError();
  setBusy(true);
  try {
    const body = { query };
    if (manualStore && Object.keys(manualStore).length > 0) body.store = manualStore;
    const res = await fetch(`${CONFIG.API_BASE}/api/diagnose`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      showError(data.error || "診断に失敗しました。");
      return;
    }
    if (data.needsManualInput) {
      showError(data.message || "店舗データを取得できませんでした。星評価と口コミ数を入力してください。");
      return;
    }
    const view = viewFromApi(data);
    showResult(view);
    await saveCheck(key, view);
  } catch {
    showError("通信エラーが発生しました。時間をおいて再度お試しください。");
  } finally {
    setBusy(false);
  }
}

async function copyText(text, success) {
  els.shareFallback.classList.add("hidden");
  try {
    await navigator.clipboard.writeText(text);
    els.shareStatus.textContent = success;
  } catch {
    els.shareStatus.textContent = "コピーできませんでした。下の文字を選択してコピーしてください。";
    els.shareFallback.value = text;
    els.shareFallback.classList.remove("hidden");
    els.shareFallback.focus();
    els.shareFallback.select();
  }
}

async function init() {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    els.webShare.classList.remove("hidden");
  }
  currentTabUrl = await getActiveTabUrl();
  showTarget(currentTabUrl);
  prefillFromTab(currentTabUrl);

  const key = storageTargetKey(currentTabUrl, "");
  const saved = key ? (await loadChecks())[key] : null;
  if (saved?.diagnosedAt && Array.isArray(saved.points)) showResult(saved);

  const query = queryFromTab(currentTabUrl);
  if (!query) {
    if (!saved) {
      showError("このページは診断できません。店舗名かGoogleマップのURLを入力してください。");
    }
    return;
  }
  await diagnose(query, key);
}

els.manualForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = queryFromManual(els.manualQuery.value);
  if (!query) {
    showError("店舗名またはGoogleマップURLを入力してください。");
    return;
  }
  const numbers = manualNumbers();
  if (numbers.error) {
    showError(numbers.error);
    return;
  }
  const key = storageTargetKey(currentTabUrl, els.manualQuery.value);
  void diagnose(query, key, numbers.store);
});

els.copySummary.addEventListener("click", () => {
  if (!currentView) return;
  const text = buildExtensionShareText(currentView);
  void copyText(text, "要約をコピーしました");
});

els.copyUrl.addEventListener("click", () => {
  if (!currentView?.reportUrl) return;
  void copyText(currentView.reportUrl, "結果URLをコピーしました");
});

els.webShare.addEventListener("click", async () => {
  if (!currentView || typeof navigator.share !== "function") return;
  const text = buildExtensionShareText(currentView);
  try {
    await navigator.share({
      title: "口コミチェック.jp",
      text,
      url: currentView.reportUrl,
    });
    els.shareStatus.textContent = "共有しました";
  } catch (error) {
    if (error && error.name === "AbortError") {
      els.shareStatus.textContent = "共有を取り消しました";
      return;
    }
    await copyText(`${text}\n${currentView.reportUrl}`, "共有できないため、要約と結果URLをコピーしました");
  }
});

els.detailBtn.addEventListener("click", () => {
  const url = els.detailBtn.dataset.url;
  if (!url) return;
  if (globalThis.chrome?.tabs?.create) {
    chrome.tabs.create({ url });
    return;
  }
  window.open(url, "_blank", "noopener");
});

void init();
