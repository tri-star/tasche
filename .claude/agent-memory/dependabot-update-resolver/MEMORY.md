# Memory Index

- [orvalアップグレード時の既知の破壊的変更](orval_upgrade_notes.md) — orval 8系でmock設定がgenerators配列形式に変更、zodは未使用のため影響なし
- [@vitejs/plugin-react v6はvite8必須](vitejs_plugin_react_v6_vite8_requirement.md) — v6系はpeerDepsでvite^8.0.0要求、vite7だとbuild実行時エラーになる(PR #70で確認)
- [FastAPI 0.137+のルーターツリー化でroute.pathからprefixが消える](fastapi_0137_router_tree_regression.md) — main.pyのOTelトレース属性生成に影響、iter_route_contexts()で修正済み(PR #64)。aws-opentelemetry-distro側の同種バグは0.18.0時点で未修正
