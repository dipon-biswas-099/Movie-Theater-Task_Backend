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
