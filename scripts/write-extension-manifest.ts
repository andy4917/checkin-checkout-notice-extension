import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const rootDir = resolve(import.meta.dirname, "..");
const distDir = resolve(rootDir, "dist");

const manifestPath = resolve(rootDir, "manifest.json");
const distManifestPath = resolve(distDir, "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

const distManifest = {
  ...manifest,
};

distManifest.background = {
  ...manifest.background,
  service_worker: "assets/background.js",
  type: "module",
};
distManifest.side_panel = {
  ...manifest.side_panel,
  default_path: "sidepanel.html",
};

const rootManifest = {
  ...distManifest,
  background: {
    ...distManifest.background,
    service_worker: "dist/assets/background.js",
  },
  side_panel: {
    ...distManifest.side_panel,
    default_path: "dist/sidepanel.html",
  },
};

await mkdir(distDir, { recursive: true });
await writeFile(`${distManifestPath}`, `${JSON.stringify(distManifest, null, 2)}\n`);
await writeFile(`${manifestPath}`, `${JSON.stringify(rootManifest, null, 2)}\n`);

await cp(resolve(rootDir, "icons"), resolve(distDir, "icons"), {
  recursive: true,
});
await cp(resolve(rootDir, "logo.png"), resolve(distDir, "logo.png"));
await cp(resolve(rootDir, "assets"), resolve(distDir, "assets"), {
  recursive: true,
});
