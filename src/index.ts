import "dotenv/config";
import { Client, Collection, GatewayIntentBits } from "discord.js";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { Command } from "@/types/command";
import type { Event } from "@/types/event";

const token = process.env.DISCORD_TOKEN;
if (!token) {
  throw new Error("Missing DISCORD_TOKEN in environment");
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.commands = new Collection<string, Command>();
client.cooldowns = new Collection<string, Collection<string, number>>();

async function loadCommands() {
  const commandsPath = path.join(__dirname, "commands");
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js") || file.endsWith(".ts"));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const module = await import(pathToFileURL(filePath).toString());
    const command: Command = module.default ?? module;

    if (command?.data?.name && command?.execute) {
      client.commands.set(command.data.name, command);
    } else {
      console.warn(`Command file ${file} is missing required exports.`);
    }
  }
}

async function loadEvents() {
  const eventsPath = path.join(__dirname, "events");
  const eventFiles = fs
    .readdirSync(eventsPath)
    .filter((file) => file.endsWith(".js") || file.endsWith(".ts"));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const module = await import(pathToFileURL(filePath).toString());
    const event: Event = module.default ?? module;

    if (!event?.name || !event?.execute) {
      console.warn(`Event file ${file} is missing required exports.`);
      continue;
    }

    if (event.once) {
      client.once(event.name, (...args) => void event.execute(...args));
    } else {
      client.on(event.name, (...args) => void event.execute(...args));
    }
  }
}

void (async () => {
  await loadCommands();
  await loadEvents();
  await client.login(token);
})();
