# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm install              # install dependencies
npm run dev              # run with hot reload (tsx watch)
npm run build            # compile TypeScript to dist/
npm start                # run compiled output
npm run deploy:commands  # register slash commands to the guild
npm run update           # self-update script
```

There are no tests. TypeScript compilation (`npm run build`) serves as the type-check step.

## Environment

Copy `.env.example` to `.env` and fill in:

- `DISCORD_TOKEN` — bot token
- `DISCORD_CLIENT_ID` — application/client ID
- `DISCORD_GUILD_ID` — target guild for guild-scoped command registration

Commands are registered guild-scoped (not global) via `deploy:commands`.

## Architecture

**Entry point:** `src/index.ts` — creates the Discord client, then auto-loads all files from `src/commands/` and `src/events/` at startup by scanning the directory and importing each file dynamically.

**Commands** (`src/commands/`): Each file exports a default object conforming to the `Command` interface (`src/types/command.ts`). A command has a `data` property (SlashCommandBuilder) and an `execute(interaction)` method. Optional `cooldown` (seconds) and `autocomplete` handler are also supported.

**Events** (`src/events/`): Each file exports a default object conforming to the `Event` interface (`src/types/event.ts`). Supports `once: true` for one-time listeners.

**Cooldown & dispatch** (`src/events/interactionCreate.ts`): Handles all slash command routing, per-user cooldown enforcement (stored in `client.cooldowns`), autocomplete delegation, and error replies.

**`client.commands` and `client.cooldowns`** are added to the Discord.js `Client` type via module augmentation in `src/types/discord.d.ts`.

**Config** (`config.json` + `src/utils/config.ts`): Runtime config loaded from `config.json` at the project root, cached after first read. Contains embed color presets and ping latency thresholds.

**Embeds** (`src/utils/embed.ts`): All Discord embeds are created through `createEmbed()`. Supports color presets (`normal`, `success`, `warn`, `error`), auto-footer with bot version and user avatar, and auto-timestamp.

**Path alias:** `@/` maps to `src/` (configured in `tsconfig.json` and resolved at build time by `tsc-alias`).

## Adding a command

1. Create `src/commands/<name>.ts` exporting a default `Command` object.
2. Run `npm run deploy:commands` to register it with Discord.
