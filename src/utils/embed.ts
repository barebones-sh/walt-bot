import {
  EmbedBuilder,
  type APIEmbedField,
  type ColorResolvable,
  type User
} from "discord.js";
import pkg from "../../package.json";
import { getConfig } from "@/utils/config";

export type EmbedPreset = "normal" | "success" | "warn" | "error";

export interface EmbedOptions {
  author?: {
    name: string;
    iconURL?: string;
    url?: string;
  };
  color?: ColorResolvable;
  description?: string;
  fields?: APIEmbedField[];
  footer?: {
    text: string;
    iconURL?: string;
  };
  image?: string;
  thumbnail?: string;
  timestamp?: Date;
  title?: string;
  url?: string;
  user?: User | null;
  preset?: EmbedPreset;
}

export function createEmbed(options: EmbedOptions = {}) {
  const embed = new EmbedBuilder();
  const appConfig = getConfig();

  const presetColor = options.preset
    ? appConfig.embed.presets[options.preset]
    : undefined;
  // config.json's colors are hex strings but resolveJsonModule widens them to
  // `string`, so they need a nudge back to the literal type setColor() expects.
  embed.setColor(
    options.color ?? (presetColor as ColorResolvable) ?? (appConfig.embed.defaultColor as ColorResolvable)
  );

  const defaultTitles: Partial<Record<EmbedPreset, string>> = {
    success: "Success",
    warn: "Warning",
    error: "Error"
  };
  const resolvedTitle =
    options.title ?? (options.preset ? defaultTitles[options.preset] : undefined);
  if (resolvedTitle) embed.setTitle(resolvedTitle);
  if (options.url) embed.setURL(options.url);
  if (options.description) embed.setDescription(options.description);
  if (options.fields?.length) embed.setFields(options.fields);
  if (options.thumbnail) embed.setThumbnail(options.thumbnail);
  if (options.image) embed.setImage(options.image);
  if (options.author) embed.setAuthor(options.author);
  if (options.timestamp ?? true) embed.setTimestamp(options.timestamp);

  const defaultFooterText = `v${pkg.version}`;
  if (options.footer) {
    embed.setFooter(options.footer);
  } else if (options.user) {
    embed.setFooter({
      text: `${options.user.username} · ${defaultFooterText}`,
      iconURL: options.user.displayAvatarURL()
    });
  } else {
    embed.setFooter({ text: defaultFooterText });
  }

  return embed;
}
