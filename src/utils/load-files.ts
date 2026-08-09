import fs from "node:fs";
import path from "node:path";

/**
 * Reads every command/event file from `dir` and dynamically imports it.
 * Matches both `.ts` (dev, run directly via tsx) and `.js` (compiled, run from dist) —
 * only one extension will ever be present at a time depending on how the bot is run.
 */
export async function loadModules<T>(dir: string): Promise<{ file: string; mod: T }[]> {
  const files = fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".js") || file.endsWith(".ts"));

  return Promise.all(
    files.map(async (file) => {
      const namespace = await import(path.join(dir, file));
      return { file, mod: unwrapDefault(namespace) as T };
    })
  );
}

/**
 * Every command/event file does `export default X`. tsx (dev) loads these as native
 * ESM, so `namespace.default` is `X` directly. Compiled CJS (dist) sets both
 * `exports.default = X` and `__esModule: true`, which Node.js treats as a collision
 * with the synthetic default it generates for CJS interop — so `namespace.default`
 * ends up being the raw `module.exports` wrapper (`{ __esModule, default: X }`)
 * instead of `X`. Node exposes that raw wrapper unambiguously via the special
 * `"module.exports"` named export precisely to resolve this collision.
 */
function unwrapDefault(namespace: Record<string, unknown>) {
  const moduleExports = namespace["module.exports"] as Record<string, unknown> | undefined;
  if (moduleExports) return moduleExports.default ?? moduleExports;
  return namespace.default ?? namespace;
}
