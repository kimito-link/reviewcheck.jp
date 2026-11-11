/**
 * プレビュー・クローラ・先読みは Places を呼ばない。
 * 人が文書として開いたときだけ、共有リンクの取り直しを許可する。
 * User-Agent が空のときは、取り直ししない。
 */

const AUTOMATED =
  /bot|crawler|spider|slurp|facebookexternalhit|slackbot|twitterbot|linkedinbot|discordbot|whatsapp|telegrambot|googlebot|bingbot|applebot|embedly|quora|pinterest|redditbot|ia_archiver|preview/i;

export function isPreviewRequest(headerList: { get(name: string): string | null }): boolean {
  const purpose = `${headerList.get("purpose") ?? ""} ${headerList.get("sec-purpose") ?? ""} ${headerList.get("x-purpose") ?? ""}`.toLowerCase();
  if (purpose.includes("prefetch") || purpose.includes("preview")) return true;
  if (headerList.get("next-router-prefetch") === "1") return true;
  if (headerList.get("x-middleware-prefetch")) return true;

  const ua = headerList.get("user-agent") ?? "";
  if (!ua.trim()) return true;
  if (AUTOMATED.test(ua)) return true;

  const dest = headerList.get("sec-fetch-dest");
  if (dest && dest.toLowerCase() !== "document") return true;
  return false;
}
