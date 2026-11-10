import type { AreaMapPin } from "@reviewcheck/core/areaMap";

/**
 * 地図の差し替え口。画面はこの interface だけを知る。
 * タイル提供者や SDK が変わっても、一覧と順位の計算はここを通らない。
 */
export interface AreaMapProvider {
  readonly id: string;
  /** コンテナへ地図を出す。戻り値で片付ける。失敗したら reject する。 */
  mount(container: HTMLElement, pins: AreaMapPin[]): Promise<() => void>;
}
