import {
  DIAGNOSIS_PROGRESS_STORAGE_KEY,
  normalizeCheckedIds,
  type DiagnosisAppId,
} from "@reviewcheck/core";

const listeners = new Set<() => void>();

function readRaw(): DiagnosisAppId[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DIAGNOSIS_PROGRESS_STORAGE_KEY);
    if (!raw) return [];
    return normalizeCheckedIds(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

function write(ids: DiagnosisAppId[]) {
  try {
    window.localStorage.setItem(
      DIAGNOSIS_PROGRESS_STORAGE_KEY,
      JSON.stringify(ids),
    );
  } catch {
    /* 保存できない端末でも画面は続ける */
  }
  listeners.forEach((listener) => listener());
}

export function readCheckedDiagnoses(): DiagnosisAppId[] {
  return readRaw();
}

/** この端末の中だけに、確かめた診断のIDを足す。店名は保存しない。 */
export function rememberDiagnosis(id: DiagnosisAppId): DiagnosisAppId[] {
  const current = readRaw();
  if (current.includes(id)) return current;
  const next = [...current, id];
  write(next);
  return next;
}

export function subscribeDiagnosisProgress(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let cachedSnapshot = "";

/** useSyncExternalStore 用。中身が同じなら同じ文字列を返す。 */
export function diagnosisProgressSnapshot(): string {
  const next = readRaw().join(",");
  if (next === cachedSnapshot) return cachedSnapshot;
  cachedSnapshot = next;
  return cachedSnapshot;
}

export function diagnosisProgressServerSnapshot(): string {
  return "";
}
