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
- E2E helpers worth reusing (in `pages/AppShellResponsive.e2e.spec.ts`): `expectNoDocumentHorizontalOverflow`, `expectFabAvoidsMobileNav`, `expectNoNavMainOverlap`.
