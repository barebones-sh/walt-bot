import { SlashCommandBuilder } from "discord.js";
import type { Command } from "@/types/command";
import { createEmbed, type EmbedPreset } from "@/utils/embed";
import { getConfig } from "@/utils/config";

const pingStatusLabels: Record<Extract<EmbedPreset, "success" | "warn" | "error">, string> = {
  success: "Operational",
  warn: "Degraded",
  error: "Poor"
};

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Shows bot latency and connection health.")
    .addIntegerOption((option) =>
      option
        .setName("samples")
        .setDescription("Number of samples to take (max 100).")
        .setMinValue(1)
        .setMaxValue(100)
    ),
  cooldown: 3,
  async execute(interaction) {
    const requestedSamples = interaction.options.getInteger("samples") ?? 10;
    const samples = Math.min(Math.max(requestedSamples, 1), 100);

    const sleep = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    const initialEmbed = createEmbed({
      preset: "normal",
      title: "Status: Initializing",
      fields: [
        { name: "Round-trip", value: `\`\`\`—\`\`\``, inline: true },
        { name: "Websocket Avg", value: `\`\`\`—\`\`\``, inline: true },
        { name: "Websocket Min", value: `\`\`\`—\`\`\``, inline: true },
        { name: "Websocket Max", value: `\`\`\`—\`\`\``, inline: true },
        { name: "Valid WS Samples", value: `\`\`\`0/${samples}\`\`\``, inline: true }
      ],
      user: interaction.client.user
    });
    const response = await interaction.reply({
      embeds: [initialEmbed],
      withResponse: true
    });
    const sentTimestamp =
      response.resource?.message?.createdTimestamp ?? Date.now();
    const roundTrip = sentTimestamp - interaction.createdTimestamp;

    await sleep(2000);

    const { operational, degraded } = getConfig().pingStatusThresholds;

    const wsSamples: number[] = [];
    for (let i = 0; i < samples; i += 1) {
      const ping = interaction.client.ws.ping;
      if (ping > 0) wsSamples.push(ping);

      const wsHasSamples = wsSamples.length > 0;
      const wsMin = wsHasSamples ? Math.min(...wsSamples) : null;
      const wsMax = wsHasSamples ? Math.max(...wsSamples) : null;
      const wsAvg = wsHasSamples
        ? Math.round(
            wsSamples.reduce((sum, value) => sum + value, 0) / wsSamples.length
          )
        : null;

      const worst = Math.max(roundTrip, wsMax ?? 0);
      const preset: Extract<EmbedPreset, "success" | "warn" | "error"> =
        worst < operational
          ? "success"
          : worst < degraded
            ? "warn"
            : "error";
      const statusLabel = pingStatusLabels[preset];

      const progressEmbed = createEmbed({
        preset,
        title: `Status: ${statusLabel}`,
        fields: [
          { name: "Round-trip", value: `\`\`\`${roundTrip} ms\`\`\``, inline: true },
          {
            name: "Valid Samples",
            value: `\`\`\`${wsSamples.length}/${samples}\`\`\``,
            inline: true
          },
          {
            name: "Current Sample",
            value: `\`\`\`${i + 1}/${samples}\`\`\``,
            inline: true
          },
          {
            name: "Websocket Avg",
            value: wsAvg === null ? `\`\`\`—\`\`\`` : `\`\`\`${wsAvg} ms\`\`\``,
            inline: true
          },
          {
            name: "Websocket Min",
            value: wsMin === null ? `\`\`\`—\`\`\`` : `\`\`\`${wsMin} ms\`\`\``,
            inline: true
          },
          {
            name: "Websocket Max",
            value: wsMax === null ? `\`\`\`—\`\`\`` : `\`\`\`${wsMax} ms\`\`\``,
            inline: true
          }
        ],
        user: interaction.client.user
      });

      await interaction.editReply({ embeds: [progressEmbed] });
      if (i < samples - 1) await sleep(2000);
    }
  }
};

export default command;
