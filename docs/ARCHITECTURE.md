# Architecture

How this application is put together and why. Written to be read top to bottom.

---

## 1. State has four owners

Most React codebases decay for one reason: state of different kinds ends up mixed together in the same component, and from then on every change risks breaking something unrelated.

There are four kinds here, and each has exactly one home:

| Kind             | Example               | Owner            | Why                                                                                                                   |
| ---------------- | --------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Server state** | The articles          | RTK Query cache  | We don't own it. It goes stale, it can fail, it needs caching and refetching. It is a replica, not a source of truth. |
| **URL state**    | `?page=3&q=noodles`   | The URL          | Must survive a refresh, be shareable, and work with the back button.                                                  |
| **Form state**   | What is being typed   | React Hook Form  | Short-lived, high-frequency, needs validation. In Redux it would re-render the app on every keystroke.                |
| **Ephemeral UI** | "Is the dialog open?" | Local `useState` | Nothing outside the component cares.                                                                                  |

**Nothing is copied between them.** No `useState` mirroring a URL parameter, no `useEffect` copying fetched data into local state. Every duplicate is a synchronisation bug waiting to be written.

This is enforced mechanically as well as by convention: `eslint-plugin-react-hooks` v7 ships the React Compiler rules, including `no-deriving-state-in-effects` and `set-state-in-effect`, which fail the build on exactly that pattern.

---

## 2. The contract package

`packages/contracts` holds the agreement between the client and the server: what an article is, what makes one valid, what a response looks like, what an error looks like.

It exists because the alternative is writing those rules twice:

```ts
// server
if (!title || title.length > 200) return res.status(400)...

// client
<input required maxLength={100} />   // already disagrees
```

Nobody notices until someone pastes a 150-character headline, the form accepts it and the server rejects it with no explanation. Six months later the server limit changes and the form is forgotten.

With a contract the rule exists once:

```ts
export const articleInputSchema = z.object({
  title: z
    .string({ error: 'Article title is required' })
    .trim()
    .min(1, 'Article title is required')
    .max(200, 'Title must be 200 characters or fewer'),
  // ...
});

export type ArticleInput = z.infer<typeof articleInputSchema>; // derived, never hand-written
```

The React form feeds it to `zodResolver`; the Express middleware feeds it to `parseOrThrow`. Change the limit once and both move. The **type** is derived from the **validator**, so they cannot disagree either.

Neither side depends on the other:

```
   client ─┐
           ├→ contracts
   server ─┘
```

Either could be replaced without touching the other.

### Why the message is repeated on the type check

```ts
z.string({ error: 'Article title is required' }).trim().min(1, 'Article title is required');
```

Zod validates the _type_ before the _length_. A field absent from the request body never reaches `.min(1)`, so without the first message the API answers `"Invalid input: expected string, received undefined"` — developer jargon, shown to a user. Found by POSTing an empty body to the running server rather than by reading the code.

---

## 3. Layers and the dependency rule

```
        app        composition root: providers, router, store, theme
         ↓
       pages       one component per route
         ↓
     features      the article domain: its api, model and ui
         ↓
      shared       generic and domain-free: HTTP client, layout, hooks
```

**A module may import only from layers strictly below it.** Never sideways between features, never upward.

The payoff is that any layer can be replaced without disturbing the ones beneath it. Swapping MUI for Tailwind touches `shared/ui` and `features/*/ui`. Swapping the backend touches `features/*/api`. That property is what "maintainable" means in practice.

A rule nobody checks is a rule nobody follows, so it is enforced by ESLint:

```js
{
  files: ['packages/web/src/shared/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [{
        group: ['@/app/**', '@/pages/**', '@/features/**'],
        message: 'shared/ is the bottom layer and must stay domain-agnostic…',
      }],
    }],
  },
}
```

Pages may also import a feature only through its barrel (`@/features/articles`), never its internals, so a feature stays free to be restructured.

### Why four layers and not seven

This is [Feature-Sliced Design](https://feature-sliced.design), which defines seven layers: `app`, `processes`, `pages`, `widgets`, `features`, `entities`, `shared`.

Applying all seven to a two-page application with one entity would produce an `entities/article/` folder holding a single type, a `widgets/` layer holding one list, and a scattering of near-empty re-export files. That is ceremony, not architecture.

So the **principles** are kept — layered dependencies, domain slices, technical segments (`ui`, `api`, `model`), colocation — and the **layer count** is matched to the problem. `processes` is deprecated by FSD itself, `widgets` has nothing to hold, and `entities` is merged into `features` because there is exactly one entity.

---

## 4. Axios inside RTK Query

The brief requires Axios. RTK Query ships `fetchBaseQuery`, which uses `fetch`. These are reconciled with a [custom `baseQuery`](https://redux-toolkit.js.org/rtk-query/usage/customizing-queries), which is the documented extension point:

```ts
export function axiosBaseQuery(): BaseQueryFn<AxiosBaseQueryArgs, unknown, ApiError> {
  return async ({ url, method = 'GET', data, params }, api) => {
    try {
      const response = await axiosInstance({ url, method, data, params, signal: api.signal });
      return { data: response.data as unknown };
    } catch (error) {
      return { error: normalizeError(error) };
    }
  };
}
```

Two requirements, both easy to miss:

1. **It must never throw.** RTK Query expects `{ data }` or `{ error }` as a _return value_. An exception escapes its error channel entirely — the hook's `error` stays `undefined` while the UI renders nothing.
2. **It must forward `api.signal`.** That is what lets RTK Query abort a superseded request, which is how a slow response for `"a"` is prevented from landing after the fast one for `"abc"`.

### Cache invalidation is declarative

```ts
listArticles: { providesTags: (result) => [...result.data.map(({ id }) => ({ type: 'Article', id })),
                                           { type: 'Article', id: 'LIST' }] },
createArticle: { invalidatesTags: [{ type: 'Article', id: 'LIST' }] },
```

Queries declare what they hold; mutations declare what they changed; RTK Query refetches the overlap. Creating an article refreshes the list on its own — there is no `refetch()` call anywhere, and therefore no way to forget one of the places that needed updating.

---

## 5. Every failure becomes one shape

```
Network down ─┐
Timeout ──────┤
Cancelled ────┤
400 + details ├──▶ normalizeError() ──▶ ApiError ──▶ UI
502 HTML page ┤                        { status, code,
Non-Error ────┘                          message, details? }
```

Without that funnel, every call site re-implements "is this an AxiosError, does it have a response, is the body JSON" and gets a case wrong.

The cases, and why each is separate:

| Case                      | Handling                                                                                                                                                                    |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cancelled**             | Not a failure. Fires when a component unmounts or a newer search supersedes an older one, and must never surface as an error.                                               |
| **Timeout**               | Distinct from offline — "check your connection" is wrong advice when the server is reachable but slow.                                                                      |
| **No response**           | Server down, DNS failure, CORS block. `error.response` is `undefined`; there is no status to report.                                                                        |
| **Structured `4xx`**      | Our own envelope. Code, message and per-field details pass straight through.                                                                                                |
| **Unrecognised response** | A proxy's HTML error page, so `response.data` is a **string**. Reaching for `.error.message` on it throws — an error handler that errors. Logged, and answered generically. |
| **Non-`Error` thrown**    | The normaliser must never be the thing that crashes.                                                                                                                        |

It is also idempotent: passing an already-normalised error back through returns it unchanged, so a second pass cannot flatten a validation failure and discard the field details the form needs.

Errors then surface at the right altitude — inline under a field, a snackbar for a failed action, a full error state with retry for a failed page, and an error boundary for a render crash.

---

## 6. Dates are calendar dates

An article's publication date is a _calendar date_, not an instant. It is stored, transported and compared as a `'YYYY-MM-DD'` string end to end, and never converted to a timestamp.

`new Date(value).toISOString()` shifts the date by a day for anyone east of UTC. Two places where that would have been a visible bug:

- **Validation.** At 07:00 on 1 August in Singapore it is still 23:00 on 31 July in UTC. Comparing a picked date against bare UTC today would reject "today" for every user east of UTC.
- **Display.** The same offset would label an article published today as "Yesterday".

Both derive the current day from the reader's _local_ calendar day, and both have tests that fake the clock to that exact instant.

SQLite has no date type, so the column is `TEXT`. As a fixed-width string it sorts and compares correctly with plain lexicographic ordering, and no conversion happens on read.

---

## 7. The repository interface

```ts
export interface ArticleRepository {
  list(query: ListQuery): Promise<ListArticlesResult>;
  findById(id: string): Promise<Article | null>;
  create(input: ArticleInput): Promise<Article>;
  update(id: string, input: ArticleInput): Promise<Article | null>;
  remove(id: string): Promise<boolean>;
}
```

Controllers depend on this, never on SQLite. Two consequences: tests inject an in-memory implementation with no mocking framework, and moving to Postgres means writing one new class rather than touching any route, controller or type.

The methods return promises even though `node:sqlite` is synchronous. A driver's synchronicity is an implementation detail; baking it into the interface would mean every caller changes on the day the database does.

### Two SQL details that are easy to get wrong

**The `ORDER BY` carries a tie-breaker.** Sorting only by `date` leaves rows from the same day in undefined order, so an article can appear on two pages at once — or on neither.

**`LIKE` wildcards in the search term are escaped.** Unescaped, searching for `%` matches every row and quietly returns the whole table.

The sort column is interpolated into the SQL because a column name cannot be a bound parameter. It is keyed off an allowlisted union from the contract, and the schema falls back to `date` for anything unrecognised, so nothing outside that set can reach the query.

---

## 8. Version notes

Verified against the npm registry on 2026-07-31. Where the newest version is _not_ used, the reason is recorded.

| Package            | Version         | Note                                |
| ------------------ | --------------- | ----------------------------------- |
| `react`            | 19.2.8          |                                     |
| `typescript`       | **6.0.3**       | Not 7.x — see below                 |
| `vite`             | 8.2.0           | Rolldown is the default bundler     |
| `react-router`     | 8.3.0           | `react-router-dom` no longer exists |
| `@reduxjs/toolkit` | 2.12.0          |                                     |
| `@mui/material`    | 9.2.0           | v8 was skipped to align with MUI X  |
| `zod`              | 4.4.3           | `err.issues`, not `err.errors`      |
| `express`          | 5.2.1           | Async errors propagate natively     |
| `node:sqlite`      | built into Node | No native addon                     |

**TypeScript is pinned to 6.x deliberately.** TypeScript 7 — the Go rewrite — is current, but ships without a public compiler API until 7.1:

```console
$ npm view typescript-eslint peerDependencies
{ typescript: '>=4.8.4 <6.1.0' }
```

Adopting the newest release would mean giving up type-aware linting, which is most of the value of linting a TypeScript project.

### Breaking changes worth knowing in this stack

| Trap                                      | Correct form                                         |
| ----------------------------------------- | ---------------------------------------------------- |
| `react-router-dom` removed in v8          | `import { Link } from 'react-router'`                |
| Zod 4 moved error formatting              | `err.issues`, `z.treeifyError()`, `z.flattenError()` |
| Zod 4 removed `ZodError.errors`           | Returns `undefined` **silently**                     |
| Vite 8 renamed bundler options            | `build.rolldownOptions`                              |
| MUI 9 removed 23 legacy icons             | `DeleteOutlined`, not `DeleteOutline`                |
| `@vitejs/plugin-react` v6 dropped `babel` | JSX is transformed by oxc                            |
| TS 6 deprecated `baseUrl`                 | `paths` resolve relative to the tsconfig             |
| TS 6 defaults `types` to `[]`             | List `@types/*` packages explicitly                  |
| Express 5 `req.query` is read-only        | Validate in the handler, not by reassigning          |

---

## 9. Testing strategy

Tests mirror the layers; each level mocks the level below.

```
        ▲  End-to-end — 23 Playwright specs
       ╱ ╲   real browser, real server, real database
      ╱   ╲  plus a WCAG 2.1 AA audit over five DOM states
     ╱─────╲
    ╱  API  ╲  35 supertest specs — real HTTP, real SQL, in-memory database
   ╱─────────╲
  ╱ Component ╲ 51 RTL specs through MSW — real Axios, real RTK Query cache
 ╱─────────────╲
      Unit       67 — schemas, dates, error normalisation, debounce
```

**MSW rather than `vi.mock('axios')`**, because mocking the module replaces exactly the code most worth testing — the Axios instance, `axiosBaseQuery`, the RTK Query cache. Intercepting at the network boundary means all of that really runs. Unhandled requests fail the run rather than warning, so a test cannot silently reach a real endpoint and pass.

What is worth testing here is the behaviour that is easy to regress, not the markup: that an empty submit sends _no request_, that a server `400` lands on the right field, that a failed submit does not destroy the user's input, that stale search responses cannot overwrite newer ones, and that a date is still "Today" at UTC+8.

---

## 10. What was considered and rejected

| Rejected                                   | Why                                                                                                                               |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript 7                               | No public compiler API until 7.1, so `typescript-eslint` cannot run                                                               |
| `better-sqlite3`                           | Native addon; risks compiling from source during `npm install`                                                                    |
| A hosted database                          | Needs credentials the reviewer lacks; free tiers pause when idle                                                                  |
| Full seven-layer FSD                       | Ceremony for a two-page, one-entity application                                                                                   |
| `createAsyncThunk` + `createEntityAdapter` | More boilerplate to do worse what RTK Query does for fetch-and-cache                                                              |
| TanStack Query                             | Better pure server-state library, but the brief names Redux and RTK Query gives the same benefits                                 |
| Next.js                                    | The brief asks for React Router; SSR adds surface area and no value here                                                          |
| Tailwind                                   | Would mean hand-building an accessible dialog, pager and snackbar                                                                 |
| React Compiler transform                   | `@vitejs/plugin-react` v6 dropped Babel; re-adding it to auto-memoise a two-page app is not worth it. Its **lint rules** are kept |
| `uuid`                                     | `crypto.randomUUID()` is built in                                                                                                 |
| Authentication                             | Not in the brief                                                                                                                  |
