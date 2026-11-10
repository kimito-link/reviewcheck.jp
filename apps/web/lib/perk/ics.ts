import { SITE } from "@reviewcheck/config";

/** 再点検のページ。クエリも店名も付けない。 */
export function recheckPageUrl(): string {
  return `${SITE.baseUrl}/check/`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function jstYmd(date: Date): { y: number; m: number; d: number } | null {
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const g = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  const y = g("year");
  const m = g("month");
  const d = g("day");
  if (!y || !m || !d) return null;
  return { y, m, d };
}

function addCalendarMonths(
  y: number,
  m: number,
  d: number,
  months: number,
): { y: number; m: number; d: number } {
  const shifted = new Date(Date.UTC(y, m - 1 + months, 1));
  const yy = shifted.getUTCFullYear();
  const mm = shifted.getUTCMonth();
  const lastDay = new Date(Date.UTC(yy, mm + 1, 0)).getUTCDate();
  return { y: yy, m: mm + 1, d: Math.min(d, lastDay) };
}

function formatUtcCompact(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

/** 10:00 JST を UTC の時刻にする。 */
function jstTenAmUtc(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d, 1, 0, 0));
}

function foldLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  let current = "";
  const parts: string[] = [];
  for (const ch of line) {
    const next = current + ch;
    const limit = parts.length === 0 ? 75 : 74;
    if (encoder.encode(next).length > limit) {
      parts.push(current);
      current = ch;
    } else {
      current = next;
    }
  }
  if (current) parts.push(current);
  return parts.map((part, i) => (i === 0 ? part : ` ${part}`)).join("\r\n");
}

/**
 * 1か月後の再点検。中身は再点検URLと、店名の入らない件名だけ。
 * 回答・店名・点数は入れない。
 */
export function buildRecheckIcs(diagnosedAtIso: string, now = new Date()): string {
  const basis = new Date(diagnosedAtIso);
  const ymd = jstYmd(Number.isNaN(basis.getTime()) ? now : basis) ?? jstYmd(now);
  const safe = ymd ?? { y: 2026, m: 1, d: 1 };
  const next = addCalendarMonths(safe.y, safe.m, safe.d, 1);
  const start = jstTenAmUtc(next.y, next.m, next.d);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const url = recheckPageUrl();
  const stamp = formatUtcCompact(Number.isNaN(now.getTime()) ? start : now);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//reviewcheck.jp//recheck//JA",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:recheck-${formatUtcCompact(start)}@reviewcheck.jp`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${formatUtcCompact(start)}`,
    `DTEND:${formatUtcCompact(end)}`,
    "SUMMARY:口コミの再点検",
    `DESCRIPTION:${url}`,
    `URL:${url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}
