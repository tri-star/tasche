---
name: tailwindcss-v4-postcss-migration
description: tailwindcss 3→4メジャー更新時にfrontend-buildが壊れる原因と、PostCSS+既存tailwind.config.tsを維持したままの最小移行手順(PR #86)
metadata:
  type: project
---

tailwindcss を v3→v4(例: 3.4.19→4.3.2)にメジャー更新すると、`postcss.config.cjs` で
`tailwindcss` を直接PostCSSプラグイン指定している場合、ビルド時に
「It looks like you're trying to use `tailwindcss` directly as a PostCSS plugin.」
というエラーで `frontend-build` が失敗する(vite build内のpostcss処理でエラー)。

**Why:** v4でPostCSSプラグインが `@tailwindcss/postcss` パッケージに分離されたため。
また `@tailwind base/components/utilities` ディレクティブも廃止され `@import "tailwindcss";`
に統一された。v4は内部でLightning CSSを使いベンダープレフィックスも自動付与するため
`autoprefixer` は不要になる(postcss.config.cjsから削除、devDependenciesからも削除可能)。

**How to apply:**
1. `devDependencies` に `@tailwindcss/postcss` をtailwindcssと同バージョンで追加。
2. `postcss.config.cjs` の plugins を `{ "@tailwindcss/postcss": {} }` のみにする
   (`tailwindcss`・`autoprefixer` エントリは削除)。
3. CSSエントリファイル(例: `src/index.css`)の `@tailwind base/components/utilities` を
   `@import "tailwindcss";` に置き換える。
4. 既存の `tailwind.config.ts`(theme.extend のカスタムカラーや `tailwindcss-animate` などの
   プラグインを使っている場合)は書き換えずに `@config "../tailwind.config.ts";` で読み込み続けられる
   (v3→v4のCSS-first移行を伴う大規模書き換えは不要)。
5. **重要**: CSSのat-rule順序ルールに注意。`@import` は `@charset`・空の`@layer`以外の
   すべての文より前に置く必要があるというCSS仕様上の制約があり、`@config` は`@import`ではない
   ただの文として扱われるため、**同一ファイル内のすべての`@import`(tailwindcss本体・フォント等)は
   `@config` より前に置く**。逆にすると `[vite:css][postcss] @import must precede all other
   statements` という警告が出るだけでなく、実際にTailwindのユーティリティ生成が空になり
   (出力CSSが数KBしかない=ほぼ空)、ビルド自体は成功してしまうため見た目の成功に騙されないよう
   出力CSSのサイズや実際のクラス(`.flex{...}`や独自カラー`.bg-primary`等)が生成されているか
   必ず確認すること。

このパターンは今後 tailwindcss や関連プラグイン(daisyui等)のメジャー更新PRでも
繰り返し発生しうる。[[orval_upgrade_notes]] や [[biome_schema_version_mismatch]] と同様、
frontend系メジャー更新でのCI失敗調査時にまず参照する。
