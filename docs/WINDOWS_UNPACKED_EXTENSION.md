# Windows Unpacked Extension

## Fixed Extension ID

This extension is intended for Windows-only unpacked-folder use.

- Fixed ID: `jeidoobjhbnnicfkcdfncheimgdnhmjk`
- Authority: `manifest.json` `key`
- Verification command: `npm run extension:id`

Chrome derives the unpacked extension ID from the manifest public key. Keep the `key` value stable when copying this folder to another Windows environment.

## Load In Chrome

1. Build the distributable folder:
   `npm run build`
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Choose Load unpacked.
5. Select this project's `dist` folder.
6. Confirm the ID is `jeidoobjhbnnicfkcdfncheimgdnhmjk`.

The TypeScript source folder is not the runtime extension folder after compilation. Chrome should load the generated `dist` folder because it contains the compiled `sidepanel.html`, `assets/background.js`, `manifest.json`, icons, and packaged assets.

The source `manifest.json` uses source-root paths for development, then `scripts/write-extension-manifest.ts` writes the runtime `dist\manifest.json` with `side_panel.default_path = "sidepanel.html"` and `background.service_worker = "assets/background.js"`. Validate the generated manifest after `npm run build` when debugging Chrome load behavior.

Do not load the project root folder for the current TypeScript/Svelte build. The root folder is source, not the Chrome runtime package.

## Do Not Rotate

Do not regenerate or remove the manifest `key` unless you intentionally want a new extension ID. Changing the key changes the extension ID and breaks any environment-specific references to the previous ID.
