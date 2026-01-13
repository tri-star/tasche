import { http, HttpResponse } from "msw";
import type { APIResponseDashboardResponse } from "@/api/generated/model";

const mockDashboardData: APIResponseDashboardResponse = {
  data: {
    current_date: "2026-01-12",
    current_day_of_week: "monday",
    week: {
      id: "wk_01HXYZ1234567890ABCDEF",
      start_date: "2026-01-12",
      end_date: "2026-01-18",
      unit_duration_minutes: 30,
    },
    today_goals: [
      {
        task_id: "tsk_01HXYZ1234567890ABCDEF",
        task_name: "試験勉強",
        target_units: 2,
        actual_units: 0,
        completion_rate: 0,
      },
      {
        task_id: "tsk_02HXYZ1234567890ABCDEF",
        task_name: "個人開発",
        target_units: 2,
        actual_units: 0,
        completion_rate: 0,
      },
      {
        task_id: "tsk_03HXYZ1234567890ABCDEF",
        task_name: "後で読む消化",
        target_units: 1,
        actual_units: 0,
        completion_rate: 0,
      },
    ],
    weekly_matrix: [
      {
        task_id: "tsk_01HXYZ1234567890ABCDEF",
        task_name: "試験勉強",
        daily_data: {
          monday: { target_units: 2, actual_units: 2, completion_rate: 100 },
          tuesday: { target_units: 2, actual_units: 1.6, completion_rate: 80 },
          wednesday: { target_units: 2, actual_units: 0.6, completion_rate: 30 },
          thursday: { target_units: 2, actual_units: 0.6, completion_rate: 30 },
          friday: { target_units: 2, actual_units: 2.4, completion_rate: 120 },
        },
      },
      {
        task_id: "tsk_02HXYZ1234567890ABCDEF",
        task_name: "個人開発",
        daily_data: {
          monday: { target_units: 2, actual_units: 1, completion_rate: 50 },
          tuesday: { target_units: 2, actual_units: 1.6, completion_rate: 80 },
          wednesday: { target_units: 2, actual_units: 0.6, completion_rate: 30 },
          thursday: { target_units: 2, actual_units: 1.6, completion_rate: 80 },
          friday: { target_units: 2, actual_units: 2.4, completion_rate: 120 },
        },
      },
      {
        task_id: "tsk_03HXYZ1234567890ABCDEF",
        task_name: "後で読む消化",
        daily_data: {
          monday: { target_units: 1, actual_units: 0, completion_rate: 0 },
          tuesday: { target_units: 1, actual_units: 0.5, completion_rate: 50 },
          wednesday: { target_units: 1, actual_units: 0.3, completion_rate: 30 },
          thursday: { target_units: 1, actual_units: 0.8, completion_rate: 80 },
          friday: { target_units: 1, actual_units: 1.2, completion_rate: 120 },
        },
      },
    ],
    has_goals_configured: true,
  },
};

export const dashboardHandlers = [
  http.get("*/api/dashboard", () => {
    return HttpResponse.json(mockDashboardData);
  }),
];
