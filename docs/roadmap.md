# Malizia — Roadmap

> Multi-session work plan. Each phase is self-contained and leaves the
> project in a working state. Phases can span multiple sessions but
> should not be left half-finished.
>
> See also: [.github/ROADMAP.md](../.github/ROADMAP.md) for the summary.

---

## Phase 0 — Documentation & Decisions ✱ CURRENT

**Goal:** Cement what exists, why it exists, and what's planned — before
adding features.

- [x] `docs/architecture.md` — system overview, component diagram, layers
- [x] `docs/data-contracts.md` — character shapes, API usage, identity model
- [x] `docs/decisions/001-zero-dependencies.md`
- [x] `docs/decisions/002-direct-file-access.md`
- [x] `docs/roadmap.md` — this file
- [x] `.github/ROADMAP.md` — summary
- [x] `.github/copilot-instructions.md` — agent configuration (already existed)
- [x] `bot-integration.md` — requirements placed on the website
      (lives in [character-builder/docs/](https://github.com/skiotha/character-builder/blob/main/docs/bot-integration.md))

**Deliverable:** Complete reference documentation. Every subsequent phase has a written basis for its decisions.

---

## Phase 1 — Character Lookup (Read-Only)

**Goal:** The `/character` command fetches and displays character data. No website changes required — the bot reads directly from the website's data directory on the same VPS.

**Basis:** [ADR-002](decisions/002-direct-file-access.md)

### File Access Layer

- [ ] Add `WEBSITE_DATA_DIR` environment variable (path to the website's
      `data/` directory)
- [ ] `src/lib/characters.mts` — character data provider:
  - [ ] `loadIndex()` — read and parse `index.json`
  - [ ] `searchCharacters(query)` — name search against the index
  - [ ] `getCharacter(id)` — read and parse `characters/<id>.json`
- [ ] Add `#characters` import alias in `package.json`

### `/character` Command

- [ ] Expand `src/commands/character.mts`:
  - [ ] Autocomplete: search character names from the index, return top 25
  - [ ] Execute: fetch character by ID, format and display
  - [ ] Optional `field` parameter: narrow display to a specific field
        (e.g. `strong`, `portrait`, `experience`)
- [ ] Handle not-found gracefully (ephemeral error message)

### Character Formatting

- [ ] `src/format/character.mts` — Discord embed builders:
  - [ ] `formatCharacterSummary(character, locale)` — overview embed
        (name, race, profession, tradition, attributes, XP, corruption)
  - [ ] `formatCharacterPortrait(character, baseUrl)` — image embed
  - [ ] `formatCharacterAttribute(character, field, locale)` — single-field
        inline response
- [ ] Add `#format/character` import alias in `package.json`

### i18n

- [ ] Add string keys for character display:
  - [ ] `character.notFound`, `character.summary`, field labels, etc.
  - [ ] Russian translations for all new keys

### Tests

- [ ] `test/characters.test.mts` — character data provider tests:
  - [ ] Index loading and name search (with test fixture data)
  - [ ] Character file reading
  - [ ] Search edge cases (partial match, case-insensitive, no results)
- [ ] `test/character.test.mts` — command integration tests:
  - [ ] Summary display
  - [ ] Portrait embed
  - [ ] Attribute query
  - [ ] Not-found handling

**Deliverable:** `/character Iris` shows a character summary embed. `/character Iris portrait` shows the character's portrait image. `/character Iris strong` shows the Strong attribute value.

---

## Phase 2 — Identity & Write Operations

**Goal:** Link Discord users to their website characters. Enable players to update their own character data via bot commands.

**Depends on:** Website adding `discordId` to the character schema
(see [bot-integration.md §3](https://github.com/skiotha/character-builder/blob/main/docs/bot-integration.md)).

### Identity Resolution

- [ ] `src/lib/auth.mts` — identity module:
  - [ ] `resolveCharacter(discordUserId)` — scan index for matching `discordId`, return character data
  - [ ] `isDM(discordUserId)` — check against `DISCORD_DM_IDS` env var
- [ ] Add `#auth` import alias in `package.json`
- [ ] Add `DISCORD_DM_IDS` and `NAGARA_DM_TOKEN` to env config

### API Write Layer

- [ ] Expand `src/lib/api.mts`:
  - [ ] `apiPatch(path, payload, headers)` — PATCH with auth headers
  - [ ] Auth header injection helper (sets `x-player-id` or `x-dm-id`)

### `/update` Command

- [ ] `src/commands/update.mts` — player character updates:
  - [ ] Resolve caller's character via Discord ID
  - [ ] Autocomplete for field names (from a curated mutable-fields list)
  - [ ] Validate new value against expected type
  - [ ] Send PATCH to website API
  - [ ] Confirm success or relay error
- [ ] Register in `src/commands/index.mts`
- [ ] Add `#format/update` if formatting is needed

### i18n

- [ ] String keys for update confirmations, errors, field labels
- [ ] Russian translations

### Tests

- [ ] `test/auth.test.mts` — identity resolution, DM check
- [ ] `test/update.test.mts` — command integration tests with mock API

**Deliverable:** Players can `/update toughness 8` to change their character's current toughness. DM-only fields are rejected for non-DM users.

---

## Phase 3 — DM Commands

**Goal:** DM-specific commands for gameplay management. Gated by Discord user ID.

**Depends on:** Phase 2 (identity and write infrastructure).

### DM Command Suite

These are separate commands (DM tolerance for complex UX is higher):

- [ ] `/dm-xp` — award or adjust experience
  - [ ] Parameters: `@user`, `amount` (can be negative)
  - [ ] Updates both `experience.total` and `experience.unspent`
- [ ] `/dm-corruption` — set permanent corruption
  - [ ] Parameters: `@user`, `amount`
- [ ] `/dm-effect` — apply or remove an effect
  - [ ] Parameters: `@user`, effect details
- [ ] `/dm-roll` — request a roll from a specific player
  - [ ] Parameters: `@user`, `attribute` or dice expression
  - [ ] Posts a message with a button component visible to the target user
  - [ ] Button click triggers the roll using the character's attribute value
  - [ ] Result posted to the channel

### DM Gating

- [ ] All `/dm-*` commands check `isDM(interaction.member.user.id)` before executing
- [ ] Non-DM callers receive an ephemeral rejection

### Component Handlers

- [ ] `registerComponent("dm-roll", handler)` — handles roll request buttons
- [ ] Roll uses character's attribute value + dice engine

### i18n & Tests

- [ ] String keys for DM commands
- [ ] `test/dm.test.mts` — DM command tests, permission gating tests

**Deliverable:** DM can award XP, adjust corruption, request rolls from players via bot commands.

---

## Phase 4 — RP Sessions

**Goal:** Managed in-chat RPG sessions where dice rolls automatically use character stats.

**Depends on:** Phase 3 (DM commands and identity infrastructure).

### Session Management

- [ ] `src/lib/session.mts` — in-memory session state:
  - [ ] `startSession(channelId, dmUserId)` — create a session
  - [ ] `joinSession(channelId, discordUserId, characterId)` — bind user to character
  - [ ] `endSession(channelId)` — close and clean up
  - [ ] `getSession(channelId)` — retrieve active session state
- [ ] Add `#session` import alias in `package.json`

### Session Commands

- [ ] `/session-start` — DM begins a session in the current channel
  - [ ] DM-only
  - [ ] Auto-loads the DM's character if they have one
- [ ] `/session-join` — player joins with their character
  - [ ] Resolves character via Discord ID
  - [ ] If player has multiple characters, offer selection
- [ ] `/session-end` — DM ends the session
  - [ ] Confirms via button component
  - [ ] Clears session state

### Roll Integration

- [ ] Modify `/roll` to check for active session in the channel:
  - [ ] If session active and user is joined: recognize attribute names
        as dice targets (e.g. `/roll vigilance` → roll against character's
        Vigilant attribute)
  - [ ] Auto-apply relevant effects from the character's effect list
  - [ ] If no session or user not joined: behave as currently (raw dice)

### Thread Support

> **Decision deferred.** Whether sessions use Discord threads or run in
> the main channel will be evaluated after manual testing of Discord's
> thread feature. Both approaches are architecturally supported — the
> session is keyed by channel/thread ID either way.

### State Persistence

Session state is in-memory and lost on bot restart. This is acceptable for session-length gameplay. If restart resilience becomes important, session state can be serialized to a JSON file (same pattern as the website's storage layer).

### i18n & Tests

- [ ] String keys for session commands and status messages
- [ ] `test/session.test.mts` — session lifecycle, roll integration

**Deliverable:** DM starts a session, players join, `/roll vigilance` automatically uses the character's Vigilant attribute.

---

## Phase 5 — Polish & Hardening

**Goal:** Production-readiness. Error handling, test coverage, CI/CD.

### Error Handling

- [ ] Graceful handling of website data directory being unavailable
- [ ] Graceful handling of malformed character JSON
- [ ] API write failure handling (network errors, validation rejections)
- [ ] Rate limiting awareness for Discord API calls

### Locale Completeness

- [ ] Audit all string keys for missing Russian translations
- [ ] Verify locale resolution in all new commands

### Testing

- [ ] Coverage review: ensure all phases have adequate test coverage
- [ ] Edge case tests: concurrent sessions, missing data, disconnections

### CI/CD

- [ ] GitHub Actions workflow: `npm run typecheck` + `npm test` on push
- [ ] Deployment script for VPS (restart bot process after pull)

### Documentation

- [ ] Update `README.md` with new commands and configuration
- [ ] Update `.github/copilot-instructions.md` with new modules and aliases

**Deliverable:** Stable, tested, deployable bot with full feature set.

---

## Session Planning

Realistic session-by-session flow:

| Session | Phase | Focus                                                 |
| ------- | ----- | ----------------------------------------------------- |
| 1       | 0     | Documentation, ADRs, roadmap, integration spec        |
| 2       | 1     | File access layer, character data provider            |
| 3       | 1     | `/character` command, formatting, autocomplete        |
| 4       | 1     | Tests, field queries, portrait embeds                 |
| 5       | 2     | Identity resolution, API write layer, `/update`       |
| 6       | 3     | DM commands, roll requests                            |
| 7       | 4     | Session management, roll integration                  |
| 8       | 5     | Polish, tests, CI/CD                                  |

Each session must leave the project in a **working state**. No half-done features or broken imports across sessions.

---

## Dependencies on Sibling Projects

| Bot Phase | Requires from Website                          | Website Phase                      |
| --------- | ---------------------------------------------- | ---------------------------------- |
| Phase 1   | Nothing (direct file reads, current schema)    | —                                  |
| Phase 2   | `discordId` field in character schema          | Phase 2 (Schema Review) or Phase 6 |
| Phase 2   | Website API accessible on localhost            | Already works                      |
| Phase 4   | No new requirements                            | —                                  |

The bot can proceed through Phase 1 independently. Phase 2 is gated on the website's schema update, which is already anticipated in the website's roadmap.
