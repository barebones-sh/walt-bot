import "dotenv/config";
import { REST, Routes } from "discord.js";
import path from "node:path";
import type { Command } from "@/types/command";
import { loadModules } from "@/utils/load-files";

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId || !guildId) {
  throw new Error("Missing DISCORD_TOKEN, DISCORD_CLIENT_ID, or DISCORD_GUILD_ID in environment");
}

const rest = new REST({ version: "10" }).setToken(token);

void (async () => {
  try {
    const commandsPath = path.join(__dirname, "commands");
    const commandFiles = await loadModules<Command>(commandsPath);

    const commands = [] as object[];

    for (const { file, mod: command } of commandFiles) {
      if (command?.data?.name) {
        commands.push(command.data.toJSON());
      } else {
        console.warn(`Command file ${file} is missing required exports.`);
      }
    }

    console.log("Registering slash commands...");
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands
    });
    console.log("Slash commands registered.");
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
})();
