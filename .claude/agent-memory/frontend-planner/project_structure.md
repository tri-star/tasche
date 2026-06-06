---
name: project-structure
description: Tasche frontend (packages/frontend) directory layout, naming, responsive design, API client, and test conventions
metadata:
  type: project
---

# Tasche Frontend (packages/frontend/src)

React + TypeScript + Vite. Tailwind CSS + shadcn/ui (Radix-based, in `components/ui/`). Icons: lucide-react.

## Layout
- `components/ui/` — shadcn/ui base components (button, card, table, checkbox, toggle-group, etc.)
- `components/common/` — app-shared custom components (DaySelector, TaskCombobox, SpinButton)
- `components/dashboard/`, `components/goals/`, `components/tasks/`, `components/settings/`, `components/login/`, `components/layout/` — feature folders
- `pages/` — page components + their `.test.tsx` and `*.e2e.spec.ts` colocated
- `lib/` — utils (`cn` from `lib/utils`, week date helpers in `lib/week-dates.ts`: `buildWeekDates`, `DAY_LABELS`, `DAYS_OF_WEEK_ORDER`, `formatMonthDay`)
- `api/generated/` — orval-generated client (`client.ts`) and model (`model.ts`). DO NOT hand-edit; backend emits OpenAPI, frontend runs `pnpm openapi:update`.
- `e2e/` — Playwright: `fixtures/auth.ts` exports `{ expect, test }` with `authenticatedPage` fixture; `pages/*.page.ts` page objects.
- `mocks/` — MSW handlers (VITE_USE_MSW). Dev defaults to MSW on.

## Conventions
- Components: PascalCase named exports (not default), props type `XxxProps` defined inline above component.
- Tests: vitest + @testing-library/react, colocated `*.test.tsx`. Query by role/aria-label/text. Mock API client via `vi.mock("@/api/generated/client")`.
- E2E: `*.e2e.spec.ts`. Viewports tested: mobile-375 (375x812), tablet-768, desktop-1280.

## Responsive design (mobile-first)
- Primary breakpoint `md:` (768px) — desktop layout switches on at md. `sm:` (640px) as helper. 375px = base styles.
- App shell done in TCH-63: `DashboardLayout` (`main` has `min-w-0 max-w-6xl`, mobile `pb` for bottom nav), `Sidebar` (mobile = fixed bottom nav `fixed inset-x-0 bottom-0`, md = side rail w-20, lg = w-60), `GoalSettingFab` (fixed, avoids mobile bottom nav).
- Overflow containment: parent needs `min-w-0` so tables/scroll areas don't push it wider. Use `overflow-hidden` on a section + inner `overflow-x-auto` to scroll within a region.
- `ui/table.tsx` Table already wraps in `<div overflow-auto>`; give Table a `min-w-[...]` to prevent column collapse. Use semantic bg tokens (`bg-card`/`bg-muted`) for sticky cells so dark mode doesn't show through.
- E2E helpers worth reusing (in `pages/AppShellResponsive.e2e.spec.ts`): `expectNoDocumentHorizontalOverflow`, `expectFabAvoidsMobileNav`, `expectNoNavMainOverlap`. `DashboardResponsive.e2e.spec.ts` has the same `expectNoDocumentHorizontalOverflow` plus `getBoundingClientRect().right <= window.innerWidth` per-section overflow check (helpers are copied per-spec, not shared).
- **Wide-table → mobile-card pattern (confirmed in `dashboard/WeeklyMatrix.tsx`, TCH-64)**: keep BOTH layouts in ONE component, switch with `block md:hidden` (mobile stacked cards, `grid grid-cols-N`) and `hidden overflow-x-auto md:block` (desktop table, `min-w-[...]`). Both layouts mount simultaneously; CSS display hides one. `data-testid` on each block (e.g. `*-mobile` / `*-scroll`). Shared calcs (totals) computed once at top. Do NOT split into a separate Cards component.
- **Two-layout gotcha for tests/E2E**: because both layouts mount, inputs duplicate in the DOM. (1) jsdom does NOT apply Tailwind, so `display:none` never kicks in → `getAllByRole(...)` count doubles; unit tests must query by `aria-label` name, not positional index. (2) Real-browser E2E at 375px hides the desktop table via real CSS → table-role queries (`getByRole("row")`/`columnheader`) break; query by `aria-label` + `.filter({ visible: true })`. Give matching `aria-label` to inputs in BOTH layouts so a single role+name query works everywhere.

## Goal-setting wizard (components/goals/)
- `GoalWizard.tsx` holds all state + step switch. Displayed step order (steps array) does NOT match component filenames:
  - Step1=ユニット時間=`Step1UnitDuration`; Step2=確保可能ユニット=`Step2AvailableUnits`→`AvailableUnitsGrid`; Step3=タスク選択=`Step2TaskSelection`→`TaskItem`; Step4=曜日別目標=`Step3WeeklyTargets`→`WeeklyTargetGrid`; Step5=確認=`Step4Confirmation`.
- E2E: `e2e/pages/goal-setting.page.ts` page object (selectUnitDuration/goNext/increaseAvailableUnits/toggleTask/addNewTask/fillTarget/save). Step4 次へ is disabled when any day's target total exceeds available units — keep targets <= available to advance.
- Button labels ("次へ →", "← 戻る", "保存") and `1ユニットの時間を選んでください` heading are referenced by E2E — do not change.
