# ADR-001: Zero External Dependencies

**Status:** Accepted
**Date:** 2026-03-31
**Deciders:** Project owner + Copilot design session

## Context

The Nagara ecosystem follows a zero-dependency principle across all three projects: the website ([ADR-001](https://github.com/skiotha/character-builder/blob/main/docs/decisions/001-zero-dependencies.md)), the WoW addon ([ADR-001](https://github.com/skiotha/nagara-addon/blob/main/docs/decisions/001-zero-dependencies.md)), and this Discord bot.

Discord bots are commonly built with `discord.js` (or similar libraries), which brings a large dependency tree. For Malizia, this is unnecessary:

- The Discord Gateway is a WebSocket connection with a JSON protocol. Node.js 24 has native `WebSocket` support.
- The Discord REST API is simple HTTP with `Authorization: Bot <token>`. Node.js has native `fetch`.
- The bot serves a small, closed group (~5–15 users). No need for sharding, voice support, or the full breadth of a framework.

## Decision

Malizia will carry **zero npm runtime dependencies**.

| Need                | Solution                                   |
| ------------------- | ------------------------------------------ |
| Discord Gateway     | Native `WebSocket`                         |
| Discord REST API    | Native `fetch` with `Bot` token auth       |
| Website data reads  | `node:fs/promises` (direct file access)    |
| Website API writes  | Native `fetch`                             |
| Dice parsing        | Custom parser (~60 LOC)                    |
| i18n                | In-memory string tables, `t()` helper      |
| Types               | TypeScript via `--experimental-strip-types`|
| Testing             | `node:test` + `node:assert`                |

`@types/node` is the sole `devDependency`.

## Consequences

- **Positive:** No `node_modules` at runtime. No supply-chain risk. Consistent with sibling projects' convention.
- **Positive:** Full understanding and control of the Discord connection lifecycle (heartbeat, identify, resume, reconnect).
- **Positive:** Minimal footprint — the entire bot is a handful of small TypeScript files.
- **Negative:** Must implement Gateway heartbeat/resume logic by hand (~150 LOC). Already done and working.
- **Negative:** No access to discord.js utilities (permission calculators, embed builders, cache). Acceptable — the bot's scope is narrow and the Discord API structures are used directly.
