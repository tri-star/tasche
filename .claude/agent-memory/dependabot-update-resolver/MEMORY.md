# Memory Index

- [orvalアップグレード時の既知の破壊的変更](orval_upgrade_notes.md) — orval 8系でmock設定がgenerators配列形式に変更、zodは未使用のため影響なし。patch更新でもバージョンコメント差分でfrontend-openapiが落ちる(PR #79)
- [biomeバージョン更新時の$schema不一致](biome_schema_version_mismatch.md) — biome.jsonの$schemaバージョンをCLIに合わせないとinfo診断が出る(lintは失敗しない、PR #79)
- [@vitejs/plugin-react v6はvite8必須](vitejs_plugin_react_v6_vite8_requirement.md) — v6系はpeerDepsでvite^8.0.0要求、vite7だとbuild実行時エラーになる(PR #70で確認)
- [backend Python系コマンドはdocker compose exec経由](backend_python_commands_use_docker_compose_exec.md) — ホスト直接のuv run pytestはDB接続が不安定(PR #66で確認)、api コンテナ内実行を優先する
- [FastAPI 0.137+のルーターツリー化でroute.pathからprefixが消える](fastapi_0137_router_tree_regression.md) — main.pyのOTelトレース属性生成に影響、iter_route_contexts()で修正済み(PR #64)。aws-opentelemetry-distro側の同種バグは0.18.0時点で未修正
