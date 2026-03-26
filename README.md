# malizia

Discord bot for the Nagara RPG system: dice rolling, character references, and rules/world lookups.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 24
- A Discord application with a bot user — create one at the [Discord Developer Portal](https://discord.com/developers/applications)

## Setup

```bash
npm install
```

Copy the example env file and fill in your credentials:

```bash
cp config/malizia.development.example.env config/malizia.development.env
```

| Variable            | Where to find it                                               |
| ------------------- | -------------------------------------------------------------- |
| `DISCORD_TOKEN`     | Developer Portal → Bot → Reset Token                           |
| `DISCORD_CLIENT_ID` | Developer Portal → General Information → Application ID        |
| `DISCORD_GUILD_ID`  | Right-click your server in Discord (Developer Mode must be on) |
| `API_BASE_URL`      | URL of your web-server (defaults to `http://localhost:3000`)   |

## Development (local)

Register slash commands to your test server (re-run whenever command definitions change):

```bash
npm run deploy:dev
```

Start the bot with file watching (auto-restarts on code changes):

```bash
npm run start:dev
```

Type-check without running:

```bash
npm run typecheck
```

## Production (VPS)

Create `config/malizia.env` with your production credentials (same variables as above).

Register slash commands (globally, or to a specific guild if `DISCORD_GUILD_ID` is set):

```bash
npm run deploy
```

Start the bot:

```bash
npm start
```

Use a process manager (`systemd`, `pm2`, etc.) to keep the bot running and restart on crashes.

## Inviting the bot

Developer Portal → OAuth2 → URL Generator → select `bot` and `applications.commands` scopes → copy the URL and open it in your browser to add the bot to a server.
