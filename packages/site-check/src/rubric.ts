import {
  SITE_CHECK_ACTION_POINTS,
  SITE_CHECK_AGGREGATE_MIN,
  SITE_CHECK_CAUTION_POINTS,
  type SiteCheckCounts,
  type SiteCheckFinding,
  type SiteCheckFix,
  type SiteCheckStatus,
} from "./types";

export interface SiteCheckRow {
  id: string;
  title: string;
}

export interface SiteCheckCopy {
  why: string;
  ifLeft: string;
  fix: SiteCheckFix[];
}

function row(id: string, title: string): SiteCheckRow {
  return { id, title };
}

/** 画面と採点で共通の並び。足す・減らす・順番を変えるときは版を上げる。 */
export const SITE_CHECK_ROWS: readonly SiteCheckRow[] = [
  row("https", "HTTPSでの配信"),
  row("https-redirect", "HTTPからHTTPSへの転送"),
  row("cert-expiry", "通信の証明書の期限"),
  row("hsts", "常に暗号化通信を使う指示"),
  row("version-headers", "サーバーや言語の版の公開"),
  row("header-csp", "プログラムの読み込み元の制限"),
  row("header-frame", "他サイトへの埋め込みの制限"),
  row("header-nosniff", "ファイルの種類の自己判断を止める指示"),
  row("header-referrer", "アクセス元情報の範囲"),
  row("header-permissions", "カメラや位置情報の利用制限"),
  row("mixed-content", "暗号化されていない読み込みの混在"),
  row("exposed-files", "公開してはいけないファイル"),
  row("dir-uploads", "アップロード先の一覧"),
  row("js-libs", "公開された読み込み先の版"),
  row("wp-generator", "ページに出る仕組みの版"),
  row("wp-readme", "導入手順の公開"),
  row("wp-feed", "更新情報に出る版"),
  row("wp-users-rest", "利用者一覧の公開"),
  row("wp-users-author", "著者ページからの名前"),
  row("wp-xmlrpc", "外部から手順を受ける入口"),
  row("spf", "送信元の証明"),
  row("dmarc", "なりすましへの対応方針"),
];

const COPY: Record<string, SiteCheckCopy> = {
  https: {
    why: "ブラウザとサイトの間を暗号化して届ける入口です。",
    ifLeft: "暗号化されていない入口のままだと、途中で内容を読まれる余地が残ります。",
    fix: [
      {
        label: "Apache",
        code: "RewriteEngine On\nRewriteCond %{HTTPS} !=on\nRewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]",
      },
      { label: "nginx", code: "return 301 https://$host$request_uri;" },
    ],
  },
  "https-redirect": {
    why: "HTTPで開いた人を、HTTPSの入口へ移しているかの確認です。",
    ifLeft: "HTTPの入口が残ると、暗号化されない経路で開く人が残ります。",
    fix: [
      {
        label: "Apache",
        code: "RewriteEngine On\nRewriteCond %{HTTPS} !=on\nRewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]",
      },
      { label: "nginx", code: "server {\n  listen 80;\n  return 301 https://$host$request_uri;\n}" },
    ],
  },
  "cert-expiry": {
    why: "暗号化に使う証明書の期限が、外から読める範囲にあるかの確認です。",
    ifLeft: "期限を過ぎると、ブラウザが警告を出してサイトを開けない人が増えます。",
    fix: [
      {
        label: "確認",
        code: "証明書の自動更新が動いているかを、サーバーの管理画面で見ます。\n止まっていれば、発行元の手順で更新して読み込み直します。",
      },
    ],
  },
  hsts: {
    why: "次回からHTTPSで開くよう、ブラウザへ伝える指示があるかの確認です。",
    ifLeft: "指示が無いと、HTTPの入口を知っているブラウザは、また暗号化されない経路を試せます。",
    fix: [
      { label: "Apache", code: 'Header always set Strict-Transport-Security "max-age=15552000"' },
      { label: "nginx", code: 'add_header Strict-Transport-Security "max-age=15552000" always;' },
    ],
  },
  "version-headers": {
    why: "応答に、サーバーや言語の版の番号が出ていないかの確認です。",
    ifLeft: "版が見えると、その版向けに知られた不具合を探す材料になります。",
    fix: [
      { label: "Apache", code: "ServerTokens Prod\nServerSignature Off" },
      { label: "PHP", code: "expose_php = Off" },
      { label: "nginx", code: "server_tokens off;\nfastcgi_hide_header X-Powered-By;" },
    ],
  },
  "header-csp": {
    why: "ページが読み込めるプログラムの出所を、ブラウザに伝えているかの確認です。",
    ifLeft: "制限が無い、または広すぎると、紛れ込んだプログラムも動かしやすくなります。",
    fix: [
      { label: "まず記録だけ", code: "Content-Security-Policy-Report-Only: default-src 'self'" },
      { label: "Apache", code: 'Header always set Content-Security-Policy-Report-Only "default-src \'self\'"' },
      { label: "nginx", code: 'add_header Content-Security-Policy-Report-Only "default-src \'self\'" always;' },
    ],
  },
  "header-frame": {
    why: "このページを、ほかのサイトの枠の中に埋め込めるかの確認です。",
    ifLeft: "埋め込みを断る指示が無いと、透明な枠を重ねて別のボタンを押させる余地が残ります。",
    fix: [
      { label: "Apache", code: 'Header always set X-Frame-Options "SAMEORIGIN"' },
      { label: "nginx", code: 'add_header X-Frame-Options "SAMEORIGIN" always;' },
      { label: "読み込み元の制限", code: "Content-Security-Policy: frame-ancestors 'self'" },
    ],
  },
  "header-nosniff": {
    why: "ファイルの種類を、ブラウザが自分で推測しないよう伝えているかの確認です。",
    ifLeft: "推測が残ると、別の種類のファイルとして扱われる余地が残ります。",
    fix: [
      { label: "Apache", code: 'Header always set X-Content-Type-Options "nosniff"' },
      { label: "nginx", code: 'add_header X-Content-Type-Options "nosniff" always;' },
    ],
  },
  "header-referrer": {
    why: "リンク先へ渡す、どのページから来たか、の範囲を決めているかの確認です。",
    ifLeft: "範囲を決めていないと、ページのアドレスに含まれる情報がリンク先へ渡りやすくなります。",
    fix: [
      { label: "Apache", code: 'Header always set Referrer-Policy "strict-origin-when-cross-origin"' },
      { label: "nginx", code: 'add_header Referrer-Policy "strict-origin-when-cross-origin" always;' },
    ],
  },
  "header-permissions": {
    why: "カメラや位置情報など、ページが使える機能を絞っているかの確認です。",
    ifLeft: "絞っていないと、読み込んだプログラムが使わない機能まで使える余地が残ります。",
    fix: [
      { label: "Apache", code: 'Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"' },
      { label: "nginx", code: 'add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;' },
    ],
  },
  "mixed-content": {
    why: "HTTPSのページの中に、HTTPの読み込みが残っていないかの確認です。",
    ifLeft: "一部が暗号化されないと、その読み込みだけ途中で差し替えられる余地が残ります。",
    fix: [{ label: "直し方", code: "画像・CSS・JavaScriptの住所を、https:// にそろえます。" }],
  },
  "exposed-files": {
    why: "設定ファイルや履歴、控えのファイルが外から読めていないかの確認です。",
    ifLeft: "読める状態が続くと、接続情報や過去の内容が外に残ります。",
    fix: [
      {
        label: "対応",
        code: "公開ディレクトリから外へ移します。\nすでに見えた接続情報は、発行し直します。\n.git と .env は公開側に置かないようにします。",
      },
    ],
  },
  "dir-uploads": {
    why: "アップロード先を開いたとき、ファイルの一覧が出ないかの確認です。",
    ifLeft: "一覧が出ると、置いたファイルの名前が外から順に見えます。",
    fix: [
      { label: "Apache", code: "Options -Indexes" },
      { label: "nginx", code: "autoindex off;" },
    ],
  },
  "js-libs": {
    why: "公開された読み込み先の住所に、版の番号が出ているときの確認です。",
    ifLeft: "基準より古い番号のままだと、その番号向けに知られた不具合が残ります。番号が見えないことは、古い部品が無いことと同じではありません。",
    fix: [
      {
        label: "対応",
        code: "読み込み先を、配布元が今出している版へ上げます。\n住所に版の番号が無い部品は、ファイルの中を別途確認します。",
      },
    ],
  },
  "wp-generator": {
    why: "ページの先頭に、仕組みの版の番号が出ていないかの確認です。",
    ifLeft: "版が見えると、その版向けの不具合を探す材料になります。",
    fix: [
      {
        label: "WordPress",
        code: "remove_action('wp_head', 'wp_generator');\nadd_filter('the_generator', '__return_empty_string');",
      },
    ],
  },
  "wp-readme": {
    why: "導入手順のページが、外から開かないかの確認です。",
    ifLeft: "手順のページに版の番号が残ると、仕組みの見当が外から付きます。",
    fix: [{ label: "対応", code: "公開ディレクトリの readme.html を削除するか、開けない設定にします。" }],
  },
  "wp-feed": {
    why: "更新情報の配信に、仕組みの版の番号が出ていないかの確認です。",
    ifLeft: "配信に版が含まれると、ページから消しても配信側に番号が残ります。",
    fix: [{ label: "WordPress", code: "add_filter('the_generator', '__return_empty_string');" }],
  },
  "wp-users-rest": {
    why: "利用者の一覧が、決まった住所から読めていないかの確認です。",
    ifLeft: "名前が分かると、残りは合言葉の推測だけになります。",
    fix: [
      {
        label: "WordPress",
        code: "add_filter('rest_endpoints', function ($endpoints) {\n  unset($endpoints['/wp/v2/users']);\n  unset($endpoints['/wp/v2/users/(?P<id>[\\\\d]+)']);\n  return $endpoints;\n});",
      },
    ],
  },
  "wp-users-author": {
    why: "著者番号を付けて開いたとき、著者のページへ移らないかの確認です。番号は1だけ見ます。",
    ifLeft: "著者のページへ移ると、住所や題名から名前が分かります。",
    fix: [
      {
        label: "Apache",
        code: "RewriteEngine On\nRewriteCond %{QUERY_STRING} (^|&)author=\\d+(&|$)\nRewriteRule ^ - [F]",
      },
      { label: "nginx", code: 'if ($query_string ~* "(^|&)author=\\d+(&|$)") {\n  return 403;\n}' },
    ],
  },
  "wp-xmlrpc": {
    why: "外部から手順を受ける入口が、応答する状態かの確認です。ログインは試しません。",
    ifLeft: "入口が開いていると、まとめて手順を送る通信の受け口が残ります。",
    fix: [
      { label: "WordPress", code: "add_filter('xmlrpc_enabled', '__return_false');" },
      { label: "Apache", code: "<Files xmlrpc.php>\n  Require all denied\n</Files>" },
    ],
  },
  spf: {
    why: "そのドメインから送ってよいサーバーを、受信側へ伝えているかの確認です。",
    ifLeft: "証明が無いと、そのドメインをかたるメールを受信側が判別しにくくなります。",
    fix: [{ label: "DNSのTXT", code: "v=spf1 include:_spf.example.net -all" }],
  },
  dmarc: {
    why: "なりすましのメールを、受信側がどう扱うかの方針があるかの確認です。",
    ifLeft: "方針が無い、または監視だけだと、かたるメールを拒否する動きにはなりません。",
    fix: [{ label: "DNSのTXT（_dmarc）", code: "v=DMARC1; p=quarantine; rua=mailto:dmarc@example.net" }],
  },
};

const FALLBACK: SiteCheckCopy = {
  why: "外から見える範囲の確認です。",
  ifLeft: "この項目だけでは、サイト全体の状態は決まりません。",
  fix: [],
};

export function siteCheckCopy(id: string): SiteCheckCopy {
  return COPY[id] ?? FALLBACK;
}

export function siteCheckScore(counts: SiteCheckCounts): number {
  const lost = counts.action * SITE_CHECK_ACTION_POINTS + counts.caution * SITE_CHECK_CAUTION_POINTS;
  return Math.max(0, Math.min(100, 100 - lost));
}

export function siteCheckCountLine(counts: SiteCheckCounts): string {
  return `要対応${counts.action}・注意${counts.caution}・問題なし${counts.ok}・確認できず${counts.unknown}・対象外${counts.na}`;
}

export function siteCheckBand(score: number): number {
  return Math.min(9, Math.max(0, Math.floor(score / 10)));
}

/** この点数以上の記録が全体の何%か。件数が足りなければ null。 */
export function siteCheckTopPercent(buckets: readonly number[], score: number): number | null {
  if (buckets.length !== 10) return null;
  const total = buckets.reduce((sum, n) => sum + (Number.isFinite(n) ? n : 0), 0);
  if (total < SITE_CHECK_AGGREGATE_MIN) return null;
  const band = siteCheckBand(score);
  let atOrAbove = 0;
  for (let i = band; i < 10; i++) atOrAbove += buckets[i] ?? 0;
  return Math.max(1, Math.min(100, Math.round((atOrAbove / total) * 100)));
}

export interface SiteCheckItemDiff {
  comparable: boolean;
  scoreDelta: number | null;
  changed: { id: string; from: SiteCheckStatus; to: SiteCheckStatus }[];
}

export function diffSiteCheckItems(
  prev: { rubric: string; score: number; items: readonly { id: string; status: SiteCheckStatus }[] },
  current: { rubric: string; score: number; items: readonly { id: string; status: SiteCheckStatus }[] },
): SiteCheckItemDiff {
  const comparable = prev.rubric === current.rubric;
  const prevStatus = new Map(prev.items.map((item) => [item.id, item.status]));
  const changed = current.items.flatMap((item) => {
    const from = prevStatus.get(item.id);
    if (!from || from === item.status) return [];
    return [{ id: item.id, from, to: item.status }];
  });
  return {
    comparable,
    scoreDelta: comparable ? current.score - prev.score : null,
    changed,
  };
}

/** 埋め込みを断る指示が、応答の制限に含まれているか。`*` だけは制限と数えない。 */
export function hasFrameAncestors(csp: string): boolean {
  const matched = /(?:^|;)\s*frame-ancestors\s+([^;]+)/i.exec(csp);
  if (!matched?.[1]) return false;
  const value = matched[1].trim();
  if (!value || value === "*" || /(^|\s)\*(\s|$)/.test(value)) return false;
  return true;
}

interface JsFloor {
  id: string;
  re: RegExp;
  floor: string;
}

/** 住所に版の番号があるときだけ比べる。ファイルの中身は取りにいかない。 */
export const JS_LIB_FLOORS: readonly JsFloor[] = [
  { id: "jquery", re: /jquery[-@./](\d+\.\d+\.\d+)/i, floor: "3.5.0" },
  { id: "lodash", re: /lodash[-@./](\d+\.\d+\.\d+)/i, floor: "4.17.21" },
  { id: "moment", re: /moment[-@./](\d+\.\d+\.\d+)/i, floor: "2.29.4" },
  { id: "bootstrap", re: /bootstrap[-@./](\d+\.\d+\.\d+)/i, floor: "4.6.2" },
  { id: "angularjs", re: /angular[-@./](1\.\d+\.\d+)/i, floor: "1.9.0" },
];

export interface JsLibHit {
  id: string;
  version: string;
  outdated: boolean;
}

export function compareNumericVersion(a: string, b: string): number {
  const pa = a.split(".").map((n) => Number.parseInt(n, 10));
  const pb = b.split(".").map((n) => Number.parseInt(n, 10));
  const n = Math.max(pa.length, pb.length, 3);
  for (let i = 0; i < n; i++) {
    const d = (Number.isFinite(pa[i]) ? pa[i]! : 0) - (Number.isFinite(pb[i]) ? pb[i]! : 0);
    if (d !== 0) return d;
  }
  return 0;
}

export function detectJsLibs(scriptSrcs: readonly string[]): JsLibHit[] {
  const best = new Map<string, JsLibHit>();
  for (const src of scriptSrcs) {
    for (const floor of JS_LIB_FLOORS) {
      const matched = floor.re.exec(src);
      if (!matched?.[1]) continue;
      const version = matched[1];
      const outdated = compareNumericVersion(version, floor.floor) < 0;
      const prev = best.get(floor.id);
      if (!prev || compareNumericVersion(version, prev.version) < 0) {
        best.set(floor.id, { id: floor.id, version, outdated });
      }
    }
  }
  return [...best.values()];
}

const STATUS_SUMMARY: Record<SiteCheckStatus, string> = {
  action: "不足が見つかりました。",
  caution: "足した方がよい点が見つかりました。",
  ok: "この項目では不足は見当たりませんでした。",
  unknown: "この項目は確認できませんでした。",
  na: "このサイトの種類では対象外です。",
};

export function evidenceFor(id: string, status: SiteCheckStatus): SiteCheckFinding["evidence"] {
  return {
    summary: STATUS_SUMMARY[status],
    facts: { id, status },
  };
}
