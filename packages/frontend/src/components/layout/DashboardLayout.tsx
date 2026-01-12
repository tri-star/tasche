import { Sidebar } from "./Sidebar";
import { Bell } from "lucide-react";

type DashboardLayoutProps = {
  children: React.ReactNode;
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {/* ヘッダー（通知アイコン） */}
        <header className="flex justify-end p-4">
          <button className="rounded-full p-2 hover:bg-muted transition-colors">
            <Bell className="h-6 w-6 text-muted-foreground" />
          </button>
        </header>
        <main className="flex-1 px-6 pb-6">
          {children}
        </main>
      </div>
    </div>
  );
}
