import { render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"
import { DashboardLayout } from "./DashboardLayout"

function renderLayout(initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <DashboardLayout>
        <div data-testid="layout-child">本文</div>
      </DashboardLayout>
    </MemoryRouter>,
  )
}

describe("DashboardLayout", () => {
  it("children を main landmark 内に表示する", () => {
    renderLayout()

    const main = screen.getByRole("main")
    expect(within(main).getByTestId("layout-child")).toBeInTheDocument()
  })

  it("ロゴリンクはダッシュボードに戻る", () => {
    renderLayout("/tasks")

    expect(screen.getByRole("link", { name: "ダッシュボードへ移動" })).toHaveAttribute("href", "/")
  })

  it("ヘッダーはダークモード対応の theme token を使う", () => {
    renderLayout()

    const banner = screen.getByRole("banner")
    expect(banner).toHaveClass("bg-card/95", "border-border", "text-card-foreground")
    expect(banner).not.toHaveClass("bg-white")
  })

  it("ナビリンクを重複レンダリングしない", () => {
    renderLayout()

    for (const label of ["ダッシュボード", "タスク管理", "目標設定", "設定", "アカウント"]) {
      expect(screen.getAllByRole("link", { name: label })).toHaveLength(1)
    }
  })

  it("mobile 下部ナビで本文末尾が隠れない余白を持つ", () => {
    renderLayout()

    expect(screen.getByRole("main")).toHaveClass(
      "pb-[calc(5.5rem+env(safe-area-inset-bottom))]",
      "md:pb-6",
    )
  })
})
