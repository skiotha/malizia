# ADR-002: Direct File Access for Character Data

**Status:** Accepted
**Date:** 2026-03-31
**Deciders:** Project owner + Copilot design session

## Context

The bot needs to read character data from the website. Two approaches:

1. **HTTP API** — call the website's REST endpoints (`GET /api/v1/characters`).
2. **Direct filesystem** — read the website's JSON data files from disk.

The bot and the website run on the **same VPS** as two separate Node.js processes. The website stores characters as individual JSON files in `data/characters/<uuid>.json` with a `data/index.json` lookup table.

## Decision

The bot reads character data **directly from the website's data directory** via `node:fs/promises`. All write operations go through the website's HTTP API.

### Reads (filesystem)

- `index.json` — character search by name, Discord ID lookup
- `characters/<uuid>.json` — full character data for display
- No network overhead. No auth required. Always fresh (reads the same file the website just wrote).
- The path is configured via the `WEBSITE_DATA_DIR` environment variable.

### Writes (HTTP API)

- `PATCH /api/v1/characters/:id` — character updates
- Must go through the API because the website:
  1. Validates updates against the schema and permissions
  2. Recalculates derived stats (toughness, defense, thresholds)
  3. Broadcasts changes to SSE-connected browser clients
  4. Maintains index consistency

### What This Means

- The bot depends on the website's data directory structure. If the website changes how it stores characters, the bot must be updated.
- The bot must handle the case where a character file is being written to by the website at the moment the bot reads it. In practice, Node.js `writeFile` is atomic on Linux (write-to-temp + rename), so partial reads are not expected.
- The bot does not cache character data in memory — it reads from disk on each request. For a small group of users this is instantaneous and guarantees freshness.

## Alternatives Considered

### API-only (rejected for reads)

Using the HTTP API for reads would require:
- Auth headers on every request (the bot would need its own identity)
- Network round-trip to localhost (negligible latency, but unnecessary)
- A character search endpoint that doesn't exist yet

Direct filesystem access avoids all of this. The data is right there.

### Shared database (not applicable)

The website uses file-based JSON storage, not a database. There is no shared database to connect to. This decision is the filesystem equivalent of "connect to the same database."

## Consequences

- **Positive:** Zero-latency reads. No auth complexity for read operations. No need to build new API endpoints for search.
- **Positive:** Name search works immediately by scanning `index.json` — no website endpoint required.
- **Positive:** The bot always sees the latest data (no cache staleness).
- **Negative:** Tight coupling to the website's file layout. If the website  restructures its data directory (planned in website Phase 1), the bot's `WEBSITE_DATA_DIR` path must be updated.
- **Negative:** The bot must be deployed on the same machine as the website. If they are ever separated, reads must switch to the HTTP API. This decision is documented so the migration path is clear.
- **Mitigation:** The filesystem access is isolated in `src/lib/characters.mts`. Switching to API-based reads would only require changing that one module.
