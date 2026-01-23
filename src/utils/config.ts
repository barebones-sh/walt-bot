import fs from "node:fs";
import path from "node:path";

export interface EmbedConfig {
  defaultColor: number;
  presets: Record<string, number>;
}

export interface AppConfig {
  embed: EmbedConfig;
  pingStatusThresholds: {
    operational: number;
    degraded: number;
  };
}

let cachedConfig: AppConfig | null = null;

function assertNumber(value: unknown, name: string): asserts value is number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`Invalid config value for ${name}`);
  }
}

function assertObject(value: unknown, name: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object") {
    throw new Error(`Invalid config value for ${name}`);
  }
}

function validateConfig(config: unknown): AppConfig {
  assertObject(config, "config");
  const embed = (config as Record<string, unknown>).embed;
  assertObject(embed, "embed");

  const defaultColor = (embed as Record<string, unknown>).defaultColor;
  const presets = (embed as Record<string, unknown>).presets;

  assertNumber(defaultColor, "embed.defaultColor");
  assertObject(presets, "embed.presets");

  for (const [key, value] of Object.entries(presets)) {
    assertNumber(value, `embed.presets.${key}`);
  }

  const pingStatusThresholds = (config as Record<string, unknown>).pingStatusThresholds;
  assertObject(pingStatusThresholds, "pingStatusThresholds");
  const operational = (pingStatusThresholds as Record<string, unknown>).operational;
  const degraded = (pingStatusThresholds as Record<string, unknown>).degraded;
  assertNumber(operational, "pingStatusThresholds.operational");
  assertNumber(degraded, "pingStatusThresholds.degraded");

  return {
    embed: {
      defaultColor,
      presets: presets as Record<string, number>
    },
    pingStatusThresholds: {
      operational,
      degraded
    }
  };
}

export function getConfig(): AppConfig {
  if (cachedConfig) return cachedConfig;

  const configPath = path.join(process.cwd(), "config.json");
  const raw = fs.readFileSync(configPath, "utf8");
  const parsed = JSON.parse(raw) as unknown;

  cachedConfig = validateConfig(parsed);
  return cachedConfig;
}
