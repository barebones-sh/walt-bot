import { SlashCommandBuilder } from "discord.js";
import type { Command } from "@/types/command";
import { createEmbed } from "@/utils/embed";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with Pong!"),
  cooldown: 3,
  async execute(interaction) {
    const embed = createEmbed({
      description: "Pong!",
      user: interaction.client.user
    });
    await interaction.reply({ embeds: [embed] });
  }
};

export default command;
