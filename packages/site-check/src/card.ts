import { siteCheckCountLine } from "./rubric";
import type { SiteCheckJson, SiteCheckStatus } from "./types";

const LABEL: Record<SiteCheckStatus, { label: string; mark: string }> = {
  action: { label: "要対応", mark: "■" },
  caution: { label: "注意", mark: "▲" },
  ok: { label: "問題なし", mark: "●" },
  unknown: { label: "確認できず", mark: "？" },
  na: { label: "対象外", mark: "—" },
};

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * 結果カードの HTML。React も CSS フレームワークも要らない。
 * 戻り値をそのまま要素へ入れる。直し方は要対応と注意だけ出す。
 */
export function renderSiteCheckCard(report: SiteCheckJson, options?: { showFix?: boolean }): string {
  const showFix = options?.showFix !== false;
  const main = report.items.filter((item) => item.status === "action" || item.status === "caution");
  const findings = main
    .map((item) => {
      const grade = LABEL[item.status];
      const fix =
        showFix && item.fix.length > 0
          ? `<p class="sc-card-k">直し方の例</p>${item.fix
              .map(
                (snippet) =>
                  `<p class="sc-card-k">${esc(snippet.label)}</p><pre class="sc-card-pre"><code>${esc(snippet.code)}</code></pre>`,
              )
              .join("")}`
          : "";
      return `<li class="sc-card-item"><p class="sc-card-k"><span aria-hidden="true">${grade.mark}</span> ${grade.label}</p><h3>${esc(item.title)}</h3><p>${esc(item.why)}</p><p>このままの場合: ${esc(item.ifLeft)}</p>${fix}</li>`;
    })
    .join("");
  return `<section class="sc-card" aria-label="セキュリティ設定の点数">
<style>
.sc-card{box-sizing:border-box;max-width:40rem;color:#0f172a;font-family:sans-serif;font-size:16px;line-height:1.6}
.sc-card *{box-sizing:border-box}
.sc-card-score,.sc-card-item{border:2px solid #0f172a;border-radius:16px;background:#fff;padding:16px;margin:0 0 12px}
.sc-card h2,.sc-card h3,.sc-card p{margin:0 0 8px}
.sc-card-num{font-size:40px;font-weight:800;line-height:1}
.sc-card-k{font-weight:700}
.sc-card-pre{max-width:100%;overflow-x:auto;background:#f1f5f9;border-radius:8px;padding:12px;white-space:pre-wrap}
@media (max-width:420px){.sc-card{font-size:16px}.sc-card-num{font-size:32px}}
</style>
<div class="sc-card-score">
<p class="sc-card-k">セキュリティ設定の点数</p>
<p class="sc-card-num">${report.score}<span style="font-size:0.55em"> / 100</span></p>
<p class="sc-card-k">${esc(report.rubric)}</p>
<p class="sc-card-k">${esc(siteCheckCountLine(report.counts))}</p>
<p>${esc(report.note)}</p>
</div>
<h2>主な所見</h2>
${main.length === 0 ? `<p>要対応と注意の項目は、今回の採点にはありません。${esc(report.note)}</p>` : `<ul style="list-style:none;padding:0;margin:0">${findings}</ul>`}
</section>`;
}

/** カードを要素の中身として置く。 */
export function mountSiteCheckCard(host: { innerHTML: string }, report: SiteCheckJson, options?: { showFix?: boolean }): void {
  host.innerHTML = renderSiteCheckCard(report, options);
}
