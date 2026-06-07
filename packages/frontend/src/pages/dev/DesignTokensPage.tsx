import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type TokenSampleProps = {
  cssVar: string
  tailwindClass: string
  label: string
}

function TokenSample({ cssVar, tailwindClass, label }: TokenSampleProps) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-10 w-10 shrink-0 rounded-lg border border-border"
        style={{ backgroundColor: `hsl(var(${cssVar}))` }}
        aria-hidden="true"
      />
      <div className="min-w-0">
        <p className="text-xs font-mono font-medium text-foreground">{tailwindClass}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

type TokenGroupProps = {
  title: string
  tokens: TokenSampleProps[]
}

function TokenGroup({ title, tokens }: TokenGroupProps) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        {title}
      </h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {tokens.map((token) => (
          <TokenSample key={token.cssVar} {...token} />
        ))}
      </div>
    </div>
  )
}

export function DesignTokensPage() {
  const handleToggleDark = () => {
    document.documentElement.classList.toggle("dark")
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-10">
        {/* ヘッダー */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">デザイントークン確認ページ</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              ライト／ダーク両モードのトークンを視覚的に確認できます。
            </p>
            <p className="mt-1 text-xs font-medium text-warning-soft-foreground bg-warning-soft px-2 py-0.5 rounded inline-block">
              このページは開発環境専用です（本番環境では表示されません）
            </p>
          </div>
          <Button variant="outline" onClick={handleToggleDark} className="shrink-0">
            ライト / ダーク 切り替え
          </Button>
        </div>

        {/* セクション1: ベース色 */}
        <Card>
          <CardHeader>
            <CardTitle>セクション1: ベース色</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <TokenGroup
              title="背景・前景"
              tokens={[
                { cssVar: "--background", tailwindClass: "bg-background", label: "ページ背景" },
                { cssVar: "--foreground", tailwindClass: "text-foreground", label: "主要テキスト" },
                { cssVar: "--card", tailwindClass: "bg-card", label: "カード背景" },
                {
                  cssVar: "--card-foreground",
                  tailwindClass: "text-card-foreground",
                  label: "カード内テキスト",
                },
                { cssVar: "--popover", tailwindClass: "bg-popover", label: "ポップオーバー背景" },
                {
                  cssVar: "--muted",
                  tailwindClass: "bg-muted",
                  label: "中立背景（非強調）",
                },
                {
                  cssVar: "--muted-foreground",
                  tailwindClass: "text-muted-foreground",
                  label: "補助テキスト",
                },
                { cssVar: "--accent", tailwindClass: "bg-accent", label: "薄い強調背景" },
                {
                  cssVar: "--accent-foreground",
                  tailwindClass: "text-accent-foreground",
                  label: "アクセント上テキスト",
                },
              ]}
            />
          </CardContent>
        </Card>

        {/* セクション2: インタラクション色 */}
        <Card>
          <CardHeader>
            <CardTitle>セクション2: インタラクション色</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <TokenGroup
              title="プライマリ・ボーダー"
              tokens={[
                {
                  cssVar: "--primary",
                  tailwindClass: "bg-primary",
                  label: "メインアクション・アクセント",
                },
                {
                  cssVar: "--primary-foreground",
                  tailwindClass: "text-primary-foreground",
                  label: "プライマリ上テキスト",
                },
                {
                  cssVar: "--secondary",
                  tailwindClass: "bg-secondary",
                  label: "セカンダリ背景",
                },
                {
                  cssVar: "--border",
                  tailwindClass: "border-border",
                  label: "通常の枠線",
                },
                {
                  cssVar: "--input",
                  tailwindClass: "border-input",
                  label: "フォーム入力枠",
                },
                {
                  cssVar: "--ring",
                  tailwindClass: "ring-ring / focus:border-ring",
                  label: "フォーカスリング",
                },
              ]}
            />
          </CardContent>
        </Card>

        {/* セクション3: 状態色 */}
        <Card>
          <CardHeader>
            <CardTitle>セクション3: 状態色（新規追加分含む）</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <TokenGroup
              title="エラー (destructive)"
              tokens={[
                {
                  cssVar: "--destructive",
                  tailwindClass: "bg-destructive",
                  label: "エラー・削除アクション",
                },
                {
                  cssVar: "--destructive-foreground",
                  tailwindClass: "text-destructive-foreground",
                  label: "destructive上テキスト",
                },
                {
                  cssVar: "--destructive-soft",
                  tailwindClass: "bg-destructive-soft",
                  label: "エラーバナー背景（弱）",
                },
                {
                  cssVar: "--destructive-soft-foreground",
                  tailwindClass: "text-destructive-soft-foreground",
                  label: "エラーバナーテキスト",
                },
              ]}
            />
            <TokenGroup
              title="成功 (success)"
              tokens={[
                {
                  cssVar: "--success",
                  tailwindClass: "bg-success",
                  label: "達成・充足状態",
                },
                {
                  cssVar: "--success-foreground",
                  tailwindClass: "text-success-foreground",
                  label: "success上テキスト",
                },
                {
                  cssVar: "--success-soft",
                  tailwindClass: "bg-success-soft",
                  label: "達成バッジ背景（弱）",
                },
                {
                  cssVar: "--success-soft-foreground",
                  tailwindClass: "text-success-soft-foreground",
                  label: "成功バッジテキスト",
                },
              ]}
            />
            <TokenGroup
              title="警告 (warning)"
              tokens={[
                {
                  cssVar: "--warning",
                  tailwindClass: "bg-warning",
                  label: "注意・進行中の状態",
                },
                {
                  cssVar: "--warning-foreground",
                  tailwindClass: "text-warning-foreground",
                  label: "warning上テキスト",
                },
                {
                  cssVar: "--warning-soft",
                  tailwindClass: "bg-warning-soft",
                  label: "警告バナー背景（弱）",
                },
                {
                  cssVar: "--warning-soft-foreground",
                  tailwindClass: "text-warning-soft-foreground",
                  label: "警告バナーテキスト",
                },
              ]}
            />
            <TokenGroup
              title="情報 (info)"
              tokens={[
                {
                  cssVar: "--info",
                  tailwindClass: "bg-info",
                  label: "情報・不足状態",
                },
                {
                  cssVar: "--info-foreground",
                  tailwindClass: "text-info-foreground",
                  label: "info上テキスト",
                },
              ]}
            />
          </CardContent>
        </Card>

        {/* セクション4: 複合サンプル */}
        <Card>
          <CardHeader>
            <CardTitle>セクション4: 複合サンプル</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* ボタンサンプル */}
            <div>
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                ボタン
              </h3>
              <div className="flex flex-wrap gap-3">
                <Button>Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
              </div>
            </div>

            {/* 入力サンプル */}
            <div>
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                フォーム入力
              </h3>
              <div className="space-y-2 max-w-sm">
                <input
                  type="text"
                  placeholder="通常の入力フィールド"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
                />
                <input
                  type="text"
                  placeholder="エラー状態の入力フィールド"
                  className="w-full rounded-xl border border-destructive bg-destructive-soft px-3 py-2 text-sm text-destructive-soft-foreground shadow-sm outline-none"
                />
              </div>
            </div>

            {/* バッジサンプル */}
            <div>
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                バッジ
              </h3>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success-soft-foreground">
                  達成
                </span>
                <span className="inline-flex rounded-full bg-warning-soft px-3 py-1 text-xs font-semibold text-warning-soft-foreground">
                  進行中
                </span>
                <span className="inline-flex rounded-full bg-destructive-soft px-3 py-1 text-xs font-semibold text-destructive-soft-foreground">
                  エラー
                </span>
                <span className="inline-flex rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                  アクセント
                </span>
                <span className="inline-flex rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                  中立
                </span>
              </div>
            </div>

            {/* アラートサンプル */}
            <div>
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                アラート・バナー
              </h3>
              <div className="space-y-3 max-w-lg">
                <div className="rounded-xl border border-success/40 bg-success-soft px-4 py-3 text-sm text-success-soft-foreground">
                  成功メッセージ: 目標を達成しました！
                </div>
                <div className="rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-warning-soft-foreground">
                  警告メッセージ: 直近の目標を読み込みました。内容を確認してください。
                </div>
                <div className="rounded-xl border border-destructive/40 bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
                  エラーメッセージ: データの取得に失敗しました。再度お試しください。
                </div>
                <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground">
                  通常カード: `bg-card` + `border-border` の組み合わせ
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* フッター */}
        <div className="border-t border-border pt-6 text-center">
          <p className="text-xs text-muted-foreground">
            詳細なドキュメント:{" "}
            <span className="font-mono font-medium text-foreground">docs/design-tokens.md</span>
          </p>
        </div>
      </div>
    </div>
  )
}
