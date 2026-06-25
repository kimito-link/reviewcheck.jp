"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { MAIN_NAV, SITE } from "@reviewcheck/config";
import { Container } from "./Container";

function LineIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`${className} fill-current`}>
      <path d="M12 3C6.5 3 2 6.6 2 11.1c0 4 3.6 7.4 8.5 8 .3.1.8.2.9.5.1.3.1.7 0 1l-.1.9c0 .3-.2 1 .9.6 1.1-.5 6-3.5 8.2-6h0c1.5-1.6 2.2-3.3 2.2-5C22.6 6.6 18 3 12 3z" />
    </svg>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-50 border-b border-white/10 backdrop-blur-md"
      style={{ backgroundColor: "rgba(15,27,45,0.95)" }}
    >
      <Container className="flex h-16 items-center justify-between gap-3">
        <Link
          href="/"
          className="flex items-center gap-2 font-extrabold text-white"
          aria-label={`${SITE.name}（運営：リバースハック）`}
          onClick={() => setOpen(false)}
        >
          <Image
            src="/brand/reversehack-logo.png"
            alt="リバースハック"
            width={40}
            height={40}
            priority
            className="h-9 w-9 rounded bg-white object-contain p-0.5 sm:h-10 sm:w-10"
          />
          <span className="text-sm leading-tight sm:text-base">{SITE.name}</span>
        </Link>

        {/* PC: 横並びナビ */}
        <nav className="hidden items-center gap-4 text-sm font-medium text-slate-200 lg:flex">
          {MAIN_NAV.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="whitespace-nowrap transition-colors hover:text-amber-300"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={SITE.line.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-1.5 rounded-lg bg-[#06C755] px-3.5 py-2 text-sm font-bold text-white transition hover:bg-[#05b34d] sm:inline-flex"
          >
            <LineIcon />
            LINE相談
          </a>
          <Link
            href="/check/"
            className="inline-flex items-center rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-bold text-white transition hover:bg-blue-500"
            onClick={() => setOpen(false)}
          >
            無料診断
          </Link>

          {/* モバイル/タブレット: ハンバーガー */}
          <button
            type="button"
            aria-label="メニューを開く"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-white ring-1 ring-white/20 transition hover:bg-white/10 lg:hidden"
          >
            {open ? (
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="2" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="2" aria-hidden>
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </Container>

      {/* モバイルメニュー本体 */}
      {open ? (
        <div className="border-t border-white/10 lg:hidden" style={{ backgroundColor: "rgba(15,27,45,0.98)" }}>
          <Container className="py-3">
            <nav className="flex flex-col">
              {MAIN_NAV.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between rounded-lg px-3 py-3 text-base font-medium text-slate-100 transition hover:bg-white/10"
                >
                  <span>{l.label}</span>
                  <span className="text-slate-400" aria-hidden>
                    ›
                  </span>
                </Link>
              ))}
            </nav>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Link
                href="/check/"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-500"
              >
                ★ 無料で診断する
              </Link>
              <a
                href={SITE.line.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#06C755] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#05b34d]"
              >
                <LineIcon />
                LINEで相談する
              </a>
            </div>
          </Container>
        </div>
      ) : null}
    </header>
  );
}
