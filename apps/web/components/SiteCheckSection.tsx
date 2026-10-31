import { renderSiteCheckCard } from "site-check/card";
import type { SiteCheckJson } from "site-check";
import { malwareCheckHref } from "@/lib/websiteUrl";

/**
 * 口コミの点数の直後に置く。中身は vendored のカード。
 * 全文へのリンクだけ、このアプリが足す。
 */
export function SiteCheckSection({
  report,
  website,
}: {
  report: SiteCheckJson;
  website: string;
}) {
  return (
    <section data-result-section="site-check" className="max-w-full">
      <div
        className="max-w-full overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: renderSiteCheckCard(report) }}
      />
      <a
        href={malwareCheckHref(website)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-blue-700 underline decoration-blue-700 underline-offset-2 hover:text-blue-800"
      >
        マルウェアチェックで全文を見る
      </a>
    </section>
  );
}
