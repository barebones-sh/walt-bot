import "dotenv/config";
import { spawnSync } from "node:child_process";
import pkg from "../package.json";

interface GithubRelease {
  tag_name: string;
  html_url: string;
}

function parseVersion(version: string) {
  const cleaned = version.trim().replace(/^v/i, "");
  const core = cleaned.split("-")[0];
  const parts = core.split(".").map((part) => Number(part));
  if (parts.length < 1 || parts.some((n) => Number.isNaN(n))) return null;
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0] as const;
}

function isNewer(latest: string, current: string) {
  const a = parseVersion(latest);
  const b = parseVersion(current);
  if (!a || !b) return false;
  if (a[0] !== b[0]) return a[0] > b[0];
  if (a[1] !== b[1]) return a[1] > b[1];
  return a[2] > b[2];
}

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
}

async function main() {
  const repo = "barebones-sh/walt-bot";
  const url = `https://api.github.com/repos/${repo}/releases/latest`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "walt-bot-updater"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch latest release: ${response.status}`);
  }

  const release = (await response.json()) as GithubRelease;
  const latestTag = release.tag_name;
  const current = pkg.version;

  const force = process.env.UPDATE_FORCE === "1";
  const dryRun = process.env.UPDATE_DRY_RUN === "1";

  if (!force && !isNewer(latestTag, current)) {
    console.log(`Already up to date (current ${current}, latest ${latestTag}).`);
    return;
  }

  console.log(`Updating from ${current} to ${latestTag}.`);
  console.log(`Release: ${release.html_url}`);

  if (dryRun) {
    console.log("Dry run enabled. No changes applied.");
    return;
  }

  run("git", ["fetch", "--tags", "--force"]);
  run("git", ["checkout", "--force", latestTag]);
  run("git", ["pull", "--ff-only"]);
  run("npm", ["install"]);
  run("npm", ["run", "build"]);

  console.log("Update complete. You may now run the bot.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
