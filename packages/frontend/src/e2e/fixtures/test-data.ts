/**
 * E2Eテスト用のテストデータ定義
 */

/**
 * テスト用ユーザー情報
 */
export const testUsers = {
  primary: {
    email: "test@example.com",
    password: "testpassword123",
    userId: "usr_01HXYZ1234567890ABCDEF",
  },
  secondary: {
    email: "test2@example.com",
    password: "testpassword123",
    userId: "usr_02HXYZ1234567890ABCDEF",
  },
} as const

/**
 * テスト用タスクID
 */
export const testTaskIds = {
  task1: "tsk_01HXYZ1234567890ABCDEF",
  task2: "tsk_02HXYZ1234567890ABCDEF",
  task3: "tsk_03HXYZ1234567890ABCDEF",
} as const

/**
 * テスト用週ID
 */
export const testWeekId = "wk_01HXYZ1234567890ABCDEF"

/**
 * テスト用日付データ
 */
export const testDate = {
  currentDate: "2026-01-12",
  currentDayOfWeek: "monday",
  weekStartDate: "2026-01-12",
  weekEndDate: "2026-01-18",
} as const
