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

## Automated Extension Smoke

The repo-level closeout command is:

```powershell
npm run verify
```

That command builds `dist`, validates the current test contract, checks the
side-panel scale, and runs `npm run check:extension-smoke`. The smoke check opens
the built `dist` folder as an unpacked extension in an extension-capable Chromium
runtime and verifies the actual extension URL:

```text
chrome-extension://jeidoobjhbnnicfkcdfncheimgdnhmjk/sidepanel.html
```

Set `CHROME_EXTENSION_SMOKE_BROWSER` only when the default local automation
browser is unavailable. Use a Chrome for Testing or Chromium executable that
supports `--load-extension`.

Branded Chrome can reject command-line extension loading on some builds. When
that happens, do not treat a non-extension browser page as product proof; either
load `dist` manually through `chrome://extensions` or run the smoke check with
an extension-capable automation browser.

## Do Not Rotate

Do not regenerate or remove the manifest `key` unless you intentionally want a new extension ID. Changing the key changes the extension ID and breaks any environment-specific references to the previous ID.
