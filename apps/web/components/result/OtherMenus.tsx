import Link from "next/link";
import { CROSS_SELL, CTAS } from "@reviewcheck/config";
import { ConsultCtaGrid } from "../CtaGrid";
import { ReverseHackPromo } from "../ReverseHackPromo";

/**
 * 結果の本線から外したメニュー。閉じた状態が既定。
 * ここに出す文面にも「無料」は使わない。
 */
export function OtherMenus({
  monitoringHref,
  suggestHref,
}: {
  monitoringHref: string;
  suggestHref: string;
}) {
  const links: { href: string; label: string; external?: boolean }[] = [
    { href: "/security-diagnosis/", label: "サイトの安全性を見る" },
    { href: "/review-tool/", label: "口コミ作成ツール" },
    { href: "/plans/", label: "総合パッケージを見る" },
    { href: suggestHref, label: "検索の評判（サジェスト）を確認" },
    { href: monitoringHref, label: "月次モニタリング", external: true },
    { href: CTAS.meo.href, label: "MEOの相談ページ" },
  ];

  return (
    <details className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
      <summary className="cursor-pointer text-base font-bold text-slate-900">
        ほかのメニュー
      </summary>
      <div className="mt-4 space-y-6">
        <div>
          <p className="text-sm font-bold text-slate-800">相談のテーマ</p>
          <div className="mt-3">
            <ConsultCtaGrid />
          </div>
        </div>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {links.map((item) => (
            <li key={item.href}>
              {item.external ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 hover:border-blue-300"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  href={item.href}
                  className="block rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 hover:border-blue-300"
                >
                  {item.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
        <div>
          <p className="text-sm font-bold text-slate-800">関連して見られるページ</p>
          <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {CROSS_SELL.map((item) => {
              const desc =
                item.key === "site-health"
                  ? "サイトのセキュリティ・表示速度・SEOをURLでチェックします。"
                  : item.desc;
              const body = (
                <>
                  <span className="font-bold text-slate-900">{item.title}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-slate-600">
                    {desc}
                  </span>
                </>
              );
              const cls =
                "block h-full rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-300";
              return (
                <li key={item.key}>
                  {item.external ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cls}
                    >
                      {body}
                    </a>
                  ) : (
                    <Link href={item.href} className={cls}>
                      {body}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
        <ReverseHackPromo />
      </div>
    </details>
  );
}
