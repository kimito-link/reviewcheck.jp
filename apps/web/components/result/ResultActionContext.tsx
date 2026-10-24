"use client";

import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

interface ResultActionState {
  includeShop: boolean;
  setIncludeShop: (value: boolean) => void;
}

const ResultActionContext = createContext<ResultActionState>({
  includeShop: false,
  setIncludeShop: () => {},
});

/** 店名をLINEの文面に含めるかは、結果画面の中で1か所だけ選ぶ。既定は含めない。 */
export function ResultActionProvider({ children }: { children: ReactNode }) {
  const [includeShop, setIncludeShop] = useState(false);
  return (
    <ResultActionContext.Provider value={{ includeShop, setIncludeShop }}>
      {children}
    </ResultActionContext.Provider>
  );
}

export function useIncludeShop(): ResultActionState {
  return useContext(ResultActionContext);
}
