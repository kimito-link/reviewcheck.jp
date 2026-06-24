import Link from "next/link";
import type { Cta } from "@reviewcheck/config";

const STYLES: Record<NonNullable<Cta["emphasis"]>, string> = {
  primary:
    "bg-blue-600 text-white hover:bg-blue-700 shadow-sm focus-visible:outline-blue-600",
  cta: "bg-cta text-white hover:bg-cta-strong shadow-sm focus-visible:outline-cta",
  default:
    "bg-white text-blue-700 ring-1 ring-inset ring-blue-200 hover:bg-blue-50",
};

export function CtaButton({
  cta,
  full = false,
  size = "md",
}: {
  cta: Cta;
  full?: boolean;
  size?: "md" | "lg";
}) {
  const emphasis = cta.emphasis ?? "default";
  const sizeClass =
    size === "lg" ? "px-6 py-3.5 text-base" : "px-4 py-2.5 text-sm";
  return (
    <Link
      href={cta.href}
      className={`inline-flex items-center justify-center rounded-xl font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${STYLES[emphasis]} ${sizeClass} ${full ? "w-full" : ""}`}
    >
      {cta.label}
    </Link>
  );
}
