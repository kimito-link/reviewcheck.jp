import Link from "next/link";
import { INTERNAL_LINKS } from "@reviewcheck/config";

export function InternalLinks() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {INTERNAL_LINKS.map((l, i) => (
        <Link
          key={l.href + i}
          href={l.href}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-bold text-blue-700 hover:bg-blue-50"
        >
          {l.label}
        </Link>
      ))}
    </div>
  );
}
