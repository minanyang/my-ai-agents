# Next.js Recipes — Spot & Fix

Concrete spot-and-fix snippets for the highest-leverage Next.js rules. Load when applying a fix — copy the patch shape, don't reinvent. APIs evolve between Next versions; the recipes below target Next 15 App Router: `params` / `searchParams` / `cookies()` / `headers()` / `draftMode()` are async and must be awaited, and `fetch` is uncached unless you opt in. `after` is stable since 15.1.

Each recipe: **Spot** → **Why bad** → **Fix**.

---

## server-cache-react (per-request dedup)

**Spot:** `getCurrentUser()` is called from `layout.tsx`, `Sidebar.tsx`, and the page itself. Three DB hits per request.

**Fix:**
```ts
// lib/user.ts
import { cache } from 'react';

export const getCurrentUser = cache(async () => {
  const session = await auth();
  if (!session) return null;
  return db.user.findUnique({ where: { id: session.userId } });
});
```
`cache()` is per-request — the second call within a request returns the same Promise. Doesn't help across requests; for that use `unstable_cache` or external LRU.

---

## server-cache-lru (cross-request)

**Spot:** Hot-path query that's safe to be a few seconds stale, hit thousands of times.

**Fix (Next built-in):**
```ts
import { unstable_cache } from 'next/cache';

export const getProductCatalog = unstable_cache(
  async () => db.product.findMany({ where: { active: true } }),
  ['product-catalog'],          // cache key parts
  { revalidate: 60, tags: ['products'] }
);
```
Invalidate with `revalidateTag('products')` after a mutation. For finer-grained cross-request caching (multi-region, distributed), use Redis / Upstash directly.

---

## server-parallel-fetching

**Spot:** RSC awaits user, *then* awaits posts:
```tsx
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser(id);    // 200ms
  const posts = await getPosts(id);  // 200ms
  return <Profile user={user} posts={posts} />;
}
```
Total: 400ms. The two fetches are independent.

**Fix:**
```tsx
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;  // Next 15: params is a Promise
  const [user, posts] = await Promise.all([
    getUser(id),
    getPosts(id),
  ]);
  return <Profile user={user} posts={posts} />;
}
```
Total: 200ms.

---

## server-parallel-nested-fetching

**Spot:** Two `Promise.all` stages where the second depends per-item on the first:
```ts
const chats = await Promise.all(chatIds.map((id) => getChat(id)));
const authors = await Promise.all(chats.map((chat) => getUser(chat.author)));
```
One slow `getChat` holds back every author fetch.

**Fix:** chain each item's dependent fetch inside its own promise:
```ts
const authors = await Promise.all(
  chatIds.map((id) => getChat(id).then((chat) => getUser(chat.author)))
);
```

---

## Opting a server fetch into caching (Next 15)

**Spot:** A slow, rarely-changing upstream (CMS JSON, config) fetched with a bare `fetch(url)` from a layout / `generateMetadata` on a dynamic route. Every request blocks on the origin — Next 15 doesn't cache `fetch` by default.

**Fix:**
```ts
const tag = `restaurant:${path}`;
const res = await fetch(url, { next: { revalidate: 60, tags: [tag] } });

// on publish (Server Action / webhook Route Handler):
revalidateTag(tag);
``` Only status-200 responses are written to the Data Cache, and `revalidate` serves stale while refreshing — if you need to cache a "not found" answer, or wrap non-`fetch` work, use `unstable_cache` (it stores whatever the callback returns). Don't reach for a segment-wide `fetchCache = 'default-cache'`.

---

## async-suspense-boundaries (streaming)

**Spot:** Page has a fast header + a slow feed. User sees a blank screen until both resolve.

**Fix:**
```tsx
export default function Page() {
  return (
    <>
      <Header />
      <Suspense fallback={<FeedSkeleton />}>
        <SlowFeed />
      </Suspense>
    </>
  );
}
```
Header + skeleton stream immediately; `<SlowFeed>` swaps in when its async work resolves. The page's shell is interactive faster.

---

## server-auth-actions

**Spot:** A Server Action with no auth check.

```ts
'use server';
export async function deletePost(id: string) {
  await db.post.delete({ where: { id } });
}
```
Anyone who finds the action's URL can call it.

**Fix:**
```ts
'use server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const Input = z.object({ id: z.string().uuid() });

export async function deletePost(raw: unknown) {
  const session = await auth();
  if (!session) throw new Error('UNAUTHORIZED');

  const { id } = Input.parse(raw);

  const post = await db.post.findUnique({ where: { id } });
  if (post?.authorId !== session.userId) throw new Error('FORBIDDEN');

  await db.post.delete({ where: { id } });
  revalidatePath(`/users/${session.userId}/posts`);
}
```

---

## server-serialization

**Spot:** Passing `user` (full DB record, 30 fields including `password_hash`) to a client component that displays `name` + `avatar`.

**Why bad:** Every field is serialized into the HTML and the RSC payload. Bandwidth + leak risk.

**Fix:**
```tsx
const { name, avatar } = await getUser();
return <UserChip name={name} avatar={avatar} />;
```
Pass only the fields the client needs. Or define a `pickPublicUser(user)` helper at the data layer.

---

## server-after-nonblocking

**Spot:** Every request blocks on logging:
```ts
export async function POST(req) {
  const result = await handleRequest(req);
  await logEvent('request_handled', result);  // adds 80ms to TTFB
  return Response.json(result);
}
```

**Fix:**
```ts
import { after } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const result = await handleRequest(req);
  after(() => logEvent('request_handled', result));
  return Response.json(result);
}
```
Response goes out immediately; `logEvent` runs after. `after` is stable since Next 15.1 — no config flag.

---

## bundle-dynamic-imports (Next-specific)

**Spot:** Heavy client component imported at the top of a page that only renders it on click.

**Fix (the importing file is a Client Component, or SSR is fine):**
```tsx
// Before
import HeavyEditor from '@/components/HeavyEditor';

// After
import dynamic from 'next/dynamic';
const HeavyEditor = dynamic(() => import('@/components/HeavyEditor'), {
  loading: () => <EditorSkeleton />,
});
```

**Fix (component truly can't render server-side — uses `window`, etc.):** `ssr: false` is only supported in a Client Component, so put the `dynamic()` call in a `'use client'` wrapper and render that from the Server Component page:
```tsx
// components/HeavyEditorClient.tsx
'use client';
import dynamic from 'next/dynamic';

export const HeavyEditorClient = dynamic(() => import('./HeavyEditor'), {
  loading: () => <EditorSkeleton />,
  ssr: false,
});
```
Only set `ssr: false` when needed — disabling SSR forfeits server-rendered content for that subtree, and the chunk still loads at hydration rather than on interaction. If the component is only mounted from client state (a panel opened on click), it never renders on the server anyway; a `lazy()` / `dynamic()` split at that point is enough.

---

## 'use client' boundary placement

**Spot:**
```tsx
// app/dashboard/page.tsx
'use client';

import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Counter } from '@/components/Counter';

export default function Dashboard() { /* ... */ }
```
The whole page is now client. Sidebar, Header (if they don't need interactivity) get pulled into the client bundle unnecessarily.

**Fix:** push `'use client'` down to the leaf:
```tsx
// app/dashboard/page.tsx — Server Component
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Counter } from '@/components/Counter';  // this one is 'use client'

export default function Dashboard() { /* ... */ }
```
Now only `Counter` ships to the client. Sidebar + Header render on the server.

---

## server-no-shared-module-state

**Spot:** a module-level `let` written during a server render (`let currentUser = null; … currentUser = await auth()`) and read by another component.

**Why bad:** module scope is process-wide; concurrent requests overwrite each other → one user's data in another's response.

**Fix:** keep request data in the render tree — pass it as props, or read it through a `cache()`-wrapped getter (per-request):
```tsx
export default async function Page() {
  const user = await getCurrentUser();  // cache()-wrapped, see server-cache-react
  return <Dashboard user={user} />;
}
```
Module scope is fine for immutable config/static assets and deliberately keyed cross-request caches.

---

## revalidatePath / revalidateTag after mutation

**Spot:** Server Action updates a post but the page still shows the old title.

**Fix:**
```ts
'use server';
import { revalidatePath } from 'next/cache';

export async function updatePost(id: string, data: PostInput) {
  await db.post.update({ where: { id }, data });
  revalidatePath(`/posts/${id}`);
  revalidatePath('/posts');  // and the index
}
```
Or with tags:
```ts
import { revalidateTag } from 'next/cache';

revalidateTag('posts');  // pairs with unstable_cache({ tags: ['posts'] })
```

---

## rendering-hydration-no-flicker (theme example)

**Spot:** Page renders in light mode for ~200ms, then snaps to dark. The user's theme preference lives in `localStorage`.

**Fix (inline script in `<head>`):**
```tsx
// app/layout.tsx
const themeScript = `
  try {
    const stored = localStorage.getItem('theme');
    const theme = stored === 'dark' || stored === 'light'
      ? stored
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
  } catch (_) {}
`;

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
```
Theme is applied before React hydrates. No flash.

---

## rendering-hydration-suppress-warning (scoped)

**Spot:** Console warning: "Text content did not match. Server: '12:34:56' Client: '12:34:57'." for a `<time>` showing now.

**Fix:**
```tsx
<time suppressHydrationWarning>{new Date().toLocaleTimeString()}</time>
```
Apply to the *specific* mismatching element. Never put `suppressHydrationWarning` on `<html>` or `<body>` — that hides legit hydration bugs.
