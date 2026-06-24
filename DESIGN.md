---
version: alpha
name: ReverseHack
description: >-
  リバースハック（reverse-Re:birth hack）のビジュアルアイデンティティ。
  公式パートナーサイトのデザインシステム（Cyber-Minimalist / 黄金比）に準拠し、
  口コミチェック.jp を含む全プロダクトの単一情報源とする。
colors:
  primary: "#1A365D"
  primary-strong: "#122844"
  brand-blue: "#2B6CB0"
  accent: "#D69E2E"
  cta: "#15803D"
  cta-strong: "#166534"
  line: "#06C755"
  ink: "#0F172A"
  surface: "#FFFFFF"
  surface-muted: "#F1F5F9"
  surface-dark: "#0F1B2D"
  border: "#E2E8F0"
  text: "#0F172A"
  text-muted: "#475569"
  on-primary: "#FFFFFF"
  on-dark: "#E2E8F0"
  star: "#F59E0B"
  good: "#15803D"
  caution: "#D97706"
  warning: "#DC2626"
typography:
  display:
    fontFamily: Noto Sans JP
    fontSize: 2.618rem
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  h1:
    fontFamily: Noto Sans JP
    fontSize: 2.118rem
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  h2:
    fontFamily: Noto Sans JP
    fontSize: 1.618rem
    fontWeight: 700
    lineHeight: 1.3
  body-md:
    fontFamily: Noto Sans JP
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.75
  body-sm:
    fontFamily: Noto Sans JP
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.6
  label-caps:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: 700
    letterSpacing: "0.2em"
  code:
    fontFamily: JetBrains Mono
    fontSize: 0.875rem
    fontWeight: 400
rounded:
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  2xl: 64px
components:
  button-primary:
    backgroundColor: "{colors.brand-blue}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    padding: 14px
  button-cta:
    backgroundColor: "{colors.cta}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    padding: 16px
  link:
    textColor: "{colors.brand-blue}"
  header:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.on-dark}"
  section-label:
    textColor: "{colors.accent}"
    typography: "{typography.label-caps}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: 24px
  badge-good:
    backgroundColor: "{colors.good}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.full}"
  badge-caution:
    backgroundColor: "{colors.caution}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
  badge-warning:
    backgroundColor: "{colors.warning}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.full}"
---

## Overview

**リバースハック（reverse-Re:birth hack）** は「不利な状態を、再生（Re:birth）へ反転させる」ブランド。
デザインは公式パートナーサイトと同一の **Cyber-Minimalist × 黄金比（1.618）** を採用し、紺（Navy）を基調に、金（Gold）と緑（Green）のアクセントで「信頼」と「行動（相談・申込）」を両立させる。

代表プロダクト **口コミチェック.jp** は、店舗名またはGoogleマップURLを入れるだけで、Google口コミの星評価・口コミ数・競合との差・「選ばれやすさスコア」を診断する入口。診断で終わらせず、口コミ改善・レビュー返信・MEO対策・悪評対策の相談（LINE）へつなげるコンバージョン導線を最優先に設計する。

**重要なポリシー（DESIGN上の制約）**: 不正な口コミ投稿・口コミ購入・やらせレビュー・競合への低評価工作を想起させる表現／機能・色使いは一切行わない。診断は「目安」であり、検索順位・来店数・星評価の改善を保証しない旨を全結果に明示する。金額（円）での損失額の自動提示は行わず、差は「件数・点数・競合順位」の事実ベースに限定する。

## Colors

紺を権威の主色に、金を「格・実績」、緑を「いますぐ動く（CTA）」の色として明確に役割分担する。

- **Primary / Navy (#1A365D):** ブランドの主色。ダークセクション・ヘッダー・強調見出しの土台。
- **Brand Blue (#2B6CB0):** 主要操作（診断開始など）のボタン・リンク。
- **Accent / Gold (#D69E2E):** セクションラベル・実績・帯の「格」を出す差し色。面では使わず線・小要素に限定。
- **CTA / Green (#15803D):** 「相談・申込」など行動を促すボタン。
- **LINE (#06C755):** LINE公式CTA専用色。LINEボタン以外には使わない。
- **Star (#F59E0B):** 星評価の表示専用色。
- **Selectability semantics:** `good`（#15803D・選ばれやすい）・`caution`（#D97706・改善余地）・`warning`（#DC2626・要対策）。スコア表示のみに使用。

## Typography

- **見出し — Noto Sans JP (700–800):** 黄金比スケール（1.618の冪）。
- **本文 — Noto Sans JP (400):** 行間 1.6–1.75。
- **Label Caps — Inter (700, tracking 0.2em, 大文字):** セクションラベル（"REVIEW CHECK" 等）。金色＋先頭に短い横棒。
- **Code — JetBrains Mono:** スコア数値・件数・点数など。

## Layout

- コンテナ最大幅 **1024–1280px**、左右パディング 1rem→2rem。すべてレスポンシブ（モバイルファースト）。
- セクション間は `xl`（40px）以上。固定ヘッダー(64px)分の `scroll-padding-top` を確保。
- 主要CTAは画面下に **固定相談バー（sticky）** を常設し、離脱前に必ず相談導線へ到達させる。
- URLは末尾スラッシュで統一（`/meo/` 形式）。`index.html` 形式にしない。www なし・https 統一。

## Do's and Don'ts

- **Do:** 紺＝信頼、金＝実績、緑＝行動 の役割分担を厳守する。
- **Do:** 診断後は必ず口コミ改善・MEO相談（LINE）へ誘導する。
- **Do:** 競合との差は「あと何件・何点」の事実で見せ、必ず「目安」と免責を添える。
- **Don't:** 「必ず1位になる」「星が必ず上がる」と断定する／金額損失を捏造して不安を煽る。
- **Don't:** 口コミ購入・やらせ・競合への低評価工作を想起させる表現を使う。
- **Don't:** Gold を広い面に使う／LINE色をLINE以外に使う／ロゴの比率・色を改変する。
