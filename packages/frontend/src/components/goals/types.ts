import type { DailyAvailableUnits, DailyTargets } from "@/api/generated/model"

export type WizardStep = 1 | 2 | 3 | 4 | 5

export type NewTask = {
  tempId: string
  name: string
}

export type GoalTask = {
  id: string
  name: string
  isNew?: boolean
}

export const createEmptyTargets = (): DailyTargets => ({
  monday: 0,
  tuesday: 0,
  wednesday: 0,
  thursday: 0,
  friday: 0,
  saturday: 0,
  sunday: 0,
})

export const createEmptyDailyAvailableUnits = (): DailyAvailableUnits => ({
  monday: 0,
  tuesday: 0,
  wednesday: 0,
  thursday: 0,
  friday: 0,
  saturday: 0,
  sunday: 0,
})
