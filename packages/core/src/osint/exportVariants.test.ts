/**
 * 出力区分の分離（2026-08-17）。
 *
 * 実行: npm test（root の node --test 連鎖に乗る。追加依存なし）
 *
 * ★発端: 外部送付用レポートに、内部向けの文章（「相手へ返す文章（そのまま送付可）」
 *   「紹介先へ転送できる短文」等）が混ざったまま送付された。
 *   従来のエクスポートは**1種類しか無く**、外部用と手元用の区別が構造的に無かった。
 *
 * ★このテストの主眼:「外部送付用に内部向け語彙が1語も混ざらないこと」を機械的に固定する。
 *   目視のレビューでは混入を見抜けなかった（実際に事故った）。
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  buildExport,
  buildExternalReport,
  buildInternalReport,
  buildReferralNote,
  buildSendMessage,
  INTERNAL_ONLY_MARKERS,
  type ExportInput,
} from "./exportVariants.ts";

const INPUT: ExportInput = {
  targetName: "株式会社テスト",
  facts: [
    { observation: "公式サイトが確認できました", sourceName: "Web", retrievedAt: "2026-08-17" },
  ],
  failures: [{ source: "官報", attemptedAt: "2026-08-17" }],
  baseDate: "2026-08-17",
};

const KINDS = ["external", "internal", "message", "referral"] as const;

describe("★外部送付用レポートに内部向けの文章が混ざらない", () => {
  test("既知の内部向け語彙を1語も含まない", () => {
    const out = buildExternalReport(INPUT);
    for (const marker of INTERNAL_ONLY_MARKERS) {
      assert.ok(!out.includes(marker), `外部送付用に「${marker}」が混入している`);
    }
  });

  test("★紹介コードを外部送付用に載せない（refを渡しても出ない）", () => {
    const out = buildExport("external", INPUT, "mutou");
    assert.ok(!out.includes("mutou"));
    assert.ok(!out.includes("ref="));
  });

  test("★陰性対照: この検査が実際に効くこと（事故の実物を食わせる）", () => {
    // 実際に混入した文章そのもの。捕まらないなら、この検査は事故を1件も防げない。
    const 事故の実物 = [
      "CLIENT-READY DRAFT",
      "相手へ返す文章（そのまま送付可）",
      "紹介先へ転送できる短文",
      "商品設計用のメモ：将来サービス化を想定",
      "収益設計：報酬率は要検討",
    ];
    for (const leaked of 事故の実物) {
      assert.ok(
        INTERNAL_ONLY_MARKERS.some((m) => leaked.includes(m)),
        `検査をすり抜ける: ${leaked}`,
      );
    }
  });

  test("免責と『保証ではない』旨を必ず含む", () => {
    const out = buildExternalReport(INPUT);
    assert.ok(out.includes("免責事項"));
    assert.ok(out.includes("安全性を保証するものではありません"));
    assert.ok(out.includes("判定するものではありません"));
  });

  test("外部向けの見出しに置き換わっている（社内語を使わない）", () => {
    const out = buildExternalReport(INPUT);
    for (const s of [
      "公開情報・風評リスク診断レポート",
      "取扱注意",
      "基準日：2026-08-17",
      "公開情報による一次診断",
      "診断後のご案内",
    ]) {
      assert.ok(out.includes(s), `見出しが無い: ${s}`);
    }
  });

  test("取得できなかった情報源があれば追加確認事項を出す", () => {
    assert.ok(buildExternalReport(INPUT).includes("追加確認事項"));
    // 失敗が無ければ出さない（不要な節で読み手を惑わせない）
    assert.ok(!buildExternalReport({ ...INPUT, failures: [] }).includes("追加確認事項"));
  });

  test("★LINE案内は指定どおりの自然な表現", () => {
    assert.ok(
      buildExternalReport(INPUT).includes(
        "簡易診断後、結果画面のLINEから、風評リスク診断またはITセキュリティチェックの具体的な内容をご相談いただけます。",
      ),
    );
  });
});

describe("区分ごとの役割", () => {
  test("既定（未知の値を含む）は外部送付用に倒れる", () => {
    const external = buildExternalReport(INPUT);
    assert.equal(buildExport("external", INPUT), external);
    // ★未知の値で内部用に倒れると事故になる。安全側（外部用）に倒す。
    assert.equal(buildExport("unknown" as never, INPUT), external);
  });

  test("社内確認用は外部送付用を内包しつつ、社内向けと明示する", () => {
    const out = buildInternalReport(INPUT);
    assert.ok(out.includes("【社内確認用】この文章は外部送付用ではありません。"));
    assert.ok(out.includes("社内メモ欄"));
  });

  test("送付メッセージはレポート本体を含まない短文", () => {
    const out = buildSendMessage(INPUT);
    assert.ok(out.includes("株式会社テスト"));
    assert.ok(!out.includes("■ 調査結果と根拠"));
    assert.ok(out.includes("判定するものではありません"));
  });

  test("★紹介コードは紹介用短文にだけ載る", () => {
    assert.ok(buildReferralNote(INPUT, "mutou").includes("?ref=mutou"));
    // ref 無しでもリンク自体は出す（導線を切らない）
    assert.ok(buildReferralNote(INPUT, null).includes("app.web-health-check.link/"));
    assert.ok(!buildReferralNote(INPUT, null).includes("?ref="));
  });

  test("★不正な ref はURLに載せない（注入を防ぐ）", () => {
    for (const bad of ["a b", "x".repeat(33), "<script>", "WEBHC"]) {
      assert.ok(!buildReferralNote(INPUT, bad).includes("?ref="), `NG: ${bad}`);
    }
  });
});

describe("AIだけで判定・保証すると読ませない", () => {
  test("★断定的な判定語を全区分で使わない", () => {
    for (const v of KINDS) {
      const out = buildExport(v, INPUT, "mutou");
      assert.ok(!/反社(である|ではない|と判定)/.test(out), v);
      assert.ok(!/安全です|問題ありません|保証します/.test(out), v);
    }
  });
});
