# CLAUDE.md — artifacts/mobile (Jamiati student app)

Expo ~54 + expo-router ~6 + React Native 0.81 + TypeScript (strict). This is the **student-facing product**: it runs natively (Android/iOS) and is exported to web (`npx expo export -p web` → `dist/`), which the API server serves at `/` in production as the "student web app". Read the root `CLAUDE.md` first for the monorepo, API and DB context.

## Folder structure

```
app/                    expo-router file-based routes
  _layout.tsx           Root providers: SafeArea → ErrorBoundary → QueryClient →
                        Preferences → Auth → GestureHandler → Keyboard → Stack.
                        Also loads Inter fonts + declares every stack screen's header.
  (auth)/               login, register, onboarding (5-step academic placement wizard)
  (tabs)/               Bottom tabs: index (Home), courses, calendar (timetable),
                        community, profile — declared in (tabs)/_layout.tsx
  course/[id].tsx       Course detail (only dynamic-param screen)
  files/ announcements/ assignments/ exams/ events/ clubs/ opportunities/
  ai/ subscription/ notifications/   one index.tsx each — flat list screens
  more/index.tsx        3x grid of module tiles (entry to all non-tab modules)
  settings/             _layout (own Stack) + index, language, appearance,
                        notifications, privacy
components/
  Screen.tsx            SafeArea wrapper (use on screens NOT inside a header Stack)
  ErrorBoundary/ErrorFallback  crash UI
  ui/                   Card, Button, Badge, Avatar, Input, EmptyState, SettingControls
constants/
  colors.ts             light/dark palettes — navy #1E3A5F primary, gold #D4A853 accent
  theme.ts              spacing / radius / fontSize / fontWeight / lineHeight / shadow
contexts/
  AuthContext.tsx       JWT auth: SecureStore (native) / localStorage (web),
                        refresh-on-expiry inside setAuthTokenGetter, route guarding
                        via useSegments (redirects to (auth) / onboarding / (tabs)),
                        plus a client-only "guest mode" (loginAsGuest)
  PreferencesContext.tsx language (ar|fr), theme (system|light|dark), notif + privacy
                        toggles — persisted in AsyncStorage ONLY (not synced to backend)
hooks/useColors.ts      resolved palette for the active scheme
i18n/translations.ts    ar + fr dictionaries, dot-key access via t() / tArray()
server/serve.js         static server for the web export (standalone deploy path)
scripts/build.js        wraps `expo export -p web` (BASE_PATH-aware)
```

## Conventions that hold today

- **Data fetching**: only via `@workspace/api-client-react` generated hooks (`useGetDashboardHome`, `useListCourses`, …) + TanStack Query (staleTime 3 min, gcTime 10 min, retry 1, one QueryClient in `_layout.tsx`). Mutations invalidate with the generated `get<X>QueryKey()` helpers. **Exception**: login/register/refresh/logout use raw `fetch` against `EXPO_PUBLIC_API_BASE_URL` (they run before/outside the token getter).
- **Styling**: `StyleSheet.create` + tokens from `constants/theme.ts`, colors from `useColors()`. No styled-components/tailwind. Cards use `components/ui/Card` (optional `accent` colored left-border prop).
- **i18n**: every user-visible string through `t('section.key')` from `usePreferences()`/`useT()`. Arabic is default; `isRTL === (language === 'ar')`.
- **Navigation**: push with typed routes where possible (`router.push({ pathname: '/course/[id]', params: { id } })`); headers are configured centrally in `app/_layout.tsx` (navy background, white tint) — feature screens don't render their own headers.
- **States**: lists render `ActivityIndicator` while loading and `components/ui/EmptyState` when empty; mutations surface failures via `Alert.alert`. (No skeletons, no inline error/retry states yet — see limitations.)

## RTL behavior (current reality — read before styling anything)

The app does **not** use `I18nManager` RTL. Instead it fakes RTL per-screen:
- Many styles hardcode `textAlign: 'right'` and `justifyContent: 'flex-end'` (Arabic-correct, **wrong in French mode**) — e.g. Home cards, files, exams, announcements list text.
- Some screens flip properly with `isRTL` (`flexDirection: isRTL ? 'row-reverse' : 'row'`, calendar, settings rows); the tab bar reverses the tab array for Arabic in `(tabs)/_layout.tsx`.
- Chevrons are frequently hardcoded `chevron-left` (RTL-forward) even in LTR contexts.
When editing a screen, prefer the `isRTL`-conditional pattern (or logical props) over hardcoded alignment; do not introduce more `textAlign: 'right'` literals.

## Authentication flow

login/register → `login(user, access, refresh)` stores tokens → AuthContext effect routes by state: unauthenticated → `/(auth)/login`; authenticated but `profile.onboardingComplete === false` → `/(auth)/onboarding` (university→faculty→department→level(+optional group)→language, saved via `useCompleteOnboarding`); complete → `/(tabs)`. Guest mode sets a fake user + token `'guest'` client-side only — **every API call then 401s**, so guests see empty states everywhere (no dedicated guest messaging).

## Environment

- `EXPO_PUBLIC_API_BASE_URL` — root domain of the API, **no `/api` suffix**, empty string in production (same-origin relative fetches). Read in `contexts/AuthContext.tsx`, `app/(auth)/login.tsx`, `app/(auth)/register.tsx`.
- `BASE_PATH` — optional base path for the web export (`scripts/build.js`).

## Typecheck / build

```bash
pnpm --dir artifacts/mobile exec tsc -p tsconfig.json --noEmit   # NOT covered by root typecheck
cd artifacts/mobile && pnpm run dev                              # expo start
npx expo export -p web                                           # web build → dist/
```
Production web builds happen on Railway (`pnpm run build:all` runs the export + `copy:builds`), so pushing source changes is enough — `artifacts/api-server/public/student` is untracked and rebuilt at deploy time.

**Web platform gotcha**: react-native-web does NOT implement `Alert` — `Alert.alert` silently no-ops in the browser. Always use `showAlert`/`showConfirm` from `lib/alert.ts` (this once made all login/register errors invisible on the deployed web app).

## Current limitations (updated after Phase 1 fixes, 2026-07 — fix knowingly, don't rediscover)

Fixed in Phase 1 (don't re-fix): files open via `lib/urls.ts` helpers (`resolveFileUrl` + `openExternalUrl`); course→files `courseId`/`courseName` params are honored with a clearable chip; phantom fields were stripped (opportunities use `organization`/`link`, events register on `!isRegistered`, exams use `type`/`room`, plans render `features[]`); `course/[id].tsx` is translated + RTL-aware; guests are blocked by `components/GuestGate.tsx` before protected hooks mount; list screens have `isError` → `components/ui/ErrorState` with retry; notifications are newest-first (server) and deep-link by `type` via a fixed map; backend scopes academic content by profile (see route comments in `api-server/src/routes/`).

Still open:

1. **No detail screens**: announcements, assignments, exams, events, clubs, notifications are list-only; Home cards navigate to lists, never to the tapped item. `course/[id]` is the only detail screen.
2. **No assignment submission flow** (backend has `assignment_submissions` and Admin creates assignments; mobile only lists status).
3. **Payment proof upload missing**: the payment form now sends phone + optional `transactionRef`, but no `proofUrl` screenshot upload — that needs a student-accessible upload endpoint (only super-admin `/api/admin/uploads` exists today).
4. **Preferences not synced**: notification/privacy toggles and language live only in AsyncStorage; backend `profiles` has `language`/`privacy` columns that never get updated from Settings (privacy enum also mismatches: mobile `'university'` vs DB `'same_university'`).
5. **Settings stubs**: change password and delete account show "disabled in dev" alerts (`app/settings/index.tsx`); no `POST /auth/forgot-password` UI either.
6. **Notifications**: no per-item mark-read endpoint (backend only has read-all), no push-token registration (backend has `push_tokens`).
7. **Type safety (remaining)**: `app/(auth)/onboarding.tsx`, `app/(tabs)/profile.tsx`, `app/more/index.tsx` still use `as any` casts. Note: `GetProfile200` in the generated client documents `data: Profile`, but the server actually returns a **user object with a nested profile** (`routes/profile.ts` `getFullProfile`) — fix openapi.yaml + regenerate before typing that screen.
8. **English absent**: `Lang = 'ar' | 'fr'` only (DB enum has `en`; README claims trilingual — wrong).
9. **No offline story**: no cache persistence, no downloads; slow networks show spinners indefinitely (retry: 1).
10. Community: comments can't be viewed/added (button is a no-op; backend has `commentsTable` but no student comments endpoints), no report action, no post visibility picker, no pagination.
11. **RTL is still per-screen**: Phase-1 screens use `isRTL`-conditional styles, but `more/`, `settings/`, onboarding and the tab bar still carry Arabic-first assumptions; no `I18nManager` usage.

## Rules for adding or modifying screens

- Register new stack screens in `app/_layout.tsx` (`headerScreen(...)`) with a `screens.*` translation key in **both** `ar` and `fr` dictionaries.
- Use generated hooks; if the endpoint is missing, add it backend-first (route → openapi.yaml → codegen) — never hand-write a fetch for an authenticated call.
- Check the actual API response shape (route file in `artifacts/api-server/src/routes/`) before reading fields — see phantom-fields list above for what happens otherwise.
- Reuse `ui/` components; keep `paddingBottom: ~100` on scroll content inside tabs (the tab bar is `position: 'absolute'`).
- Follow the RTL guidance above; test both `ar` and `fr`.
- Don't replace real data with mocks; don't add placeholder screens without wiring them to the API.
