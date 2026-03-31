# Malizia — Architecture

> Living document. Updated as the design evolves.

## 1. Overview

Malizia is a Discord bot for the Nagara tabletop RPG system. It provides dice rolling, rules/ability lookup, and character referencing directly in Discord chat. It is one of three sibling projects sharing the same RPG data and conventions:

- **character-builder** (website) — canonical long-term store for character data. Web application for creating and managing characters.
- **Nagara** (WoW addon) — session-time consumer and editor of character data inside the World of Warcraft client.
- **malizia** (this project) — Discord bot. Quick reference, dice rolls, and (planned) live gameplay support.

The bot and the website run on the **same VPS**. This co-location is a deliberate architectural choice (see [ADR-002](decisions/002-direct-file-access.md)): the bot reads character data directly from the website's filesystem, avoiding HTTP round-trips for all read operations. Write operations go through the website's API so that validation, derived-stat recalculation, and SSE broadcasts are handled by the website's existing pipeline.

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Malizia Discord Bot (this project)              │
│                                                                     │
│  ┌────────────┐  ┌────────────┐  ┌───────────────────────────────┐  │
│  │  Gateway   │  │   Events   │  │         Commands              │  │
│  │  (WS)      │──│  dispatch  │──│  /roll  /lookup  /character   │  │
│  └────────────┘  └────────────┘  └──────────────┬────────────────┘  │
│                                                 │                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────┴─────┐             │
│  │  REST    │  │  Dice    │  │  i18n    │  │  Format  │             │
│  │ (Discord)│  │  Engine  │  │  (en/ru) │  │  (embeds)│             │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘             │
│                                                                     │
│  ┌──────────────────────┐  ┌───────────────────────────────┐        │
│  │  Data (abilities)    │  │  Components (button handlers) │        │
│  │  (per-locale JSON)   │  │  (prefix registry)            │        │
│  └──────────────────────┘  └───────────────────────────────┘        │
└──────────┬────────────────────────────────────────┬─────────────────┘
           │                                        │
WebSocket  │                              fs reads  │  HTTP writes
(outbound) │                              (local)   │  (localhost)
           ▼                                        ▼
┌─────────────────────┐            ┌───────────────────────────────────┐
│   Discord Gateway   │            │   Nagara Website (same VPS)       │
│   + REST API        │            │                                   │
│   (discord.com)     │            │   data/characters/*.json  (read)  │
│                     │            │   data/index.json         (read)  │
└─────────────────────┘            │   PATCH /api/v1/...       (write) │
                                   └───────────────────────────────────┘
```

## 2. Stack

| Layer     | Technology                         | Notes                                                                                |
| --------- | ---------------------------------- | ------------------------------------------------------------------------------------ |
| Runtime   | Node.js 24+                        | Native TypeScript via `--experimental-strip-types`                                   |
| Discord   | Native `WebSocket` + `fetch`       | Zero dependencies, no discord.js (see [ADR-001](decisions/001-zero-dependencies.md)) |
| Data Read | `node:fs/promises`                 | Direct reads from website's JSON data directory                                      |
| Data Write| Native `fetch`                     | HTTP calls to the website's REST API                                                 |
| Types     | TypeScript (`.mts`, `noEmit`)      | Type-checked, not compiled                                                           |
| Tests     | `node:test` + `node:assert`        | Mirrors website and addon conventions                                                |

## 3. Layer Responsibilities

### 3.1 Gateway (`src/lib/gateway.mts`)

Manages the WebSocket connection to Discord's Gateway API.

- Connects to `wss://gateway.discord.gg`
- Handles the heartbeat/identify/resume lifecycle
- Reconnects automatically on disconnection
- Emits `dispatch` events consumed by the events layer

### 3.2 REST (`src/lib/rest.mts`)

Thin `fetch` wrapper for the Discord REST API.

- All requests carry `Authorization: Bot <token>`
- Used for interaction responses (followups, edits) and command registration
- Not used for character data — that goes through filesystem or website API

### 3.3 Events (`src/events/`)

Event handlers dispatched by the Gateway.

| Handler                | Trigger                       | Purpose                                              |
| ---------------------- | ----------------------------- | ---------------------------------------------------- |
| `ready`                | `READY` dispatch              | Log successful connection                            |
| `interactionCreate`    | `INTERACTION_CREATE` dispatch | Route to command, autocomplete, or component handler |

Interaction routing by type:
- **Type 2** (Application Command) → look up command by name, call `execute()`
- **Type 3** (Message Component) → resolve via component registry, call handler
- **Type 4** (Autocomplete) → look up command by name, call `autocomplete()`

### 3.4 Commands (`src/commands/`)

One file per command. Each exports a `Command` object with:

- `data` — Discord slash command definition (name, description, options, localizations)
- `execute(ctx)` — handler receiving `CommandContext`
- `autocomplete(ctx)` — optional, handler receiving `AutocompleteContext`

Current commands:

| Command      | Purpose                        | Status        |
| ------------ | ------------------------------ | ------------- |
| `/roll`      | Dice rolls for the RPG system  | Implemented   |
| `/lookup`    | Ability/spell search and display | Implemented |
| `/character` | Character reference lookup     | Stub (TODO)   |

Commands are registered in `src/commands/index.mts` and deployed to Discord
via `src/deploy.mts`.

### 3.5 Format (`src/format/`)

Presentation logic separated from command handlers. Each formatter builds
Discord embed objects, message strings, or component layouts.

| Module        | Purpose                                |
| ------------- | -------------------------------------- |
| `roll.mts`    | Dice roll result formatting            |
| `ability.mts` | Ability/spell embed construction       |

### 3.6 Lib — Core Modules (`src/lib/`)

| Module           | Purpose                                                      |
| ---------------- | ------------------------------------------------------------ |
| `dice.mts`       | Dice expression parsing and rolling                          |
| `data.mts`       | Ability data provider (per-locale JSON, search, get)         |
| `i18n.mts`       | Locale resolution, translation helper, string tables         |
| `components.mts` | Component interaction registry (prefix → handler map)        |
| `api.mts`        | `apiGet()` helper for the Nagara website API                 |
| `types.mts`      | Interfaces: `Command`, `CommandContext`, `Interaction`, etc. |
| `constants.mts`  | Discord API version, base URLs                               |

### 3.7 Static Data (`src/data/`)

Per-locale JSON files for ability/spell data. Read from disk on first access, then cached in memory for the lifetime of the process.

- `abilities.en.json`, `abilities.ru.json`

## 4. Data Flow

### 4.1 Slash Command Execution

```
Discord User
  │  /roll 2d6+3
  ▼
Discord Gateway (WebSocket)
  │  INTERACTION_CREATE dispatch
  ▼
interactionCreate event handler
  │  type 2 → find command "roll"
  ▼
roll.execute(ctx)
  │  parseDice("2d6+3") → rollDice() → formatRollReply()
  ▼
ctx.reply(formatted)
  │  POST /interactions/:id/:token/callback
  ▼
Discord shows result to user
```

### 4.2 Character Lookup (planned, Phase 1)

```
Discord User
  │  /character Iris
  ▼
character.autocomplete(ctx)
  │  read website data/index.json from disk
  │  filter by name match
  │  return choices
  ▼
character.execute(ctx)
  │  read website data/characters/<id>.json from disk
  │  formatCharacterEmbed(character, locale)
  ▼
ctx.reply(embed)
```

### 4.3 Character Update (planned, Phase 2)

```
Discord User
  │  /update toughness 8
  ▼
update.execute(ctx)
  │  resolve Discord user → website playerId
  │  build update payload
  ▼
apiPatch("/api/v1/characters/:id", payload, headers)
  │  x-player-id: <playerId>    (or x-dm-id for DM actions)
  ▼
Website validates, applies, recalculates, saves, broadcasts SSE
  ▼
ctx.reply(confirmation)
```

### 4.4 Component Interaction (buttons)

```
Discord User
  │  clicks "Share" button (custom_id = "lookup:share:ability-123")
  ▼
interactionCreate event handler
  │  type 3 → resolveComponent("lookup:share:ability-123")
  │  prefix "lookup:share" → handler, params ["ability-123"]
  ▼
handler(ctx)
  │  getAbility("ability-123", locale) → formatAbilityEmbed()
  ▼
ctx.reply(embed)  (public, not ephemeral)
```

## 5. Environment

Configuration is loaded via `--env-file-if-exists` from `config/`.

| Variable            | Purpose                                               | Required |
| ------------------- | ----------------------------------------------------- | -------- |
| `DISCORD_TOKEN`     | Bot authentication token                              | Yes      |
| `DISCORD_CLIENT_ID` | Application ID (for command registration)             | Yes      |
| `DISCORD_GUILD_ID`  | Dev guild (limits command registration to one server) | Dev only |
| `API_BASE_URL`      | Website URL for API calls and portrait URLs           | Yes      |
| `WEBSITE_DATA_DIR`  | Path to website's `data/` directory                   | Planned  |
| `NAGARA_DM_TOKEN`   | DM auth token (matches website's `NAGARA_DM_TOKEN`)   | Planned  |
| `DISCORD_DM_IDS`    | Comma-separated Discord user IDs with DM privileges   | Planned  |
