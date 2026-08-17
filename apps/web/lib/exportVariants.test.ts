import { describe, expect, it } from "vitest";
import {
  buildExport,
  buildExternalReport,
  buildInternalReport,
  buildReferralNote,
  buildSendMessage,
  INTERNAL_ONLY_MARKERS,
  type ExportInput,
} from "./exportVariants";

/**
 * 出力区分の分離（2026-08-17）。
 *
 * ★発端: 外部送付用レポートに「相手へ返す文章（そのまま送付可）」
 *   「紹介先へ転送できる短文」といった内部向けの見出しが混ざったまま送付された。
 *   従来のエクスポートは**1種類しか無く**、外部用と手元用の区別が構造的に無かった。
 *
 * ★このテストの主眼は1つ:「外部送付用に内部向け語彙が1語も混ざらないこと」を
 *   機械的に固定する。目視のレビューでは混入を見抜けなかった（実際に事故った）。
 */

const INPUT: ExportInput = {
  targetName: "株式会社テスト",
  facts: [
    { observation: "公式サイトが確認できました", sourceName: "Web", retrievedAt: "2026-08-17" },
  ],
  failures: [{ source: "官報", attemptedAt: "2026-08-17" }],
  baseDate: "2026-08-17",
};

describe("★外部送付用レポートに内部向けの文章が混ざらない", () => {
  it("既知の内部向け語彙を1語も含まない", () => {
    const out = buildExternalReport(INPUT);
    for (const marker of INTERNAL_ONLY_MARKERS) {
      expect(out, `外部送付用に「${marker}」が混入している`).not.toContain(marker);
    }
  });

  it("★紹介コードを外部送付用に載せない（refを渡しても出ない）", () => {
    const out = buildExport("external", INPUT, "mutou");
    expect(out).not.toContain("mutou");
    expect(out).not.toContain("ref=");
  });

  it("★陰性対照: この検査が実際に効くこと（事故の実物を食わせる）", () => {
    // 実際に混入した文章そのもの。これを検査に通して**捕まること**を確かめる。
    // 捕まらないなら、この検査は事故を1件も防げない。
    const 事故の実物 = [
      "CLIENT-READY DRAFT",
      "相手へ返す文章（そのまま送付可）",
      "紹介先へ転送できる短文",
      "商品設計用のメモ：将来サービス化を想定",
      "収益設計：報酬率は要検討",
    ];
    for (const leaked of 事故の実物) {
      expect(
        INTERNAL_ONLY_MARKERS.some((m) => leaked.includes(m)),
        `検査をすり抜ける: ${leaked}`,
      ).toBe(true);
    }
  });

  it("免責と『保証ではない』旨を必ず含む", () => {
    const out = buildExternalReport(INPUT);
    expect(out).toContain("免責事項");
    expect(out).toContain("安全性を保証するものではありません");
    expect(out).toContain("判定するものではありません");
  });

  it("外部向けの見出しに置き換わっている（社内語を使わない）", () => {
    const out = buildExternalReport(INPUT);
    expect(out).toContain("公開情報・風評リスク診断レポート");
    expect(out).toContain("取扱注意");
    expect(out).toContain("基準日：2026-08-17");
    expect(out).toContain("公開情報による一次診断");
    expect(out).toContain("診断後のご案内");
  });

  it("取得できなかった情報源があれば追加確認事項を出す", () => {
    expect(buildExternalReport(INPUT)).toContain("追加確認事項");
    // 失敗が無ければ出さない（不要な節で読み手を惑わせない）
    expect(buildExternalReport({ ...INPUT, failures: [] })).not.toContain("追加確認事項");
  });

  it("★LINE案内は指定どおりの自然な表現", () => {
    expect(buildExternalReport(INPUT)).toContain(
      "簡易診断後、結果画面のLINEから、風評リスク診断またはITセキュリティチェックの具体的な内容をご相談いただけます。",
    );
  });
});

describe("区分ごとの役割", () => {
  it("既定（未指定・未知の値）は外部送付用に倒れる", () => {
    const external = buildExternalReport(INPUT);
    expect(buildExport("external", INPUT)).toBe(external);
    // ★未知の値で内部用に倒れると事故になる。安全側（外部用）に倒す。
    expect(buildExport("unknown" as never, INPUT)).toBe(external);
  });

  it("社内確認用は外部送付用を内包しつつ、社内向けと明示する", () => {
    const out = buildInternalReport(INPUT);
    expect(out).toContain("【社内確認用】この文章は外部送付用ではありません。");
    expect(out).toContain("社内メモ欄");
  });

  it("送付メッセージはレポート本体を含まない短文", () => {
    const out = buildSendMessage(INPUT);
    expect(out).toContain("株式会社テスト");
    expect(out).not.toContain("■ 調査結果と根拠");
    expect(out).toContain("判定するものではありません");
  });

  it("★紹介コードは紹介用短文にだけ載る", () => {
    expect(buildReferralNote(INPUT, "mutou")).toContain("?ref=mutou");
    // ref 無しでもリンク自体は出す（導線を切らない）
    expect(buildReferralNote(INPUT, null)).toContain("app.web-health-check.link/");
    expect(buildReferralNote(INPUT, null)).not.toContain("?ref=");
  });

  it("★不正な ref はURLに載せない（注入を防ぐ）", () => {
    for (const bad of ["a b", "x".repeat(33), "<script>", "WEBHC"]) {
      expect(buildReferralNote(INPUT, bad), `NG: ${bad}`).not.toContain("?ref=");
    }
  });
});

describe("AIだけで判定・保証すると読ませない", () => {
  it("★断定的な判定語を使わない", () => {
    for (const v of ["external", "internal", "message", "referral"] as const) {
      const out = buildExport(v, INPUT, "mutou");
      expect(out, `${v}`).not.toMatch(/反社(である|ではない|と判定)/);
      expect(out, `${v}`).not.toMatch(/安全です|問題ありません|保証します/);
    }
  });
});
