# Interview prep progress

Every step below is still uncommitted. Each step lists its files and a suggested commit message.

---

## Step 1: Seed 20k movies

**Files:** `src/prisma/seed.js`, `package.json`

**What it does**
- `npm run seed` creates 20,000 generated movies plus 10 well-known ones. `npm run seed -- 5000` sets a different amount.
- Inserts run in batches of 1,000 with `createMany`.
- Creates a seed user once with `upsert` and reuses it on later runs (`seed@moviewatchlist.dev` / `Password123!`).
- Deletes only that user's movies before inserting, so rerunning gives the same result with no duplicates.
- Uses a fixed-seed random generator, so everyone gets the same data.

**Interview points**
- One insert per row means 20k round trips. One insert of 20k rows can exceed Postgres' limit of about 65k parameters per statement. Batches avoid both.
- An idempotent seed is safe to run in CI and on any teammate's machine.

**Commit message**
```
feat(seed): bulk-seed 20k movies with batched createMany

- Generate realistic movies with a fixed-seed random generator
- Insert in batches of 1000 instead of one row per query
- Upsert a dedicated seed user and clear only its movies so the seed can be rerun
- Rename script to npm run seed (accepts a movie count argument)
```

---

## Step 2: Pagination, filtering, sorting and search

**Files:** `src/constants/movie.js` (new), `src/utils/movieQuery.js` (new), `src/validators/movieValidators.js`, `src/middleware/validateRequest.js`, `src/controllers/movieController.js`, `src/routes/movieRoutes.js`, `src/prisma/seed.js` (now uses the shared `GENRES`)

**Endpoints**
- `GET /movies` accepts these query parameters:

  | Parameter | Values | Default |
  |---|---|---|
  | `search` | text, at least 2 characters; matches title or overview, ignoring case | none |
  | `genres` | `Drama,Crime`; returns movies with any of them, ignoring case | none |
  | `minYear`, `maxYear` | year range | none |
  | `minRuntime`, `maxRuntime` | minutes | none |
  | `sortBy` | `createdAt`, `title`, `releaseYear`, `runtime` | `createdAt` |
  | `order` | `asc`, `desc` | `desc` |
  | `page`, `limit` | offset pagination; `limit` is 1–100 | page 1, limit 20 |
  | `cursor` | id of the last movie seen; can't be combined with `page` | none |

- `GET /movies/:id` returns one movie with its creator and how many watchlists include it.

**Example requests**
```
GET /movies?search=garden&genres=sci-fi,horror&minYear=2000&sortBy=releaseYear&order=asc&page=2&limit=10
GET /movies?sortBy=title&order=asc&limit=20&cursor=<nextCursor from previous response>
```

**Interview points**
- **Offset vs cursor pagination.** `OFFSET 18000` makes Postgres read and throw away 18,000 rows, so deep pages get slower; page 900 took about 1s here. It also needs a `COUNT(*)`, and rows shift between pages when data is inserted. A cursor continues after the last row the client saw. It stays fast at any depth and has no duplicates or gaps, but you can't jump to page 57. Use offset for admin tables and cursor for infinite scroll and feeds.
- **Stable sort.** `id` is always added as a second sort key. Many movies share a `releaseYear`, and without a unique tie-breaker their order is undefined, so rows repeat or go missing between pages. Tested: 6 pages by cursor and 6 by offset returned the same 150 ids.
- **Whitelist sort fields.** `sortBy` must be one of the allowed values. Passing raw client input into `orderBy` lets clients sort by columns like `password`, or cause injection in raw SQL.
- **Limit cap.** Capping `limit` at 100 stops `?limit=1000000` from dumping the whole table.
- **Fetch `limit + 1` rows** to know whether there's a next page without running a count.
- **Count and rows in one `$transaction`**, so the total matches the rows returned.
- **`select` only the needed columns** instead of `SELECT *`. Less data travels over the network.
- **Query strings are always strings**, so numbers need `z.coerce`. `?genres=a&genres=b` arrives as an array, which the validator handles.
- **Express 5 `req.query` is a getter**, so validated values are written back with `Object.defineProperty`.

**Commit message**
```
feat(movies): add pagination, filtering, sorting and search to GET /movies

- Offset pagination (page/limit) with total, totalPages and has-next/prev metadata
- Cursor pagination (cursor/limit) using limit+1 lookahead, no COUNT
- Filters: case-insensitive search on title/overview, genres, year and runtime ranges
- Whitelisted sortBy/order with id as a tie-breaker for stable pages
- Validate query strings with zod (coercion, limit cap, range checks)
- Add GET /movies/:id with creator and watchlist count
- Restrict genres to a shared list used by seed, validators and filters
```

---

## Step 3: App structure and security

**Files:** `src/app.js` (new), `src/server.js`, `src/config/env.js` (new), `src/middleware/securityMiddleware.js` (new), `src/middleware/errorMiddleware.js`, `src/utils/generateToken.js`, `.env.example`, `package.json`

**What it does**
- **`app.js` and `server.js` are split.** `app.js` builds the Express app, and `server.js` connects to the database, calls `listen()` and handles shutdown. Tests can import the app without opening a port.
- **Environment validation** (`config/env.js`): every environment variable is checked with zod at startup. A missing `DATABASE_URL` or a short `JWT_SECRET` stops the app immediately with a clear message instead of failing on the first request that needs it.
- **helmet** adds security headers (Content-Security-Policy, HSTS, X-Content-Type-Options and others) and removes `X-Powered-By: Express`.
- **CORS:**
  - Only origins listed in `CORS_ORIGINS` may call the API from a browser.
  - `credentials: true` lets the browser send the jwt cookie.
  - Preflight (OPTIONS) responses are cached for 10 minutes.
- **Rate limiting:**
  - Every route: 300 requests per 15 minutes per IP.
  - `/auth/login` and `/auth/register`: 10 failed attempts per 15 minutes. Successful logins don't count.
  - Over the limit returns `429` with `Retry-After` and standard `RateLimit` headers.
- **Body size limit** of 10kb. Larger requests get a `413`.
- **compression:** responses are gzipped.
- **Graceful shutdown:** on SIGTERM or SIGINT the server stops taking new requests, lets running ones finish, then closes the database connection. If that takes longer than 10 seconds it exits anyway. Crashes (`unhandledRejection` / `uncaughtException`) are logged as fatal, then the app shuts down with exit code 1.
- **The database connects before `listen()`**, so the app never accepts requests it can't serve.
- **Error handler:** 4xx errors keep their message. 5xx errors return a generic message plus a `requestId`, and the real error with its stack trace goes only to the logs.

**Interview points**
- CORS is enforced by browsers, not by the server. It doesn't protect an API from curl or Postman; authentication does. CORS only decides which websites' JavaScript may read your responses.
- A preflight request is an OPTIONS request the browser sends before "non-simple" requests, such as JSON bodies, PUT/PATCH/DELETE, or an `Authorization` header.
- `credentials: true` can't be combined with origin `*`. The server must echo back a specific origin.
- `trust proxy`: behind nginx or a load balancer every request seems to come from the proxy's IP. Without this setting all users share one rate limit.
- Rate limits stored in memory reset on restart and aren't shared between multiple instances. In production you'd use a Redis store.
- Middleware order matters: logger, then security headers, then CORS, then body parsers, then routes, then the 404 handler, then the error handler.
- Kubernetes and Docker send SIGTERM before killing a container. Graceful shutdown means deploys don't cut off in-flight requests.

**Commit message**
```
feat(core): split app/server, validate env, add security middleware

- Move express setup to app.js; server.js only connects, listens and shuts down
- Validate environment variables with zod at startup (fail fast)
- Add helmet security headers and CORS with an origin allowlist and credentials
- Add global and auth-specific rate limiting (express-rate-limit)
- Limit JSON/urlencoded bodies to 10kb and gzip responses
- Graceful shutdown on SIGTERM/SIGINT with a 10s force-exit timeout
- Hide 5xx internals from clients and return a requestId instead
```

---

## Step 4: Logging, request IDs and health checks

**Files:** `src/config/logger.js` (new), `src/middleware/requestLogger.js` (new), `src/routes/healthRoutes.js` (new), `src/app.js`, `src/middleware/errorMiddleware.js`

**What it does**
- **Structured logging with pino.** Logs are JSON in production and pretty-printed in development. Every request gets one line with method, URL, status code and response time. 4xx responses log as `warn` and 5xx as `error`.
- **Secrets are redacted.** The `authorization` header, cookies, `password` and `token` fields are replaced with `[REDACTED]`. Tested: no password or JWT appears in the logs.
- **Request IDs.** Every response has an `X-Request-Id` header. An incoming ID is reused if valid, otherwise a new UUID is generated. `req.log` includes the ID on every line, and 500 responses return it.
- **Health checks** (not rate limited, not logged):
  - `GET /health` (liveness): the process is up.
  - `GET /health/ready` (readiness): runs `SELECT 1` and returns `503` if the database is down.

**Interview points**
- Why JSON logs: log tools such as Datadog, CloudWatch or Loki can filter on fields like `statusCode >= 500`. Free text can only be grepped.
- Why pino over `console.log`: it's fast, has log levels, and supports structured fields and redaction.
- A request ID connects the frontend error, the API log and downstream services. It's the basis of distributed tracing.
- Liveness vs readiness: a failing liveness check means "restart me". A failing readiness check means "stop sending me traffic", for example while the database is down, without restarting.

**Commit message**
```
feat(observability): structured logging, request ids and health checks

- Add pino logger (JSON in prod, pretty in dev, silent in test) with secret redaction
- Log one line per request with status-based level via pino-http
- Generate or propagate X-Request-Id and expose it on every response
- Add GET /health (liveness) and GET /health/ready (database readiness)
```

---

## Step 5: Auth and watchlist hardening

**Files:** `src/validators/authValidators.js` (new), `src/validators/watchlistValidators.js` (new), `src/controllers/authController.js`, `src/controllers/watchlistController.js`, `src/middleware/authMiddleware.js`, `src/routes/authRoutes.js`, `src/routes/watchlistRoutes.js`

**What it does**
- **Auth:**
  - Register and login are validated with zod.
  - Emails are trimmed and lowercased.
  - Passwords need 8–72 characters with an uppercase letter, a lowercase letter and a number.
  - Duplicate register returns `409`, and login now returns `200` instead of `201`.
  - Login runs bcrypt even when the email doesn't exist, using a dummy hash, so response time doesn't reveal which emails are registered (tested: about 550ms in both cases). Wrong email and wrong password return the same message.
  - bcrypt cost raised from 10 to 12. Old hashes still verify because the cost is stored inside each hash.
  - New `GET /auth/me` returns the logged-in user.
- **Auth middleware fixes:**
  - Invalid or expired tokens return `401` instead of `400`.
  - Database errors are no longer reported as "token failed".
  - `req.user` no longer includes the password hash.
  - The header must be exactly `Bearer <token>`.
- **Watchlist:**
  - All routes are validated. Status is case-insensitive, rating is 1–10, notes up to 500 characters, and `userId` can't be sent in the body.
  - New `GET /watchlist?status=&sortBy=&order=&page=&limit=` is paginated and includes movie details.
  - New `PATCH /watchlist/:movieId` changes status, rating or notes. `null` clears a rating or notes.
  - New `GET /watchlist/stats` returns counts per status and the average rating, using `groupBy` and `aggregate`.
  - Adding a duplicate returns `409` instead of `400`.
  - Removed the stray `POST /watchlist/logout`. Logout is `POST /auth/logout`.

**Interview points**
- Use 401 when we don't know who you are (missing, invalid or expired token). Use 403 when we know you but you're not allowed, for example editing someone else's movie. Use 409 for a conflict with existing data.
- User enumeration: identical messages and identical timing for "no such user" and "wrong password".
- The check-then-insert race: two simultaneous registers both pass the "exists?" check. The unique index is the real guarantee. Prisma raises P2002, which becomes a 409.
- bcrypt is slow on purpose, with an adjustable cost factor and a built-in salt. Never use a fast hash like SHA-256 for passwords.
- Never trust ownership fields from the client. `userId` always comes from the token.
- N+1 problem: loading 20 watchlist items and then each movie separately is 21 queries. `include` does it in 2.
- Aggregations belong in the database (`GROUP BY`, `AVG`), not in JavaScript loops over every row.
- httpOnly cookie vs localStorage: JavaScript can't read an httpOnly cookie, which protects against XSS. `sameSite=strict` protects against CSRF.

**Commit message**
```
feat(auth,watchlist): validate inputs, harden auth, add watchlist read/update/stats

- Validate register/login with zod; normalise emails; enforce password policy
- Prevent user enumeration (same message + constant-time dummy bcrypt compare)
- Return 401 for invalid/expired tokens and keep password hash out of req.user
- Add GET /auth/me and rate-limit login/register
- Validate all watchlist routes; add paginated GET /watchlist with movie details
- Add PATCH /watchlist/:movieId and GET /watchlist/stats (groupBy + aggregate)
- Use 409 for duplicates; remove stray logout route from watchlist router
```

---

## Coming next
- Step 6: database indexes + `EXPLAIN ANALYZE` (before/after numbers)
- Step 7: caching
- Step 8: automated tests (Jest + Supertest)
- Step 9: README, API docs and interview Q&A sheet
