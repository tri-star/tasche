import { atom } from "jotai"
import type { Settings } from "./types"

// 起動直後は未取得 → null。useBootstrapAuth 内で初期化される
export const currentSettingsAtom = atom<Settings | null>(null)
