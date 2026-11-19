# Doomsday Ready API

NestJS API for planning MCU prerequisite rewatches and calculating exact cinema
opening-night bundle quotes.

## Run

```bash
npm install
npm run start:dev
```

The API is available at `http://localhost:3000/api`. Run `npm test` for unit
tests and `npm run test:e2e` for end-to-end tests.

## API

- `POST /movies`, `GET /movies`, `PATCH /movies/:id`
- `GET /movies/:id/rewatch-order`
- `POST /cinemas`, `GET /cinemas`
- `GET /cinemas/:id/booking?groupSize=6`

Data is intentionally in-memory for this small challenge, so it resets when
the server restarts. Rewatch ordering uses a hand-written depth-first
dependency traversal and topological sort. Booking quotes use a hand-written
dynamic-programming solution that minimizes bundles while requiring an exact
seat total.

AI tools were used to inspect the starter project, identify edge cases, and
review the implementation. The feature logic and validation were written
specifically for this application without libraries that solve either feature.

Where the brief did not specify a range for release years, this implementation
accepts any positive integer. Duplicate prerequisite IDs and duplicate bundle
sizes are rejected because each represents redundant input.



# 🌍 Doomsday Ready

> Plan your MCU rewatch before *Avengers: Doomsday* and book opening-night watch parties — all in one app.

---

## Quick Start

### One command with Docker

```bash
# From the repo root
docker compose up --build
```

| Service  | URL                        |
|----------|---------------------------|
| Frontend | http://localhost:5173      |
| Backend  | http://localhost:3000/api  |

### Manual (dev mode)

```bash
# Terminal 1 — Backend
cd backend
npm install
npm run start:dev      # http://localhost:3000

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev            # http://localhost:5173
```

---

## Data Model

```
┌──────────────────────────────┐       ┌───────────────────────────────┐
│            Movie             │       │            Cinema              │
├──────────────────────────────┤       ├───────────────────────────────┤
│ id              : string     │       │ id          : string           │
│ title           : string     │       │ name        : string  (unique) │
│ releaseYear     : number     │       │ bundleSizes : number[]         │
│ runtimeMinutes  : number     │       │             (1–10 entries,     │
│ prerequisiteIds : string[]   │       │              each 1–500)       │
│ watched         : boolean    │       └───────────────────────────────┘
└──────────────┬───────────────┘
               │ self-referential
               │ (prerequisiteIds are
               │  IDs of other Movies)
               ▼
        Movie ──▶ Movie ──▶ Movie
        (forms a DAG — no cycles allowed)
```

### Entity Relationship (ERD)

```
Movie
  ● id              PK  string (UUID)
  ● title               string  — UNIQUE
  ● releaseYear         integer — > 0
  ● runtimeMinutes      integer — 1..300
  ● watched             boolean — default false
  ● prerequisiteIds     string[] FK → Movie.id  (many-to-many self-join, DAG)

Cinema
  ● id              PK  string (UUID)
  ● name                string  — UNIQUE
  ● bundleSizes         integer[] — 1..10 entries, each 1..500
```

### Dependency Graph (example data)

```
Iron Man ──────────────────────────┐
                                   ▼
CA: First Avenger ─────────────► The Avengers ──► CA: Civil War ──┐
                                                                   ▼
Thor: Ragnarok ─────────────────────────────────────────► Avengers: Infinity War ──► Avengers: Endgame ──► Avengers: Doomsday
```

---

## Features

### Feature 1 — Movies & Rewatch Order

| Endpoint                        | Purpose                         |
|---------------------------------|--------------------------------|
| `POST   /api/movies`            | Create a movie                  |
| `GET    /api/movies`            | List all movies                 |
| `PATCH  /api/movies/:id`        | Update movie (incl. watched, prerequisites) |
| `GET    /api/movies/:id/rewatch-order` | Topological rewatch order |

**Circular dependency detection** — hand-rolled DFS cycle check (no library).  
Every `create` or `update` that would form a cycle returns:

```json
{ "statusCode": 409, "error": "CIRCULAR_DEPENDENCY" }
```

**Rewatch order** — Kahn's topological sort algorithm (no library).  
Returns:
```json
{
  "order": [ ...Movie[] ],
  "watchedCount": 4,
  "unwatchedRuntimeMinutes": 321
}
```

### Feature 2 — Cinemas & Booking

| Endpoint                                     | Purpose              |
|----------------------------------------------|---------------------|
| `POST   /api/cinemas`                        | Create a cinema      |
| `GET    /api/cinemas`                        | List all cinemas     |
| `GET    /api/cinemas/:id/booking?groupSize=N` | Booking quote        |

**Booking algorithm** — dynamic programming (unbounded coin-change variant, no library).  
Finds the **fewest bundles** that sum exactly to `groupSize`.  
Returns either `{ possible: true, totalBundles: N, breakdown: { "5": 2, "2": 1 } }` or `{ possible: false }`.

### Feature 3 — React Frontend

Three pages:

| Page          | Route       | What it does |
|---------------|-------------|-------------|
| Movies        | `/`         | Add movies, edit prerequisites, tick watched |
| Rewatch Plan  | `/rewatch`  | Pick target → see ordered list + progress bar + remaining time |
| Booking       | `/booking`  | Pick cinema + group size → see bundle breakdown |

---

## Tech Stack

| Layer    | Technology |
|----------|-----------|
| Backend  | NestJS 12 (TypeScript, ESM), in-memory storage (Map) |
| Frontend | React 19, Vite, Redux Toolkit, Axios, React Router v6 |
| Styling  | Pure CSS — dark MCU-inspired theme (no CSS framework) |
| Infra    | Docker Compose (backend + nginx-served frontend) |

---

## Project Structure

```
job task/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   └── src/
│       ├── main.ts                    ← CORS + global /api prefix
│       ├── app.module.ts              ← imports Movies + Cinemas modules
│       ├── movies/
│       │   ├── movie.entity.ts        ← Movie interface
│       │   ├── movie.dto.ts           ← CreateMovieDto / UpdateMovieDto
│       │   ├── movies.service.ts      ← DFS cycle check + Kahn's toposort + DP booking
│       │   ├── movies.controller.ts   ← REST handlers
│       │   └── movies.module.ts
│       └── cinemas/
│           ├── cinema.entity.ts       ← Cinema interface
│           ├── cinema.dto.ts          ← CreateCinemaDto
│           ├── cinemas.service.ts     ← DP coin-change booking
│           ├── cinemas.controller.ts  ← REST handlers
│           └── cinemas.module.ts
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    └── src/
        ├── main.jsx                   ← Redux Provider + BrowserRouter
        ├── App.jsx                    ← Nav + Routes
        ├── index.css                  ← Dark MCU theme
        ├── api/
        │   └── axios.js               ← Axios instance → localhost:3000/api
        ├── store/
        │   ├── index.js               ← configureStore
        │   ├── moviesSlice.js         ← fetchMovies, createMovie, updateMovie, fetchRewatchOrder
        │   └── cinemasSlice.js        ← fetchCinemas, createCinema, fetchBookingQuote
        ├── pages/
        │   ├── MoviesPage.jsx
        │   ├── RewatchPage.jsx
        │   └── BookingPage.jsx
        └── components/
            ├── MovieForm.jsx
            ├── MovieCard.jsx
            ├── PrerequisiteEditor.jsx
            ├── RewatchList.jsx
            ├── ProgressBar.jsx
            ├── CinemaForm.jsx
            └── BookingResult.jsx
```

---

## API Examples

### Create a movie
```bash
curl -X POST http://localhost:3000/api/movies \
  -H "Content-Type: application/json" \
  -d '{"title":"Iron Man","releaseYear":2008,"runtimeMinutes":126}'
```

### Set prerequisites
```bash
curl -X PATCH http://localhost:3000/api/movies/<id> \
  -H "Content-Type: application/json" \
  -d '{"prerequisiteIds":["<iron-man-id>","<cap-id>"]}'
```

### Get rewatch order
```bash
curl http://localhost:3000/api/movies/<doomsday-id>/rewatch-order
```

### Create a cinema
```bash
curl -X POST http://localhost:3000/api/cinemas \
  -H "Content-Type: application/json" \
  -d '{"name":"Odeon West End","bundleSizes":[2,5]}'
```

### Get booking quote
```bash
curl "http://localhost:3000/api/cinemas/<id>/booking?groupSize=11"
# → { "possible": true, "totalBundles": 4, "breakdown": { "5": 1, "2": 3 } }
```

---

## Design Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Storage | In-memory `Map` | No database setup required; data resets on restart |
| Cycle detection | Hand-rolled DFS | Required by spec — no library |
| Topological sort | Kahn's BFS algorithm | Clean iterative approach, easy to follow |
| Booking algorithm | DP (coin-change) | Required by spec — classic exact-change variant |
| Frontend state | Redux Toolkit | Requested in spec; `createAsyncThunk` keeps API calls clean |
| CSS | Pure CSS variables | No framework — dark MCU red/navy palette |
| Docker frontend | nginx | Serves Vite build as static files; proxies `/api` to backend |

---

## How AI Was Used

This project was built with the assistance of **Google Antigravity (AI agent)**:

- **Code generation**: The agent wrote the initial NestJS modules (entities, DTOs, controllers, services) and all React components based on the spec.
- **Algorithm logic**: The DFS cycle detection, Kahn's topological sort, and DP coin-change algorithm were specified by the developer and implemented by the agent — the developer reviewed and verified correctness against the spec's example cases.
- **CSS styling**: The agent generated the dark MCU theme; the developer reviewed for consistency.
- **Docker setup**: Dockerfiles and docker-compose were generated by the agent and reviewed by the developer.
- **What was not AI-generated**: The overall architecture decisions, algorithm choices (DFS vs BFS for cycle detection, Kahn's vs DFS-postorder for toposort, coin-change DP for booking), and all final reviews/corrections were made by the developer.
