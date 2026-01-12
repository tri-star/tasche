# 概要

目標設定ページを、デザイン案に基づいて実装していきたいです。

- デザイン案(画像): docs/work-logs/20260112-dashboard-impl/images/dashboard.jpeg

# 進め方

- まず以下のファイルを参照し、プロジェクトの概要を把握
  - docs/concept.md
  - docs/hearing-memo.md
  - docs/glossary.md
  - docs/mvp.md
  - docs/screens.md
  -
- @docs/components.md と docs/work-logs/20260112-dashboard-impl/images/dashboard.jpeg を参照し、ダッシュボードページのコンポーネント構造などを確認、コンポーネントを設計
- API から情報を取得する個所は適宜 Orval の msw モックを利用、レスポンスをカスタマイズして実装する
- ユニットテストについては「ページレベルで integration テスト」のみ実装する
  - 現時点ではページのレンダリングのみテストを実装(インタラクションは実装、テストとも行わない)

# 関連ファイル

- docs/work-logs/20260112-dashboard-impl/images/dashboard-widget-icon1.png
  - ダッシュボード内のウィジェット左上に表示するアイコン 1(52x57px。ウィジェットのヘッダ行の高さに合うようにサイズ調整する)
- docs/work-logs/20260112-dashboard-impl/images/dashboard-widget-icon2.png
  - ダッシュボード内のウィジェット左上に表示するアイコン 2(25x31px。ウィジェットのヘッダ行の高さに合うようにサイズ調整する)
- docs/work-logs/20260112-dashboard-impl/images/dashboard-widget-illust1.png
  - ダッシュボード内のウィジェット右上に表示するイラスト
- docs/work-logs/20260112-dashboard-impl/images/dashboard-widget-illust2.png
  - ダッシュボード内のウィジェット右上に表示するイラスト
- docs/work-logs/20260112-dashboard-impl/images/task-icon.png
  - "今日の目標"ウィジェットのタスク名の先頭に表示するアイコン。(54x52px。タスク名の行の高さに合うようにサイズ調整する)
- docs/work-logs/20260112-dashboard-impl/images/task-progress-sprites.png
  - "今日の目標"ウィジェットのタスク進捗バーに使用するスプライト画像(横幅: 18px x 3、高さ: 18px、18px 単位のスプライトシート。タスク達成率に応じ、0 ～ 50%: 0 段階目、50 ～ 99%: 1 段階目、100%～: 2 段階目)
