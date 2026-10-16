# Movie Watchlist API

A REST API for browsing movies and keeping a personal watchlist, built with **Express 5**, **Prisma 7** and **PostgreSQL**.

Users can register and log in, add movies, and track each movie on their own watchlist with a status, rating and notes.

## Tech stack

- **Express 5**: HTTP server and routing
- **Prisma 7** (`@prisma/adapter-pg`): ORM and migrations for PostgreSQL
- **Zod 4**: validation for request bodies, params, query strings and environment variables
- **JWT** (`jsonwebtoken`) + **bcryptjs**: authentication and password hashing
- **Helmet**, **CORS**, **express-rate-limit**, **compression**: security and performance middleware
- **Pino** / **pino-http**: structured request logging with request ids

## Features

- **Auth**: register, login, logout and `me`. The JWT is sent as an `httpOnly` cookie and can also be passed as `Authorization: Bearer <token>`.
- **Movies**: public listing and detail routes. Logged-in users can create movies, and only the creator can update or delete one.
- **Filtering and sorting**: text search, genre, year and runtime ranges, and sorting by an allowlisted set of fields.
- **Pagination**: offset (`page`) or cursor (`cursor`) pagination, with a stable sort order (`id` breaks ties).
- **Watchlist**: add, list, update and remove items, filter them by status, and get per-user stats (counts per status and average rating).
- **Validation**: every route checks its input with a Zod schema, and errors come back in one consistent JSON format.
- **Security**: security headers, a CORS allowlist, a global rate limit, a stricter limit on failed login/register attempts, and a 10kb body size limit.
- **Production readiness**: env vars are validated at startup, `/health` and `/health/ready` endpoints are included, the server shuts down gracefully on SIGTERM/SIGINT, and a global error handler keeps internal details out of responses.

## Getting started

### Prerequisites

- Node.js 20+
- A PostgreSQL database

### Setup

```bash
npm install
cp .env.example .env      # then fill in DATABASE_URL and JWT_SECRET
npx prisma migrate dev    # apply migrations and generate the Prisma client
npm run seed              # optional: seed user + 20,000 generated movies
npm run dev
```

The server runs on `http://localhost:5001` by default.

### Scripts

| Script          | Description                                                        |
| --------------- | ------------------------------------------------------------------ |
| `npm run dev`   | Start with nodemon (auto-restart on changes)                       |
| `npm start`     | Start with node                                                    |
| `npm run seed`  | Seed the database (`npm run seed -- 5000` sets the movie count)    |

Seed user login: `seed@moviewatchlist.dev` / `Password123!`

### Environment variables

| Variable         | Required | Default                                       | Description                                              |
| ---------------- | -------- | --------------------------------------------- | -------------------------------------------------------- |
| `DATABASE_URL`   | yes      |                                               | PostgreSQL connection string                             |
| `JWT_SECRET`     | yes      |                                               | At least 32 characters                                   |
| `JWT_EXPIRES_IN` | no       | `7d`                                          | Token lifetime                                           |
| `NODE_ENV`       | no       | `development`                                 | `development` \| `test` \| `production`                  |
| `PORT`           | no       | `5001`                                        | HTTP port                                                |
| `CORS_ORIGINS`   | no       | `http://localhost:3000,http://localhost:5173` | Comma-separated list of allowed frontend origins         |
| `TRUST_PROXY`    | no       | `0`                                           | Number of proxies in front of the app (`1` behind nginx/Render/Heroku) |
| `LOG_LEVEL`      | no       | `info`                                        | `fatal` \| `error` \| `warn` \| `info` \| `debug` \| `trace` \| `silent` |

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## API

🔒 = requires authentication

### Health

| Method | Route           | Description                                   |
| ------ | --------------- | --------------------------------------------- |
| GET    | `/health`       | Liveness check (process is up)                |
| GET    | `/health/ready` | Readiness check (database is reachable)       |

### Auth

| Method | Route            | Description                  |
| ------ | ---------------- | ---------------------------- |
| POST   | `/auth/register` | Create an account            |
| POST   | `/auth/login`    | Log in and get the JWT cookie |
| POST   | `/auth/logout`   | Clear the JWT cookie         |
| GET    | `/auth/me` 🔒    | Get the current user         |

Passwords need 8–72 characters, including a lowercase letter, an uppercase letter and a number.

### Movies

| Method | Route          | Description                       |
| ------ | -------------- | --------------------------------- |
| GET    | `/movies`      | List movies (filter, sort, paginate) |
| GET    | `/movies/:id`  | Get one movie                     |
| POST   | `/movies` 🔒   | Create a movie                    |
| PUT    | `/movies/:id` 🔒 | Update a movie (creator only)   |
| DELETE | `/movies/:id` 🔒 | Delete a movie (creator only)   |

Query parameters for `GET /movies`:

| Param                       | Description                                                         |
| --------------------------- | ------------------------------------------------------------------- |
| `search`                    | Case-insensitive match on title or overview (at least 2 characters) |
| `genres`                    | `?genres=Drama,Crime` or `?genres=Drama&genres=Crime` (matches any) |
| `minYear`, `maxYear`        | Release year range                                                  |
| `minRuntime`, `maxRuntime`  | Runtime range in minutes                                            |
| `sortBy`                    | `createdAt` (default), `title`, `releaseYear`, `runtime`            |
| `order`                     | `asc` or `desc` (default)                                           |
| `page`                      | Offset pagination (cannot be combined with `cursor`)                |
| `cursor`                    | Cursor pagination: the id of the last movie on the previous page    |
| `limit`                     | Page size, 1–100 (default 20)                                       |

Example:

```
GET /movies?search=star&genres=sci-fi&minYear=1990&sortBy=releaseYear&order=asc&limit=10
```

### Watchlist 🔒

| Method | Route                 | Description                                    |
| ------ | --------------------- | ---------------------------------------------- |
| GET    | `/watchlist`          | List your watchlist                            |
| GET    | `/watchlist/stats`    | Counts per status and average rating           |
| POST   | `/watchlist`          | Add a movie (`movieId`, optional `status`, `rating`, `notes`) |
| PATCH  | `/watchlist/:movieId` | Update status, rating or notes (`null` clears rating/notes) |
| DELETE | `/watchlist/:movieId` | Remove a movie from your watchlist             |

- `status`: `PLANNED` (default), `WATCHING`, `COMPLETED`, `DROPPED`
- `rating`: 1–10
- `GET /watchlist` query params: `status`, `page`, `limit`, `sortBy` (`createdAt`, `updatedAt`, `rating`), `order`

### Error format

All errors return JSON:

```json
{ "error": "Validation failed.", "details": [{ "field": "body.email", "message": "Enter a valid email." }] }
```

Server errors (5xx) return a generic message with a `requestId`, which you can use to find the matching log line.

## Data model

```
User 1───* Movie            (createdBy)
User 1───* WatchlistItem *───1 Movie
```

- `WatchlistItem` is unique per `(userId, movieId)`.
- When a user or movie is deleted, its related records are deleted too (cascade).

## Project structure

```
src/
├── app.js            # Express app and middleware order (no listen, so tests can import it)
├── server.js         # Starts the server, DB connection, graceful shutdown
├── config/           # env validation, Prisma client, logger
├── constants/        # genres, sort fields, page limits
├── controllers/      # route handlers
├── middleware/       # auth, validation, security, logging, errors
├── prisma/           # schema, migrations, seed
├── routes/           # health, auth, movies, watchlist
├── utils/            # JWT helper, movie filter/sort builders
└── validators/       # Zod schemas per resource
```
