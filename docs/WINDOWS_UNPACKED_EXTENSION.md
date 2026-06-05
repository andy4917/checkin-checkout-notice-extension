# Windows Unpacked Extension

## Fixed Extension ID

This extension is intended for Windows-only unpacked-folder use.

- Fixed ID: `jeidoobjhbnnicfkcdfncheimgdnhmjk`
- Authority: `manifest.json` `key`
- Minimum Chrome runtime: `120`
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

The manifest `minimum_chrome_version` is intentionally aligned with the Vite
`chrome120` build target. Raise it only as a deliberate support policy change.

Do not load the project root folder for the current TypeScript/Svelte build. The root folder is source, not the Chrome runtime package.

## Automated Extension Smoke

The repo-level closeout command is:

```powershell
npm run verify
```

That command builds `dist`, validates the current test contract, checks the
side-panel scale, and runs `npm run check:extension-smoke`. Treat that smoke as
a supplementary failure detector. Product acceptance is the user-controlled
Google Chrome profile with the fixed-ID unpacked `dist` extension loaded at:

```text
chrome-extension://jeidoobjhbnnicfkcdfncheimgdnhmjk/sidepanel.html
```

The smoke check can open the built `dist` folder as an unpacked extension in an
extension-capable Chromium runtime, but that does not replace direct evidence
from the user-controlled Chrome extension surface.

Set `CHROME_EXTENSION_SMOKE_BROWSER` only when the default local automation
browser is unavailable. Use a Chrome for Testing or Chromium executable that
supports `--load-extension`.

Branded Chrome can reject command-line extension loading on some builds. When
that happens, do not treat a non-extension browser page or isolated-browser pass
as product proof; load `dist` manually through `chrome://extensions` and verify
the fixed-ID user Chrome extension surface.

## Do Not Rotate

Do not regenerate or remove the manifest `key` unless you intentionally want a new extension ID. Changing the key changes the extension ID and breaks any environment-specific references to the previous ID.
