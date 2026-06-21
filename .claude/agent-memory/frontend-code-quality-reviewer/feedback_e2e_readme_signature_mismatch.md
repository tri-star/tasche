---
name: e2e-readme-signature-mismatch
description: TCH-75: e2e/README.mdのサンプルコードがauth fixture の実際のシグネチャと乖離していた。README更新漏れはE2Eテスト作成時のバグ温床になる。
metadata:
  type: feedback
---

`src/e2e/README.md` で `auth.loginAs({ email: ... })` というオブジェクト渡しのサンプルが記載されていたが、実際の `AuthFixture["loginAs"]` は `(email?: string) => Promise<void>` で文字列を受け取る。

**Why:** E2E fixture のシグネチャ変更時に README が更新されなかった。

**How to apply:** E2E fixture（`auth.ts`）のシグネチャ変更レビュー時は `e2e/README.md` のサンプルコードとの整合を必ず確認する。実行時にサイレントにバグになるため Warning 以上で扱う。
