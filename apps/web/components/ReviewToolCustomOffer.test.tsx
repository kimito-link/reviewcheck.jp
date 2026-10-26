import type { AnchorHTMLAttributes, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SITE } from "@reviewcheck/config";
import { ReviewToolCustomOffer } from "./ReviewToolCustomOffer";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
  } & AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={typeof href === "string" ? href : ""} {...props}>
      {children}
    </a>
  ),
}));

const FORBIDDEN = [
  "無料",
  "サジェスト",
  "逆SEO",
  "押し下げ",
  "口コミを書く前に",
  "投稿は待って",
  "満足したお客様だけ",
  "満足客",
  "低評価を未然",
  "削除代行",
  "万円",
];

describe("ReviewToolCustomOffer", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  test("パッケージ項目と、載せない表現", () => {
    const { container } = render(<ReviewToolCustomOffer />);
    for (const title of [
      "口コミ作成ツール",
      "AI口コミ対策サポート",
      "提携弁護士の窓口",
      "口コミ獲得・評判改善コンサル",
      "公式WEBサイト",
      "公式LINE＋集客導線",
      "店舗アプリ（iOS / Android）",
      "契約者専用AIサポート",
      "NFC口コミカード",
    ]) {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    }
    const text = container.textContent ?? "";
    for (const word of FORBIDDEN) {
      expect(text).not.toContain(word);
    }
    expect(text).toContain("削除される保証はありません");
    expect(text).toContain("月額パッケージに含まれます");
    expect(text).toContain("申請はお店ご自身で行います");
    expect(text).toContain(
      "不満の声もお店に届くので、改善につなげられます",
    );
    expect(text).toContain(
      "届いた声を会議の議題にする運用までご提案します",
    );
    expect(text).toContain("すべての意見が議題になるとはお約束しません");
  });

  test("外部リンクは別タブで開き、下線がある。相談のLINEは1つ", () => {
    render(<ReviewToolCustomOffer />);
    const links: { name: RegExp; href: string }[] = [
      { name: /制作例/, href: "https://removal-seven.vercel.app/" },
      {
        name: /プラスチックカード（NFC搭載）/,
        href: "https://kimito-link.com/products/plastic-card/",
      },
      {
        name: /アクリルスタンド（NFC搭載）/,
        href: "https://kimito-link.com/products/acrylic-stand/",
      },
      {
        name: /^価格表/,
        href: "https://kimito-link.com/utilized-multiple-ways/price-list/",
      },
    ];
    for (const item of links) {
      const link = screen.getByRole("link", { name: item.name });
      expect(link).toHaveAttribute("href", item.href);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link.getAttribute("rel")).toMatch(/noopener/);
      expect(link.className).toMatch(/underline/);
    }

    const consults = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href") === SITE.line.url);
    expect(consults).toHaveLength(1);
    expect(consults[0]).toHaveAccessibleName(/この仕組みについてLINEで相談する/);
    expect(consults[0]).toHaveAttribute("target", "_blank");
    expect(consults[0]?.getAttribute("rel")).toMatch(/noopener/);
  });

  test("メニューは下書きに入り、不満時も投稿ボタンは同じ大きさで残る", async () => {
    render(<ReviewToolCustomOffer />);
    const draft = screen.getByRole("textbox", { name: /たたき台/ });
    expect(draft).toHaveValue(
      "ラーメンを注文しました。改善してほしい点がありました。",
    );
    expect(
      screen.getByText(
        "この文章はたたき台です。ご自身の言葉に直してから投稿してください。",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/投稿は任意です。謝礼・特典はありません/)).toBeInTheDocument();
    expect(
      screen.getByText(
        "貴重なご意見ありがとうございます。いただいたご意見は、改善点として店内の会議の議題にさせていただきます。お店に直接伝えたいことがあれば、公式LINEからもどうぞ。",
      ),
    ).toBeInTheDocument();

    const review = screen.getByRole("button", { name: /口コミを投稿する/ });
    const line = screen.getByRole("button", { name: /お店に直接伝える/ });
    const reviewClass = review.className;
    expect(review.compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(reviewClass).toContain("w-full");
    expect(reviewClass).toContain("min-h-16");
    expect(line.className).toContain("w-full");
    expect(line.className).toContain("min-h-16");
    expect(line.className).toContain("bg-[#06C755]");

    fireEvent.click(screen.getByRole("button", { name: "餃子" }));
    expect(screen.getByRole("textbox", { name: /たたき台/ })).toHaveValue(
      "餃子を注文しました。改善してほしい点がありました。",
    );

    fireEvent.click(screen.getByRole("button", { name: "美容室" }));
    fireEvent.click(screen.getByRole("button", { name: "ヘアカラー" }));
    expect(screen.getByRole("textbox", { name: /たたき台/ })).toHaveValue(
      "ヘアカラーを利用しました。改善してほしい点がありました。",
    );

    fireEvent.click(screen.getByRole("button", { name: "クリニック" }));
    fireEvent.click(screen.getByRole("button", { name: "定期検診" }));
    expect(screen.getByRole("textbox", { name: /たたき台/ })).toHaveValue(
      "定期検診で伺いました。改善してほしい点がありました。",
    );

    fireEvent.click(screen.getByRole("button", { name: "自由に書く" }));
    fireEvent.change(screen.getByLabelText(/自由入力/), {
      target: { value: "辛味噌ラーメン" },
    });
    expect(screen.getByRole("textbox", { name: /たたき台/ })).toHaveValue(
      "辛味噌ラーメンで伺いました。改善してほしい点がありました。",
    );

    fireEvent.click(screen.getByRole("button", { name: "とても良かった" }));
    const reviewAfter = screen.getByRole("button", { name: /口コミを投稿する/ });
    expect(reviewAfter.className).toBe(reviewClass);
    expect(screen.queryByRole("button", { name: /お店に直接伝える/ })).toBeNull();
    expect(screen.queryByText(/お客様の声/)).toBeNull();
    expect(screen.getByRole("textbox", { name: /たたき台/ })).toHaveValue(
      "辛味噌ラーメンで伺いました。対応も良く、また利用したいと思いました。",
    );

    fireEvent.change(screen.getByRole("textbox", { name: /たたき台/ }), {
      target: { value: "自分の言葉で書き直しました。" },
    });
    fireEvent.click(screen.getByRole("button", { name: /口コミを投稿する/ }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "自分の言葉で書き直しました。",
    );
    expect(await screen.findByText(/コピーしました/)).toBeInTheDocument();
  });

  test("業種タブで会話例を切り替える", () => {
    render(<ReviewToolCustomOffer />);
    expect(screen.getByRole("tab", { name: /クリニック・歯科/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    fireEvent.click(screen.getByRole("tab", { name: "不動産" }));
    expect(screen.getByRole("tab", { name: /不動産/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tabpanel")).toHaveTextContent("内見の希望日を聞く");
    fireEvent.click(screen.getByRole("tab", { name: "飲食" }));
    expect(screen.getByRole("tabpanel")).toHaveTextContent("好きなメニュー");
  });
});
