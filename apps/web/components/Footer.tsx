import Link from "next/link";
import Image from "next/image";
import { FOOTER_LINKS, SITE, DISCLAIMER } from "@reviewcheck/config";
import { Container } from "./Container";

export function Footer() {
  return (
    <footer
      className="mt-20 border-t border-white/10 text-slate-300"
      style={{ backgroundColor: "#0f1b2d" }}
    >
      <Container className="py-12 pb-28 sm:pb-12">
        <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex rounded bg-white p-1.5">
            <Image
              src="/brand/reversehack-wordmark.png"
              alt="リバースハック reverse-Re:birth hack"
              width={220}
              height={60}
              className="h-9 w-auto"
            />
          </span>
          <p className="max-w-md text-xs text-slate-400">
            <span className="font-bold text-white">{SITE.name}</span>{" "}
            は、口コミ・MEO改善ブランド「リバースハック（reverse-Re:birth
            hack）」が運営しています。
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {FOOTER_LINKS.map((group) => (
            <div key={group.heading}>
              <h3 className="text-sm font-bold text-white">{group.heading}</h3>
              <ul className="mt-3 space-y-2">
                {group.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-slate-400 transition-colors hover:text-amber-300"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-10 rounded-lg bg-white/5 p-4 text-xs leading-relaxed text-slate-400">
          {DISCLAIMER}
        </p>
        <p className="mt-6 text-xs text-slate-400">
          © {new Date().getFullYear()} リバースハック（reverse-Re:birth hack） /{" "}
          {SITE.name}
        </p>
      </Container>
    </footer>
  );
}
