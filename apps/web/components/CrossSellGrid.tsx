import Link from "next/link";
import { CROSS_SELL } from "@reviewcheck/config";

/**
 * 関連サービス（紹介）の一覧。口コミ診断を入口に、MEO・HP制作・SNS等へ送客する。
 * heading / intro は配置場所に応じて差し替え可能。
 */
export function CrossSellGrid({
  heading = "あわせて相談されています",
  intro = "口コミ改善だけでなく、集客の入口をまとめて整えると効果が高まります。",
}: {
  heading?: string;
  intro?: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-bold text-slate-900">{heading}</h2>
      <p className="mt-1 text-sm text-slate-600">{intro}</p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CROSS_SELL.map((item) => {
          const inner = (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xl" aria-hidden>
                  {item.emoji}
                </span>
                <span className="font-bold text-slate-900">{item.title}</span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                {item.desc}
              </p>
            </>
          );
          const cls =
            "block h-full rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-300 hover:bg-blue-50";
          return item.external ? (
            <a
              key={item.key}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className={cls}
            >
              {inner}
            </a>
          ) : (
            <Link key={item.key} href={item.href} className={cls}>
              {inner}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
