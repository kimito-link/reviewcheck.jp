"use client";

import { useEffect, useState } from "react";

/**
 * 二次導線：同チーム「リバースハック WEB健康診断」への送客カード。
 * 会議結論（2026-06）に基づく設計：
 *  - 本命CTA（相談/サジェスト/モニタリング）の後ろに置く“二次導線”。主役にしない。
 *  - 摩擦ゼロのWebアプリ（DL不要・1分）を主導線にし、ネイティブ/拡張は「常時監視」として副次提示。
 *  - デバイスで出し分け（PC=Chrome拡張 / iOS=App Store / Android=現状はWebアプリ代替）。
 */

// 配布先（実機確認済み 2026-06-24）
const URLS = {
  web: "https://app.reverse-re-birth-hack.com/",
  ios: "https://apps.apple.com/jp/app/id6780161483",
  chrome:
    "https://chromewebstore.google.com/detail/befoihdhopfaaodibepoblcejekffnhk",
  // Android(Play)は審査中のため公開後に差し替え（com.reversehack.webhealth）
  android: null as string | null,
};

type Device = "ios" | "android" | "desktop";

export function ReverseHackPromo() {
  const [device, setDevice] = useState<Device>("desktop");

  useEffect(() => {
    const ua = navigator.userAgent || "";
    if (/iPhone|iPad|iPod/i.test(ua)) setDevice("ios");
    else if (/Android/i.test(ua)) setDevice("android");
    else setDevice("desktop");
  }, []);

  const secondary =
    device === "ios"
      ? { href: URLS.ios, label: "iPhoneアプリで常時チェック", icon: "" }
      : device === "android"
        ? URLS.android
          ? { href: URLS.android, label: "Androidアプリで常時チェック", icon: "" }
          : null
        : { href: URLS.chrome, label: "Chrome拡張で常時チェック", icon: "" };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[11px] font-bold text-white">
            関連ツール
          </span>
          <h2 className="text-base font-bold text-slate-900 sm:text-lg">
            口コミは「表面」。風評・Webの根っこまで1分で。
          </h2>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          会社名・ドメインを入れるだけで、検索の悪評
          <span className="whitespace-nowrap">（サジェスト）</span>
          ・SSL・メールなりすまし対策・情報漏えいリスクまで、
          <strong className="text-slate-900">まとめて無料診断</strong>。
          口コミ改善と並行して「検索での見られ方」も守れます。
        </p>
        <p className="mt-1 text-xs text-slate-500">
          運営：リバースハック（口コミチェック.jp と同チーム）／登録不要・約1分
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {/* 主導線：摩擦ゼロのWebアプリ */}
          <a
            href={URLS.web}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl bg-slate-800 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-900"
          >
            ブラウザで無料診断（1分・登録不要）→
          </a>
          {/* 副次：常時監視（デバイス別） */}
          {secondary ? (
            <a
              href={secondary.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              {secondary.label}
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
