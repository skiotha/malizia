# Malizia — Data Contracts

> Data shapes the bot consumes and produces.
> The website owns the canonical character schema — see
> [character-builder/docs/data-contracts.md](https://github.com/skiotha/character-builder/blob/main/docs/data-contracts.md).

---

## 1. Character Data (Read — Filesystem)

The bot reads character data directly from the website's `data/` directory on the same VPS (see [ADR-002](decisions/002-direct-file-access.md)).

### 1.1 Index File

**Path:** `${WEBSITE_DATA_DIR}/index.json`

```jsonc
{
  "byId":         { "<uuid>": { "characterName": "...", "playerId": "...", ... } },
  "byBackupCode": { "<code>": "<uuid>" },
  "byPlayer":     { "<playerId>": ["<uuid>", ...] },
  "all":          ["<uuid>", ...]
}
```

The bot uses `byId` entries to search by character name (iterating values and matching `characterName`). When reading is needed, the bot resolves the UUID and reads the corresponding character file.

### 1.2 Character File

**Path:** `${WEBSITE_DATA_DIR}/characters/<uuid>.json`

Full character schema as defined in the website's
[data-contracts.md §1](https://github.com/skiotha/character-builder/blob/main/docs/data-contracts.md).

### 1.3 Fields the Bot Uses

| Bot Feature          | Fields Read                                         |
| -------------------- | --------------------------------------------------- |
| Character summary    | `characterName`, `attributes`, `experience`, `corruption`, `background.race`, `background.profession`, `tradition`, `location` |
| Portrait embed       | `portrait.path`, `portrait.dimensions`              |
| Attribute query      | `attributes.primary.*`, `attributes.secondary.*`    |
| Ability/trait list   | `traits`, `effects`                                 |
| Equipment reference  | `equipment.*`                                       |
| Session rolls        | `attributes.primary.*`, `effects` (modifier values) |
| Identity resolution  | `discordId` (planned), `playerId`                   |

---

## 2. Character Data (Write — HTTP API)

All mutations go through the website's existing REST API. The bot never writes to the filesystem directly.

### 2.1 Endpoint

```
PATCH /api/v1/characters/:id
Content-Type: application/json
```

### 2.2 Auth Headers

| Header        | Value                      | When                      |
| ------------- | -------------------------- | ------------------------- |
| `x-player-id` | Character's `playerId`     | Player updating own data  |
| `x-dm-id`     | `NAGARA_DM_TOKEN` env var  | DM updating any character |

The bot knows the `playerId` from the character file (it can read it from disk). The DM token is injected via environment variables.

### 2.3 Update Payload

Matches the website's update format
([data-contracts.md §3.5](https://github.com/skiotha/character-builder/blob/main/docs/data-contracts.md)):

```jsonc
{
  "updates": [
    { "field": "attributes.secondary.toughness.current", "value": 8 },
    { "field": "corruption.temporary", "value": 3 }
  ]
}
```

### 2.4 Fields the Bot Writes

**Player-accessible** (owner updating their own character):

| Field                                    | Purpose                   |
| ---------------------------------------- | ------------------------- |
| `attributes.secondary.toughness.current` | HP tracking during play   |
| `corruption.temporary`                   | Temporary corruption      |
| `equipment.*`                            | Inventory changes         |
| `background.journal.*`                   | Quest log updates         |
| `background.notes`                       | Player notes              |
| `location`                               | Current location          |

**DM-only** (requires `x-dm-id`):

| Field                  | Purpose                    |
| ---------------------- | -------------------------- |
| `experience.total`     | Award XP after quests      |
| `experience.unspent`   | Adjust available XP        |
| `corruption.permanent` | Permanent corruption       |
| `attributes.primary.*` | Attribute corrections      |
| `traits`               | Trait management           |
| `effects`              | Apply/remove effects       |

---

## 3. Portrait URLs

The bot constructs image URLs for Discord embeds:

```
${API_BASE_URL}/${portrait.path}
```

Discord fetches these URLs server-side when rendering embeds. The website must serve portrait files over HTTPS for Discord to accept them as embed images.

---

## 4. Identity Mapping (Planned)

Once the website adds `discordId` to the character schema (see [bot-integration.md](https://github.com/skiotha/character-builder/blob/main/docs/bot-integration.md) §3), the bot will resolve Discord users to characters:

```
Discord interaction.member.user.id
  → scan index.json for matching discordId
  → resolve character UUID
  → read character file
```

This enables:
- Players updating their own characters via bot commands
- DM targeting specific players' characters
- RP session auto-binding (character ↔ Discord user)

---

## 5. Ability Data

Ability/spell data is stored as static JSON files in `src/data/`. Read from disk on first access, then cached in memory for the lifetime of the process.

| File                 | Purpose                    |
| -------------------- | -------------------------- |
| `abilities.en.json`  | English ability/spell data |
| `abilities.ru.json`  | Russian ability/spell data |

Searched in-memory via `searchAbilities()` and `getAbility()` in `src/lib/data.mts`.

---

## 6. Discord Interaction Model

For reference, the key Discord interaction shapes the bot processes:

### 6.1 Interaction Object (inbound from Gateway)

```jsonc
{
  "id":           "string",
  "token":        "string",       // used to respond
  "type":         2 | 3 | 4,     // command | component | autocomplete
  "data": {
    "name":       "string",       // command name (type 2/4)
    "options":    [],             // command options
    "custom_id":  "string",       // component ID (type 3)
    "component_type": 2           // button (type 3)
  },
  "guild_id":     "string",
  "channel_id":   "string",
  "member": {
    "user": {
      "id":       "string"        // Discord user ID — used for identity
    }
  },
  "locale":       "string",      // user's Discord locale
  "guild_locale": "string"       // server's Discord locale
}
```

### 6.2 Response (outbound to Discord REST)

```
POST /api/v1/interactions/:id/:token/callback
{
  "type": 4,                     // CHANNEL_MESSAGE_WITH_SOURCE
  "data": {
    "content":    "string",
    "embeds":     [],
    "components": [],
    "flags":      64              // ephemeral (when set)
  }
}
```
