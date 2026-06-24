import Link from "next/link";
import Image from "next/image";
import { MAIN_NAV, SITE } from "@reviewcheck/config";
import { Container } from "./Container";

export function Header() {
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
        <nav className="hidden items-center gap-5 text-sm font-medium text-slate-200 lg:flex">
          {MAIN_NAV.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="transition-colors hover:text-amber-300"
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
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-4 w-4 fill-current"
            >
              <path d="M12 3C6.5 3 2 6.6 2 11.1c0 4 3.6 7.4 8.5 8 .3.1.8.2.9.5.1.3.1.7 0 1l-.1.9c0 .3-.2 1 .9.6 1.1-.5 6-3.5 8.2-6h0c1.5-1.6 2.2-3.3 2.2-5C22.6 6.6 18 3 12 3z" />
            </svg>
            LINE相談
          </a>
          <Link
            href="/check/"
            className="inline-flex items-center rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-bold text-white transition hover:bg-blue-500"
          >
            無料診断
          </Link>
        </div>
      </Container>
    </header>
  );
}
