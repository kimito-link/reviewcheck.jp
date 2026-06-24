import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * www あり → www なし へ統一リダイレクト（301）。
 * http → https は Vercel/ホスティング側で強制する前提（README参照）。
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  if (host.startsWith("www.")) {
    const url = request.nextUrl.clone();
    url.host = host.slice(4);
    url.protocol = "https:";
    return NextResponse.redirect(url, 301);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|.*\\..*).*)"],
};
