import "dotenv/config";
import {
  Client,
  Collection,
  Events,
  GatewayIntentBits
} from "discord.js";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { Command } from "@/types/command";

const token = process.env.DISCORD_TOKEN;
if (!token) {
  throw new Error("Missing DISCORD_TOKEN in environment");
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const commands = new Collection<string, Command>();
const cooldowns = new Collection<string, Collection<string, number>>();

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
      commands.set(command.data.name, command);
    } else {
      console.warn(`Command file ${file} is missing required exports.`);
    }
  }
}

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isAutocomplete()) {
    const command = commands.get(interaction.commandName);
    if (!command?.autocomplete) return;

    try {
      await command.autocomplete(interaction);
    } catch (error) {
      console.error(`Autocomplete error in ${interaction.commandName}:`, error);
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);
  if (!command) {
    console.warn(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  const now = Date.now();
  const timestamps = cooldowns.get(command.data.name) ?? new Collection();
  const cooldownAmount = (command.cooldown ?? 0) * 1000;

  if (!cooldowns.has(command.data.name)) {
    cooldowns.set(command.data.name, timestamps);
  }

  if (cooldownAmount > 0 && timestamps.has(interaction.user.id)) {
    const expirationTime = timestamps.get(interaction.user.id)! + cooldownAmount;

    if (now < expirationTime) {
      const timeLeft = (expirationTime - now) / 1000;
      await interaction.reply({
        content: `Please wait ${timeLeft.toFixed(1)} more second(s) before reusing \`${command.data.name}\`.`,
        ephemeral: true
      });
      return;
    }
  }

  if (cooldownAmount > 0) {
    timestamps.set(interaction.user.id, now);
    setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing ${interaction.commandName}:`, error);

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "There was an error while executing this command.",
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: "There was an error while executing this command.",
        ephemeral: true
      });
    }
  }
});

void (async () => {
  await loadCommands();
  await client.login(token);
})();
