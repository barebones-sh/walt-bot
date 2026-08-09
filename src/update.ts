import "dotenv/config";
import { spawnSync } from "node:child_process";
import semver from "semver";
import pkg from "../package.json";

interface GithubRelease {
  tag_name: string;
  html_url: string;
}

function isNewer(latest: string, current: string) {
  // coerce() tolerates a leading "v" and stray whitespace; includePrerelease
  // keeps -rc./-beta. tags significant instead of silently discarding them.
  const a = semver.coerce(latest, { includePrerelease: true });
  const b = semver.coerce(current, { includePrerelease: true });
  if (!a || !b) return false;
  return semver.gt(a, b);
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
  // Pins the working tree to the release tag (detached HEAD is expected here —
  // this is a pin-to-latest-release update, not tracking a branch). The tag
  // checkout already lands on the exact target commit, so no pull follows it.
  run("git", ["checkout", "--force", latestTag]);
  run("npm", ["install"]);
  run("npm", ["run", "build"]);

  console.log("Update complete. You may now run the bot.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
