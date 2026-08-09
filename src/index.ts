import "dotenv/config";
import { Client, Collection, GatewayIntentBits } from "discord.js";
import path from "node:path";
import type { Command } from "@/types/command";
import type { Event } from "@/types/event";
import { loadModules } from "@/utils/load-files";

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
  const commands = await loadModules<Command>(commandsPath);

  for (const { file, mod: command } of commands) {
    if (command?.data?.name && typeof command.execute === "function") {
      client.commands.set(command.data.name, command);
    } else {
      console.warn(`Command file ${file} is missing required exports.`);
    }
  }
}

async function loadEvents() {
  const eventsPath = path.join(__dirname, "events");
  const events = await loadModules<Event>(eventsPath);

  for (const { file, mod: event } of events) {
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
