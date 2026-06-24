import { SITE } from "@reviewcheck/config";

interface LineCtaButtonProps {
  text?: string;
  fullWidth?: boolean;
  size?: "default" | "lg";
  className?: string;
}

/** LINE公式アカウントへの相談CTA（ブランド規定色 #06C755）。 */
export function LineCtaButton({
  text = SITE.line.label,
  fullWidth = false,
  size = "default",
  className = "",
}: LineCtaButtonProps) {
  const sizeCls =
    size === "lg" ? "px-7 py-4 text-base" : "px-5 py-3 text-sm sm:text-base";
  return (
    <a
      href={SITE.line.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-[#06C755] font-bold text-white shadow-sm transition hover:bg-[#05b34d] ${sizeCls} ${
        fullWidth ? "w-full" : ""
      } ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-5 w-5 fill-current"
      >
        <path d="M12 3C6.5 3 2 6.6 2 11.1c0 4 3.6 7.4 8.5 8 .3.1.8.2.9.5.1.3.1.7 0 1l-.1.9c0 .3-.2 1 .9.6 1.1-.5 6-3.5 8.2-6h0c1.5-1.6 2.2-3.3 2.2-5C22.6 6.6 18 3 12 3z" />
      </svg>
      {text}
    </a>
  );
}
