import "discord.js";
import type { Collection } from "discord.js";
import type { Command } from "@/types/command";

declare module "discord.js" {
  interface Client {
    commands: Collection<string, Command>;
    cooldowns: Collection<string, Collection<string, number>>;
  }
}
