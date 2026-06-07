---
name: theming
description: Tasche frontend theming/dark-mode mechanism — CSS token location, toggle flow, where hardcoded colors live
metadata:
  type: project
---

# Tasche Theming / Dark Mode

- Tailwind `darkMode: ["class"]` in `packages/frontend/tailwind.config.ts`.
- CSS HSL tokens defined in `src/index.css` under `@layer base`: `:root` (light) AND `.dark` (dark) — both already present for `--background/foreground/card/popover/primary/secondary/muted/accent/destructive/border/input/ring`. Format is `H S% L%` (no `hsl()` wrapper).
- Toggle flow (already complete, do NOT change for theming tasks): `ThemeSection` (settings) → `useTheme` (`theme/useTheme.ts`, optimistic update to `currentSettingsAtom`, saves via `useUpdateSettings`) → `ThemeProvider` (`theme/ThemeProvider.tsx`) adds/removes `dark` class on `<html>`. Theme persisted server-side; null settings = light.
- App shell (`components/layout/DashboardLayout.tsx`, `Sidebar.tsx`) and shadcn ui base (`button/card/table/switch`) already use semantic tokens.
- Hardcoded Tailwind colors that DON'T follow dark mode are concentrated in: `components/goals/*` (esp. `WeeklyTargetGrid.tsx`), `components/tasks/*`, `pages/TasksPage.tsx`, `components/dashboard/WeeklyMatrix.tsx` (completion-rate heatmap), and `ui/dialog.tsx`/`alert-dialog.tsx` (`bg-white`, `text-emerald-950`, `border-rose-100`). Patterns: `emerald-*`(brand/success), `rose/red-*`(error), `amber/yellow-*`(warning), `sky-*`(info/shortfall).
- `tailwind.config.ts` has fixed-HEX `tasche.*` brand tokens (green/ivory/text/textSub/gold) used in login + settings — these are light-fixed and don't follow dark mode. `tasche-green` is brand color (keep); `tasche-text/textSub/textMuted` map to `text-foreground`/`text-muted-foreground`.
- `WeeklyTargetGrid.test.tsx` asserts color class names directly via `className.includes("border-rose-300"|"bg-rose-50"|"border-emerald-200"|"bg-emerald-50")` — any color-token refactor must update this test.
- Login screen (`LoginLayout`/`LoginBackground`) is effectively light-only (unauthenticated → no saved theme). Dark support there is optional.
- Images/illustrations: `public/images/` PNG/SVG are light-biased. Dark handling approach: `dark:opacity-80` (dim, first choice) or `dark:hidden` (hide) on `<img>`.
