---
name: auth
description: Tasche frontend auth architecture — files, flow, MSW/E2E auth fixtures (pre-TCH-75 baseline)
metadata:
  type: project
---

# Tasche Frontend Auth (src/auth/)

Note: TCH-75 migrates from JWT+refresh to server-side session Cookie. Below is the
baseline being replaced — verify against current code before relying on it.

- Files: `atoms.ts` (accessTokenAtom/authStatusAtom/currentUserAtom), `authClient.ts` (fetch wrapper: Authorization injection + 401→refresh→retry), `authFetch.ts` (orval mutator → client.fetch → `{data,status,headers}`), `authClientSingleton.ts` (set/getAuthClient, wired in `main.tsx` via getDefaultStore), `useBootstrapAuth.ts` (startup: refresh→token→me+settings parallel), `useAuth.ts` (startGoogleLogin/handleCallback/stubLogin/logout), `pkce.ts`, `storage.ts` (sessionStorage pending OAuth).
- orval config (`orval.config.ts`): client `fetch`, mutator = `src/auth/authFetch.ts` `authFetch`, mock `msw`. Regenerate via `pnpm --filter frontend openapi:update` (reads `packages/backend/openapi.json`). Generated code in `src/api/generated/` is hand-edit forbidden.
- Routing: `router.tsx` → `ProtectedRoute` (components/routing) redirects to `/login` when `authStatusAtom !== "authenticated"`, spinner while `"loading"`. `/auth/callback` → `AuthCallbackPage` (StrictMode-guarded via useRef).
- MSW auth: `mocks/handlers/auth.ts` (+ `authSession.ts` pseudo-store getMockAuthUser/setMockAuthUser backed by sessionStorage key `tasche.msw.auth.user`). Protected handlers (`users.ts`, `settings.ts`) gate on `authorization` header AND getMockAuthUser. Handler order in `index.ts`: handwritten before orval-generated.
- E2E (Playwright, `*.e2e.spec.ts` under `src/`, testDir `./src`): fixtures in `src/e2e/fixtures/auth.ts` export `{ test, expect }` with `authenticatedPage`/`auth`/`apiAuth`. Two modes via `E2E_USE_MSW`. `apiAuth.setToken` injects Bearer via `page.route`. `authenticatedPage` logs in via stub-login then waits for `/api/auth/refresh` in `gotoAuthenticatedRoot`. `E2E_STUB_USER_EMAIL` in `e2e/utils/test-auth.ts`.
- Page tests mock useAuth with `vi.mock("@/auth/useAuth", () => ({ useAuth: () => ({ status, user, accessToken, startGoogleLogin, handleCallback, stubLogin, logout }) }))` — AuthCallbackPage/LoginPage/AccountPage/SettingsPage.
</content>
