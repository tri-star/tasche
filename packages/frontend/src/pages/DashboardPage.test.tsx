import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DashboardPage } from "./DashboardPage";

describe("DashboardPage", () => {
  it("ダッシュボードページが正常にレンダリングされる", async () => {
    render(<DashboardPage />);

    expect(screen.getByText("読み込み中...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText("読み込み中...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("今日の目標")).toBeInTheDocument();
    expect(screen.getByText("実績を記録")).toBeInTheDocument();
    expect(screen.getByText("週間達成状況")).toBeInTheDocument();
    expect(screen.getAllByText("試験勉強").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /目標設定/ })).toBeInTheDocument();
  });

  it("サイドバーのナビゲーションが表示される", async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.queryByText("読み込み中...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("ダッシュボード")).toBeInTheDocument();
    expect(screen.getByText("設定")).toBeInTheDocument();
    expect(screen.getByText("ヘルプ")).toBeInTheDocument();
  });
});
