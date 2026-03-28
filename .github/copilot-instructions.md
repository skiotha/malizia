# Malizia

Discord bot for the Nagara RPG system: dice rolling, character references, and rules/world lookups.

## Stack

- TypeScript running natively on Node.js >= 24 (no transpilation)
- Zero runtime dependencies — Discord Gateway and REST API are accessed via native `WebSocket` and `fetch`
- ESM only, `.mts` file extensions throughout

## Dev Commands

```bash
npm run start:dev    # run bot with --watch, loads config/malizia.development.env
npm run deploy:dev   # register slash commands to the dev guild
npm run typecheck    # type-check without emitting
npm test             # run tests with node:test
```

## Architecture

- **`src/index.mts`** — entry point; creates `Gateway` and `DiscordRest` instances, registers events, connects to Discord
- **`src/deploy.mts`** — one-shot script to register slash commands via the REST API (guild-scoped if `DISCORD_GUILD_ID` is set, global otherwise)
- **`src/lib/gateway.mts`** — `Gateway` class; manages the WebSocket connection to Discord (heartbeat, identify, resume, reconnect), emits `dispatch` events
- **`src/lib/rest.mts`** — `DiscordRest` class; thin `fetch` wrapper for Discord REST API with `Bot` token auth
- **`src/lib/api.mts`** — `apiGet()` helper for querying the external Nagara RPG web-server
- **`src/lib/types.mts`** — `Command`, `CommandContext`, `AutocompleteContext`, `ComponentContext`, `Interaction`, and related interfaces
- **`src/lib/dice.mts`** — dice parsing and rolling helpers (`parseDice`, `rollDice`, `DiceGroup`, `RollResult`, `Check`, `CheckOperator`, `ParsedExpression`)
- **`src/lib/i18n.mts`** — `Locale` type, `resolveLocale()` (user-first, guild-fallback), `t(locale, key, params?)` translation helper, and string tables for `en`/`ru`
- **`src/lib/data.mts`** — data provider for RPG ability lookup; `searchAbilities(query, locale)` and `getAbility(id, locale)` with per-locale JSON cache
- **`src/lib/components.mts`** — centralized component interaction registry; `registerComponent(prefix, handler)` and `resolveComponent(customId)`
- **`src/lib/constants.mts`** — shared constants (Discord API version, base URLs)
- **`src/commands/`** — one file per command, each exporting a `Command` (data + execute + optional autocomplete); registered in `index.mts`
- **`src/events/`** — event handlers dispatched by the gateway; registered in `index.mts`; handles interaction types 2 (command), 3 (component), and 4 (autocomplete)
- **`src/format/`** — formatting/presentation functions separated from command logic (e.g. `ability.mts`, `roll.mts`)
- **`src/data/`** — static data files per locale (e.g. `abilities.en.json`, `abilities.ru.json`)

## Module Import Aliases

Defined in `package.json` `"imports"`:

| Alias             | Resolves to              |
| ----------------- | ------------------------ |
| `#commands`       | `src/commands/index.mts` |
| `#events`         | `src/events/index.mts`   |
| `#api`            | `src/lib/api.mts`        |
| `#types`          | `src/lib/types.mts`      |
| `#gateway`        | `src/lib/gateway.mts`    |
| `#rest`           | `src/lib/rest.mts`       |
| `#constants`      | `src/lib/constants.mts`  |
| `#dice`           | `src/lib/dice.mts`       |
| `#data`           | `src/lib/data.mts`       |
| `#components`     | `src/lib/components.mts` |
| `#i18n`           | `src/lib/i18n.mts`       |
| `#format/ability` | `src/format/ability.mts` |
| `#format/roll`    | `src/format/roll.mts`    |

Always use these aliases for cross-module imports rather than relative paths. Add new aliases here as modules are created.

## Conventions

- Commands follow the `Command` interface from `#types`: a `data` object (matching Discord API slash command schema), an `execute` function receiving `CommandContext`, and an optional `autocomplete` function receiving `AutocompleteContext`
- New commands go in `src/commands/` and must be registered in `src/commands/index.mts`
- Component interaction handlers (buttons, select menus) are registered via `registerComponent(prefix, handler)` from `#components`; the `custom_id` format is `prefix:param1:param2`
- Formatting/presentation logic goes in `src/format/`, not in command files
- Event handlers go in `src/events/`
- Environment variables are loaded via `--env-file-if-exists` from `config/` — never use `dotenv` or similar packages
- Do not add npm dependencies unless absolutely necessary
- All user-facing strings use `t(locale, key, params?)` from `#i18n`; format functions and command handlers receive `locale: Locale` via context

## Testing

- Tests live in `test/` with a `.test.mts` extension
- Run via `npm test` (uses `node:test` + `node:assert` — no external test framework)
- Pure logic tests go in dedicated files (e.g. `test/dice.test.mts`)
- Command integration tests use a mock `CommandContext` and assert on `reply()` calls
- Use `mock.method(Math, 'random', () => value)` to pin randomness; call `mock.restoreAll()` after
