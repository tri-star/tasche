# ADR-B-001: pytest db_session fixture のエンジンスコープを function に固定する

## 日付

2026-05-31

## コンテキスト

TCH-61（backend pytest DB設定統合・テストコロケーション化）の実装において、テスト用 DB エンジン (`create_async_engine`) の生成スコープを検討した。

パフォーマンスの観点から、エンジンを `session` スコープ fixture として1回だけ生成し、各テストで使い回す方式が望ましい（コネクションプールの再作成コストを排除できる）。しかし実装を試みたところ、pytest-asyncio の設定との組み合わせで問題が発生した。

### 発生した問題

`pyproject.toml` に以下が設定されている：

```toml
asyncio_mode = "auto"
asyncio_default_fixture_loop_scope = "function"
```

`asyncio_default_fixture_loop_scope = "function"` は各テスト関数ごとに独立したイベントループを生成する設定である。asyncpg のコネクションプールはエンジン作成時のイベントループに束縛されるため、session スコープで作成したエンジンを function スコープのループから利用しようとすると、以下のエラーが発生した。

- teardown 時に `RuntimeError` が発生（Python 3.12 + pytest-asyncio の組み合わせ）
- 根本原因：session スコープの async fixture で生成したエンジンが「ループ A」に束縛されるが、各テスト関数は「ループ B, C, ...」を使用するため、ループ不一致が生じる

この挙動は Python 3.12 での asyncio のイベントループ管理の厳格化とも関連している。

## 決定

**`db_session` fixture（function スコープ）内でエンジンを毎テスト `create_async_engine` / `engine.dispose()` する現状設計を維持する。**

```python
@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)  # 毎テスト生成
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        await _truncate_all_tables(session)
        yield session
    await engine.dispose()  # 毎テスト破棄
```

## 検討した選択肢

### 選択肢 A: `asyncio_default_fixture_loop_scope = "session"` に変更してエンジンを session スコープ化

- **概要**: ループをセッション全体で1つに統一し、session スコープの async fixture でエンジンを1回生成して使い回す
- **メリット**: エンジン・コネクションプールの生成コストがセッション1回になる。テスト数が増えても速度劣化が小さい
- **デメリット**: テスト間でイベントループが共有されるため、ある非同期処理の副作用が後続テストに残るリスクがある。既存の session スコープ async fixture（RSA 鍵生成等）への影響確認が必要。pytest-asyncio のバージョン依存の挙動変化に注意が必要

### 選択肢 B: 現状維持（function スコープで毎テスト create/dispose）← **採用**

- **概要**: 各テストで独立したエンジンを生成・破棄する
- **メリット**: イベントループの問題が生じない。シンプルで確実。テスト間の完全な分離が保証される
- **デメリット**: コネクションプールの再作成コストが 150 件分かかる。現状約 9 秒（許容範囲）

### 選択肢 C: 同期エンジンを session スコープで管理し、非同期処理は function スコープでラップ

- **概要**: マイグレーション・接続管理を同期エンジン経由で行い、テスト内 DB 操作のみ非同期エンジンを使う
- **メリット**: ループスコープの問題を回避しつつ一部の初期化コストを削減できる可能性がある
- **デメリット**: 実装が複雑になる。同期/非同期の混在がコードの可読性を下げる

### 選択肢 D: session スコープの同期 fixture でエンジン全体を管理

- **概要**: 非同期エンジンを使わず同期 SQLAlchemy で管理する
- **デメリット**: アプリケーション本体が非同期 SQLAlchemy を使用しており、テストと実装の乖離が生じる。採用しない

## 決定理由

- テスト実行時間は現状 **約 9 秒（150 件）** であり、開発サイクルへの影響は許容範囲内
- 選択肢 A（ループのスコープ拡大）は、既存 session スコープ async fixture への影響調査・テスト間副作用の精査が必要であり、TCH-61 の主目的（DB 統合・コロケーション化）に対してリスクが大きい
- 選択肢 B はシンプルで確実であり、現時点でクリティカルな問題は生じていない
- PR #37 の gemini-code-assist レビューで High 指摘を受けたが、上記理由から対応を見送り、設計意図を ADR として記録することとした

## 影響

### ポジティブな影響

- テスト間のイベントループ分離が保証される（副作用の持ち越しなし）
- 実装がシンプルで保守しやすい

### ネガティブな影響・トレードオフ

- テスト件数が増加した場合、エンジン生成コストが線形に増加する
- 現状の 9 秒が将来的に問題になる可能性がある

### 移行・対応が必要な事項

将来パフォーマンスが問題になった際は、以下の手順で選択肢 A を検討する：

1. `pyproject.toml` の `asyncio_default_fixture_loop_scope` を `"session"` に変更
2. `db_engine` を session スコープの async fixture として切り出す
3. 全テストが通ることを確認（既存 session スコープ async fixture との整合を含む）
4. テスト間副作用の有無を確認

## 関連情報

- `packages/backend/src/tasche/conftest.py` L69-79（`db_session` fixture）
- `packages/backend/pyproject.toml`（`asyncio_default_fixture_loop_scope = "function"` 設定）
- PR #37 gemini-code-assist High 指摘（エンジンの session スコープ化提案）
- `tmp/37-comments.md`（PR #37 レビューコメントサマリー）
- TCH-61（backend pytest DB設定統合・テストコロケーション化）
