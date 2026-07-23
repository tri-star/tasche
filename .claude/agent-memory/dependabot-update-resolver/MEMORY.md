# Memory Index

- [orvalアップグレード時の既知の破壊的変更](orval_upgrade_notes.md) — orval 8系でmock設定がgenerators配列形式に変更、zodは未使用のため影響なし。patch更新でもバージョンコメント差分でfrontend-openapiが落ちる(PR #79)
- [biomeバージョン更新時の$schema不一致](biome_schema_version_mismatch.md) — biome.jsonの$schemaバージョンをCLIに合わせないとinfo診断が出る(lintは失敗しない、PR #79)
- [@vitejs/plugin-react v6はvite8必須](vitejs_plugin_react_v6_vite8_requirement.md) — v6系はpeerDepsでvite^8.0.0要求、vite7だとbuild実行時エラーになる(PR #70で確認)
- [backend Python系コマンドはdocker compose exec経由](backend_python_commands_use_docker_compose_exec.md) — ホスト直接のuv run pytestはDB接続が不安定(PR #66で確認)、api コンテナ内実行を優先する
- [FastAPI 0.137+のルーターツリー化でroute.pathからprefixが消える](fastapi_0137_router_tree_regression.md) — main.pyのOTelトレース属性生成に影響、iter_route_contexts()で修正済み(PR #64)。aws-opentelemetry-distro側の同種バグは0.18.0時点で未修正
- [backendのcryptography dev extraは実は本番ランタイムにも影響](backend_cryptography_dev_extra_is_actually_runtime_dep.md) — authlib/joserfc経由でGoogle OAuth検証にも使われる、uv.lockは単一バージョン解決(PR #78で確認)
- [tailwindcss v3→v4のPostCSS移行手順](tailwindcss_v4_postcss_migration.md) — @tailwindcss/postcss分離、@import順序でユーティリティが空になる罠に注意(PR #86で確認)
- [actions/setup-node v6→v7の互換性調査](actions_setup_node_v7_upgrade.md) — 入出力破壊なし、node24ランタイム要求だがGitHub-hosted runnerなら影響なし(PR #91)
- [@types/nodeメジャー更新は低リスク](types_node_major_bump_low_risk.md) — build toolingでしか使わない限り型が実行環境より新しくても実害なし(PR #88で確認)
