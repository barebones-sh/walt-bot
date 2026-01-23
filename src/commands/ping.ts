import { SlashCommandBuilder } from "discord.js";
import type { Command } from "@/types/command";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with Pong!"),
  cooldown: 3,
  async execute(interaction) {
    await interaction.reply("Pong!");
  }
};

export default command;
