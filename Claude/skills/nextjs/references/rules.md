# Next.js Rules — by Category

The full rule list for the `nextjs` skill. Load when targeting a specific category. Rules below are the Next.js / server-side subset of the upstream Vercel guide; pure React rules live in the `react` skill.

---

## 1. Server-Side Performance (CRITICAL — `server-`)

- **`server-auth-actions`** — Authenticate every Server Action like an API route. Server Actions are reachable as POST endpoints; "the form is in our UI" is not auth. Apply when: defining any `'use server'` action that touches user data or mutates state.
- **`server-cache-react`** — Wrap repeated server-side fetches in `cache()` from `react`. Per-request dedup; multiple components calling `getUser()` → one DB hit. Apply when: same fetch happens in multiple RSCs / layouts within a single request.
- **`server-cache-lru`** — `unstable_cache` (Next built-in) or external LRU (Redis, Upstash) for cross-request caching. Apply when: data shared across requests, expensive to recompute, OK to be slightly stale.
- **`server-dedup-props`** — Don't pass the same data through multiple props or via context to client components — each crossing serializes again. Apply when: a layout passes `user` to two children that both serialize it.
- **`server-hoist-static-io`** — Hoist module-load-time I/O (font configs, logo SVGs, CMS index) to the module scope or a `unstable_cache` wrapper. Apply when: an RSC re-reads the same static asset on every render.
- **`server-serialization`** — Pass minimal data across the RSC → client boundary. Pick fields the client actually needs; transform server-side. Apply when: passing a database record to a client component.
- **`server-parallel-fetching`** — Restructure components to fire independent fetches in parallel, not parent-then-child. Apply when: parent RSC awaits data, then child RSC awaits unrelated data.
- **`server-parallel-nested-fetching`** — For per-item dependent fetches, chain inside each item's promise (`ids.map(id => getChat(id).then(c => getUser(c.author)))`) instead of two `Promise.all` stages. Apply when: a second `Promise.all` maps over the results of the first.
- **`server-no-shared-module-state`** — Never hold request-scoped data in mutable module-level variables; concurrent renders share the process and leak data across users. Pass it as props or via a `cache()` getter. Apply when: a server module has a top-level `let` written during render / in an action.
- **`server-after-nonblocking`** — `after(() => nonCritical())` from `next/server` to run work after the response is sent. Apply when: logging, analytics, secondary writes that shouldn't block TTFB.

## 2. Eliminating Server Waterfalls (CRITICAL — `async-`)

- **`async-defer-await`** — Move `await` into branches where the value is consumed; avoid awaiting before conditions that may not need the value. Apply when: an RSC fetches data then conditionally renders without using it.
- **`async-cheap-condition-before-await`** — In `if (await flag() && cheapCond)`, check the cheap synchronous condition first and await only inside it. Apply when: an awaited flag / remote value is combined with a local condition that is often false.
- **`async-parallel`** — `Promise.all([...])` for independent server fetches. Apply when: 2+ sequential `await`s in RSC / server action / route handler with no dependency between them.
- **`async-dependencies`** — `better-all` for partial dependency graphs. Apply when: 3+ promises with mixed dependencies.
- **`async-api-routes`** — Start promises early, await late. In a Route Handler, kick off all I/O at function entry; await each only where needed. Apply when: writing a Route Handler that calls multiple downstreams.
- **`async-suspense-boundaries`** — `<Suspense>` around slow async children to stream content. The shell renders immediately; slow chunks fill in. Apply when: page has fast + slow async sections (header fast, feed slow).

## 3. Bundle Size — Next-specific (HIGH — `bundle-`)

- **`bundle-barrel-imports`** — Direct path imports, not from a barrel `index.ts`. For third-party barrels, add the package to `experimental.optimizePackageImports` in `next.config` (Next already includes common ones such as `@mui/material`, `@mui/icons-material`, `lodash-es`, `date-fns`, `lucide-react`); `modularizeImports` is the older, manual-transform alternative. Apply when: importing from a UI library or shared package.
- **`bundle-dynamic-imports`** — `next/dynamic` for heavy client components used after a user action. `{ ssr: false }` only when the component genuinely can't render server-side (uses `window`, etc.), and only from a `'use client'` file — it's not supported in Server Components. Apply when: a chart, editor, or map weighs >50KB gzipped and isn't always rendered.
- **`bundle-analyzable-paths`** — Keep `import()` and `fs` paths statically analyzable: an explicit map of `() => import('./x')` thunks, literal `path.join(process.cwd(), 'content/blog')` per branch. Variable paths widen the bundle and Next's output file tracing. Apply when: `import(someVar)` or `path.join(cwd, 'dir/' + kind)` in app/server code.
- **`bundle-defer-third-party`** — Load analytics / error tracking / heatmaps after hydration. `next/script` with `strategy="afterInteractive"` or `"lazyOnload"`. Apply when: any non-critical third-party script.
- **`bundle-conditional`** — Load a feature module only when the feature activates. Pair with `bundle-dynamic-imports`. Apply when: an integration is gated by a flag, plan tier, or admin role.
- **`bundle-preload`** — `<Link prefetch>` defaults to true on viewport-visible links; for predicted nav use `router.prefetch()`. Apply when: there's a clear primary next-route.

## 4. Hydration & Streaming (MEDIUM — `rendering-` + `async-`)

- **`rendering-hydration-no-flicker`** — Inline-script user theme / locale / feature flags before React hydrates. Reading from `localStorage` in a `useEffect` causes a flash. Apply when: server can't compute the value at render time.
- **`rendering-hydration-suppress-warning`** — `suppressHydrationWarning` on the *specific element* whose mismatch is expected (timestamp, locale-formatted date). Apply when: known unavoidable mismatch generates console noise — never on the whole tree.
- **`rendering-resource-hints`** — `preconnect` / `prefetchDNS` / `preload` / `preinit` from `react-dom` (React 19) called during render — works in Server Components, so hints go out before the client bundle. Apply when: a page will hit a third-party origin or needs a font / stylesheet / script early.
- **`rendering-script-defer-async`** — No render-blocking scripts. In Next use `next/script` with a `strategy` (`afterInteractive` / `lazyOnload`); raw `<script>` needs `async` (independent) or `defer` (order / DOM-dependent). Apply when: any `<script src>` in a layout.
- **`rendering-usetransition-loading`** — `useTransition` for navigation loading state instead of a manual `isPending` flag. React keeps the previous UI visible while the new route's data loads. Apply when: a navigation triggers a slow data fetch.
- **`async-suspense-boundaries`** — (also see Category 2.) Use Suspense to stream pieces of the page independently rather than blocking on the slowest fetch. Apply when: a page has clearly separable fast and slow regions.

---

## App Router patterns (no rule prefix — Next.js conventions, not Vercel rules)

| Convention | Rule |
|---|---|
| Server Component default | Only opt into `'use client'` at the deepest leaf that needs interactivity. |
| Server Action vs Route Handler | Server Action for mutations from your own UI; Route Handler for external clients (webhooks, mobile, third-party). |
| `error.tsx` / `loading.tsx` | Use Next's automatic boundaries; don't hand-roll error / loading flags in components. |
| Async request APIs (Next 15) | `params` / `searchParams` are Promises — `await` them in Server Components, `use()` them in Client Components; `cookies()` / `headers()` / `draftMode()` must be awaited. |
| `fetch` caching (Next 15) | Uncached by default. Opt in per call (`next: { revalidate, tags }`, `cache: 'force-cache'`) or with `unstable_cache`; pair with `revalidateTag`. |
| Dynamic mode | `export const dynamic = 'force-static' \| 'force-dynamic' \| 'auto'` per segment. Explicit > implicit. |
| Revalidation | `revalidatePath('/path')` or `revalidateTag('tag')` immediately after a Server Action mutation. |
| Auth in Server Actions | Treat every action as a public endpoint. Auth + validate every input. |
| `next/image` / `next/font` / `next/script` | Use these for assets — they handle responsive images, font preloading, and script strategies that are tedious to hand-roll. |
| Streaming | Wrap slow async work in `<Suspense>` so the shell renders first. |
