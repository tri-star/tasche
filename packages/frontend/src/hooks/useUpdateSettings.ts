import type { UseMutationResult } from "@tanstack/react-query"
import { useMutation } from "@tanstack/react-query"
import { updateCurrentSettings } from "@/api/generated/client"
import type { SettingsResponse, SettingsUpdateRequest } from "@/api/generated/model"

export type UpdateSettingsInput = SettingsUpdateRequest

/**
 * PATCH /api/settings を呼ぶ react-query ミューテーション。
 * Theme / Timezone 双方の更新に使う。
 * 呼び出し側（useTheme / Timezone フォーム）で後処理を行う設計（関心分離）。
 */
export function useUpdateSettings(): UseMutationResult<
  SettingsResponse,
  Error,
  UpdateSettingsInput
> {
  return useMutation({
    mutationFn: async (payload: UpdateSettingsInput): Promise<SettingsResponse> => {
      const response = await updateCurrentSettings(payload)
      if (response.status !== 200) {
        throw new Error(`設定の更新に失敗しました: ${response.status}`)
      }
      return response.data.data
    },
  })
}
