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

## Legacy Root Load

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Choose Load unpacked.
4. Select this project folder.
5. Confirm the ID is `jeidoobjhbnnicfkcdfncheimgdnhmjk`.

This legacy root-load flow only applies to pre-TypeScript source snapshots.

## Do Not Rotate

Do not regenerate or remove the manifest `key` unless you intentionally want a new extension ID. Changing the key changes the extension ID and breaks any environment-specific references to the previous ID.
