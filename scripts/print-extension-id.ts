import manifest from "../manifest.json" with { type: "json" };
import { getExtensionIdFromManifestKey } from "./extension-id.js";

console.log(getExtensionIdFromManifestKey(manifest.key));
