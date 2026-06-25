"use client";

import { useEffect, useState } from "react";

/**
 * 関連ツール：君斗りんくの「WEBサイト健康診断」(web-health-check.link)。
 * 店舗の“サイトURL”を入れるだけで、セキュリティ・表示速度・SEOを無料診断できる。
 * 口コミ/MEO（Googleでの見られ方）に対し、こちらは「自社サイト自体の健康」を補完。
 * - 主導線：web-health-check.link（URLを入れて診断）
 * - 副次：常時使えるChrome拡張 / iOSアプリ（デバイス別に出し分け）
 */

// 配布先（partnership_program_website / web-health-check.link より）
const URLS = {
  web: "https://web-health-check.link",
  chrome:
    "https://chromewebstore.google.com/detail/jnfpngacnacjfhpphpnlgbpjmklbhdlf",
  ios: "https://apps.apple.com/jp/app/id6779860644",
};

type Device = "ios" | "android" | "desktop";

export function WebHealthCheckPromo() {
  const [device, setDevice] = useState<Device>("desktop");

  useEffect(() => {
    const ua = navigator.userAgent || "";
    if (/iPhone|iPad|iPod/i.test(ua)) setDevice("ios");
    else if (/Android/i.test(ua)) setDevice("android");
    else setDevice("desktop");
  }, []);

  const secondary =
    device === "ios"
      ? { href: URLS.ios, label: "iPhoneアプリで診断" }
      : device === "android"
        ? null
        : { href: URLS.chrome, label: "Chrome拡張で診断" };

  return (
    <section className="overflow-hidden rounded-2xl border border-cyan-200 bg-cyan-50/60">
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-cyan-600 px-2 py-0.5 text-[11px] font-bold text-white">
            関連ツール・無料
          </span>
          <h2 className="text-base font-bold text-slate-900 sm:text-lg">
            あなたのサイトは健康ですか？URLを入れるだけで診断
          </h2>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          口コミ・MEOは「Googleでの見られ方」。一方で、来店前にお客様が見る
          <strong className="text-slate-900">自社サイトそのものの健康</strong>
          も集客を左右します。サイトURLを入れるだけで、
          <strong className="text-slate-900">
            セキュリティ（SSL・脆弱性・マルウェア）・表示速度・SEO対策状況
          </strong>
          を無料診断できます。
        </p>
        <ul className="mt-3 grid grid-cols-1 gap-1.5 text-sm text-slate-600 sm:grid-cols-3">
          <li className="flex items-center gap-1.5">
            <span className="text-cyan-600">●</span> セキュリティ状態
          </li>
          <li className="flex items-center gap-1.5">
            <span className="text-cyan-600">●</span> 表示速度
          </li>
          <li className="flex items-center gap-1.5">
            <span className="text-cyan-600">●</span> SEO対策状況
          </li>
        </ul>
        <p className="mt-2 text-xs text-slate-500">
          提供：君斗りんくのWEBサイト健康診断（web-health-check.link）／登録不要・約1分
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <a
            href={URLS.web}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl bg-cyan-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-cyan-700"
          >
            サイトURLで無料診断する →
          </a>
          {secondary ? (
            <a
              href={secondary.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl border border-cyan-300 bg-white px-5 py-3 text-sm font-bold text-cyan-700 transition hover:border-cyan-400 hover:bg-cyan-50"
            >
              {secondary.label}
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
