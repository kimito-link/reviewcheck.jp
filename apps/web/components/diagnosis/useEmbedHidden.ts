"use client";

import { useEffect, useState } from "react";

/** ?embed=1 のときは、あとから足した診断の回遊ブロックを出さない。 */
export function useEmbedHidden(): boolean {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const embed = new URLSearchParams(window.location.search).get("embed") === "1";
    setHidden(embed);
  }, []);
  return hidden;
}
