"use client";

import { useEffect } from "react";
import { captureRefFromLocation } from "@/lib/affiliateRef";

/**
 * 着地URLの ?ref= を localStorage へ保存するだけの副作用コンポーネント。
 * 描画には関与しない（ReportView はサーバーコンポーネントのまま・回帰の守り）。
 * /report/[id]/ など server component のページで、次の遷移に ref を持ち越すために置く。
 */
export function AffiliateRefCapture() {
  useEffect(() => {
    captureRefFromLocation();
  }, []);
  return null;
}
