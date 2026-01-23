import { Events } from "discord.js";
import type { Event } from "@/types/event";

const event: Event<Events.ClientReady> = {
  name: Events.ClientReady,
  once: true,
  execute(readyClient) {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
  }
};

export default event;
