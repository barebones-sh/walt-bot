import {
  ActivityType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder
} from "discord.js";
import type { Command } from "@/types/command";
import { createEmbed } from "@/utils/embed";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("status")
    .setDescription("Update the bot's presence/status.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) =>
      option
        .setName("presence")
        .setDescription("Set the bot's presence status.")
        .setRequired(true)
        .addChoices(
          { name: "Online", value: "online" },
          { name: "Idle", value: "idle" },
          { name: "Do Not Disturb", value: "dnd" },
          { name: "Invisible", value: "invisible" }
        )
    )
    .addStringOption((option) =>
      option
        .setName("activity")
        .setDescription("Activity text (e.g., 'Serving servers')")
    )
    .addStringOption((option) =>
      option
        .setName("activity_type")
        .setDescription("Activity type")
        .addChoices(
          { name: "Playing", value: "playing" },
          { name: "Watching", value: "watching" },
          { name: "Listening", value: "listening" },
          { name: "Competing", value: "competing" }
        )
    ),
  cooldown: 5,
  async execute(interaction) {
    if (!interaction.inGuild()) {
      const embed = createEmbed({
        preset: "warn",
        description: "This command can only be used in a server.",
        user: interaction.client.user
      });
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    const presence = interaction.options.getString("presence", true);
    const activityText = interaction.options.getString("activity") ?? undefined;
    const activityType = interaction.options.getString("activity_type") ?? undefined;

    const activityTypeMap: Record<string, ActivityType> = {
      playing: ActivityType.Playing,
      watching: ActivityType.Watching,
      listening: ActivityType.Listening,
      competing: ActivityType.Competing
    };

    const activities = activityText
      ? [
          {
            name: activityText,
            type: activityType ? activityTypeMap[activityType] : ActivityType.Playing
          }
        ]
      : [];

    await interaction.client.user?.setPresence({
      status: presence as "online" | "idle" | "dnd" | "invisible",
      activities
    });

    const summaryLines = [
      `**Presence:** ${presence}`,
      activityText
        ? `**Activity:** ${activityText} (${activityType ?? "playing"})`
        : "**Activity:** None"
    ];

    const embed = createEmbed({
      preset: "success",
      title: "Status updated",
      description: summaryLines.join("\n"),
      user: interaction.client.user
    });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
};

export default command;
