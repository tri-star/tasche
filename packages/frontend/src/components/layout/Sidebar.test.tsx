import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, useLocation } from "react-router-dom"
import { describe, expect, it } from "vitest"
import { Sidebar } from "./Sidebar"

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location-pathname">{location.pathname}</div>
}

function renderSidebar(initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Sidebar />
      <LocationProbe />
    </MemoryRouter>,
  )
}

describe("Sidebar", () => {
  it("/ ではダッシュボードを active 表示する", () => {
    renderSidebar("/")

    expect(screen.getByRole("link", { name: "ダッシュボード" })).toHaveClass("bg-accent")
    expect(screen.getByRole("link", { name: "目標設定" })).not.toHaveClass("bg-accent")
  })

  it("/goals では目標設定だけを active 表示する", () => {
    renderSidebar("/goals")

    expect(screen.getByRole("link", { name: "目標設定" })).toHaveClass("bg-accent")
    expect(screen.getByRole("link", { name: "ダッシュボード" })).not.toHaveClass("bg-accent")
  })

  it("/tasks ではタスク管理だけを active 表示する", () => {
    renderSidebar("/tasks")

    expect(screen.getByRole("link", { name: "タスク管理" })).toHaveClass("bg-accent")
    expect(screen.getByRole("link", { name: "ダッシュボード" })).not.toHaveClass("bg-accent")
  })

  it("目標設定をクリックすると SPA 遷移で /goals に移動する", async () => {
    const user = userEvent.setup()
    renderSidebar("/")

    await user.click(screen.getByRole("link", { name: "目標設定" }))

    expect(screen.getByTestId("location-pathname")).toHaveTextContent("/goals")
  })

  it("タスク管理をクリックすると SPA 遷移で /tasks に移動する", async () => {
    const user = userEvent.setup()
    renderSidebar("/")

    await user.click(screen.getByRole("link", { name: "タスク管理" }))

    expect(screen.getByTestId("location-pathname")).toHaveTextContent("/tasks")
  })

  it("下部ナビゲーションも SPA 遷移する", async () => {
    const user = userEvent.setup()
    renderSidebar("/")

    await user.click(screen.getByRole("link", { name: "アカウント" }))

    expect(screen.getByTestId("location-pathname")).toHaveTextContent("/account")
  })
})
