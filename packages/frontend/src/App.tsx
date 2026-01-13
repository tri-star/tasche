import "./App.css";
import { DashboardPage } from "@/pages/DashboardPage";
import { GoalSettingPage } from "@/pages/GoalSettingPage";

function App() {
  if (window.location.pathname.startsWith("/goals")) {
    return <GoalSettingPage />;
  }

  return <DashboardPage />;
}

export default App;
