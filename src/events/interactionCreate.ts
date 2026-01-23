import { Collection, Events } from "discord.js";
import type { Event } from "@/types/event";

const event: Event<Events.InteractionCreate> = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (interaction.isAutocomplete()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command?.autocomplete) return;

      try {
        await command.autocomplete(interaction);
      } catch (error) {
        console.error(`Autocomplete error in ${interaction.commandName}:`, error);
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) {
      console.warn(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    const now = Date.now();
    const timestamps =
      interaction.client.cooldowns.get(command.data.name) ??
      new Collection<string, number>();
    const cooldownAmount = (command.cooldown ?? 0) * 1000;

    if (!interaction.client.cooldowns.has(command.data.name)) {
      interaction.client.cooldowns.set(command.data.name, timestamps);
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
  }
};

export default event;
