import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { EXTENSION_CONFIG, PMS_CONFIG } from "../src/config/app-config.js";
import type { BranchId, TabMode } from "../src/types.js";
import { buildPmsSearchParams } from "../src/pms/filter-builder.js";

type DiagnosticVariant = {
  name: string;
  headers: Record<string, string>;
  credentials: RequestCredentials;
};

type VariantResult = {
  name: string;
  credentials: RequestCredentials;
  status: number;
  statusText: string;
  url: string;
  redirected: boolean;
  contentType: string;
  bodySample: string;
  bodySha256: string;
  hasSamlForm: boolean;
  jsonRowsObserved: boolean;
  jsonRowCount: number;
  parseError: string;
};

type DiagnosticReport = {
  started: string;
  endpoint: string;
  date: string;
  mode: TabMode;
  branchId: BranchId;
  request: {
    method: "POST";
    credentials: "include";
    entryCount: number;
    bodySha256: string;
    firstEntries: Array<[string, string]>;
    originalZipComparison?: OriginalZipComparison;
  };
  variants: VariantResult[];
  responseCount: number;
  jsonRowsResponseCount: number;
  jsonRowCount: number;
  hasSamlForm: boolean;
  connected: boolean;
  failureReason: string;
  reportPath: string;
};

type OriginalZipComparison = {
  originalZipPath: string;
  runtimeBoundary: {
    originalSidePanelEnabledOnPmsTab: boolean;
    originalPmsFetchLocation: "extension-sidepanel";
    originalBackgroundFetchesPms: boolean;
    originalWingsLoginRequiredBeforePmsFetch: boolean;
    productPmsFetchLocation: "extension-sidepanel";
    productWingsLoginRequiredBeforePmsFetch: boolean;
  };
  originalFetch: {
    method: "POST";
    credentials: "omitted";
    headers: Record<string, string>;
  };
  productFetch: {
    method: "POST";
    credentials: "include";
    headers: Record<string, string>;
  };
  originalEntryCount: number;
  productEntryCount: number;
  bodyEncodingMatches: boolean;
  bodyEntryDiffs: Array<{
    index: number;
    original: [string, string] | null;
    product: [string, string] | null;
  }>;
  candidateFailureCauses: string[];
};

const endpoint = `${EXTENSION_CONFIG.allowedPmsOrigins[0]}${PMS_CONFIG.endpointPath}`;
const args = process.argv.slice(2);
const date = getArg("--date") || todayYmd();
const mode = parseMode(getArg("--mode") || "ARRIVAL");
const branchId = parseBranchId(getArg("--branch") || "coex");
const requireConnected = args.includes("--require-connected");
const withHeaderVariants = args.includes("--with-header-variants");
const originalZipPath = getArg("--original-zip");
const reportDir = resolve(
  process.env.PMS_DIAGNOSTIC_REPORT_DIR || join(tmpdir(), `checkin-checkout-pms-diagnostic-${Date.now()}`),
);
const reportPath = join(reportDir, "pms-diagnostic-result.json");
const body = buildPmsSearchParams(date, mode, branchId);
const bodyText = body.toString();
const variants: DiagnosticVariant[] = [
  {
    name: "product-credentialed-post",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    credentials: "include",
  },
];

if (withHeaderVariants) {
  variants.push(
    {
      name: "original-no-cookie-post",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      credentials: "omit",
    },
    {
      name: "product-credentialed-post-json-accept",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      credentials: "include",
    },
    {
      name: "product-credentialed-post-xhr-like",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      credentials: "include",
    },
  );
}

const results = await Promise.all(variants.map((variant) => runVariant(variant)));
const jsonRowsResponseCount = results.filter((result) => result.jsonRowsObserved).length;
const jsonRowCount = results.reduce((count, result) => count + result.jsonRowCount, 0);
const hasSamlForm = results.some((result) => result.hasSamlForm);
const connected = jsonRowsResponseCount > 0 && jsonRowCount > 0;
const report: DiagnosticReport = {
  started: new Date().toISOString(),
  endpoint,
  date,
  mode,
  branchId,
  request: {
    method: "POST",
    credentials: "include",
    entryCount: Array.from(body.entries()).length,
    bodySha256: sha256(bodyText),
    firstEntries: Array.from(body.entries()).slice(0, 12),
    originalZipComparison: originalZipPath
      ? compareOriginalZipRequestBody(originalZipPath, date, mode, body)
      : undefined,
  },
  variants: results,
  responseCount: results.length,
  jsonRowsResponseCount,
  jsonRowCount,
  hasSamlForm,
  connected,
  failureReason: connected
    ? ""
    : hasSamlForm
      ? "PMS returned SAML HTML instead of JSON rows."
      : jsonRowsResponseCount > 0
        ? "PMS returned a JSON rows array with no live rows."
        : "No PMS JSON rows were observed from the endpoint.",
  reportPath,
};

await mkdir(reportDir, { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));

if (requireConnected && !connected) {
  process.exitCode = 2;
}

async function runVariant(variant: DiagnosticVariant): Promise<VariantResult> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: variant.headers,
    credentials: variant.credentials,
    body: new URLSearchParams(body),
  });
  const text = await response.text();
  const parsed = parseMaybeJson(text);
  const rows = isRecord(parsed.value) && Array.isArray(parsed.value.rows) ? parsed.value.rows : null;
  const hasSamlForm = /identity\/samlsso|samlsso/i.test(text);
  return {
    name: variant.name,
    credentials: variant.credentials,
    status: response.status,
    statusText: response.statusText,
    url: response.url,
    redirected: response.redirected,
    contentType: response.headers.get("content-type") || "",
    bodySample: rows
      ? "[json rows observed; body sample omitted]"
      : hasSamlForm
        ? "[saml html observed; body sample omitted]"
        : "[non-json response observed; body sample omitted]",
    bodySha256: sha256(text),
    hasSamlForm,
    jsonRowsObserved: Boolean(rows),
    jsonRowCount: rows?.length || 0,
    parseError: parsed.error,
  };
}

function getArg(name: string): string | null {
  const prefix = `${name}=`;
  const value = args.find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : null;
}

function parseMode(value: string): TabMode {
  if (value === "ARRIVAL" || value === "DEPARTURE") return value;
  throw new Error(`Invalid --mode: ${value}`);
}

function parseBranchId(value: string): BranchId {
  if (value === "coex" || value === "gangnam" || value === "seolleung") return value;
  throw new Error(`Invalid --branch: ${value}`);
}

function todayYmd(): string {
  const formatter = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date()).replace(/\D/g, "");
}

function parseMaybeJson(text: string): { value: unknown; error: string } {
  try {
    return { value: JSON.parse(text), error: "" };
  } catch (error) {
    return { value: null, error: error instanceof Error ? error.message : String(error) };
  }
}

function compareOriginalZipRequestBody(
  zipPath: string,
  targetDate: string,
  targetMode: TabMode,
  productBody: URLSearchParams,
): OriginalZipComparison {
  const originalSidepanelSource = readOriginalZipEntry(zipPath, "sidepanel.js");
  const originalBackgroundSource = readOriginalZipEntry(zipPath, "background.js");
  const originalEntries = parseOriginalPmsPostEntries(originalSidepanelSource, targetDate, targetMode);
  const productEntries = Array.from(productBody.entries());
  const maxEntryCount = Math.max(originalEntries.length, productEntries.length);
  const bodyEntryDiffs: OriginalZipComparison["bodyEntryDiffs"] = [];
  for (let index = 0; index < maxEntryCount; index += 1) {
    const original = originalEntries[index] || null;
    const product = productEntries[index] || null;
    if (!original || !product || original[0] !== product[0] || original[1] !== product[1]) {
      bodyEntryDiffs.push({ index, original, product });
    }
  }

  const candidateFailureCauses = bodyEntryDiffs.length > 0
    ? ["PMS POST body differs from the original ZIP request shape."]
    : [
        "PMS POST body entries and URLSearchParams encoding match the original ZIP request shape for the selected branch/date/mode.",
        "The product fetch intentionally uses credentials=include so an existing PMS host session can be sent; the original ZIP omitted credentials.",
        "The original ZIP enables the side panel from a PMS tab but still performs the PMS POST from the extension side panel, not through a WINGS page.",
        "Observed SAML HTML is therefore not explained by a body shape or form-encoding difference in this diagnostic.",
      ];

  return {
    originalZipPath: zipPath,
    runtimeBoundary: {
      originalSidePanelEnabledOnPmsTab:
        /chrome\.tabs\.onUpdated/.test(originalBackgroundSource) &&
        /pms\.sanhait\.com/.test(originalBackgroundSource) &&
        /chrome\.sidePanel\.setOptions/.test(originalBackgroundSource),
      originalPmsFetchLocation: "extension-sidepanel",
      originalBackgroundFetchesPms: /fetch\s*\(/.test(originalBackgroundSource),
      originalWingsLoginRequiredBeforePmsFetch: /WINGS|wings|fetchPmsThroughWings|getPmsTab|fetchPmsInPage/.test(
        originalSidepanelSource,
      ),
      productPmsFetchLocation: "extension-sidepanel",
      productWingsLoginRequiredBeforePmsFetch: false,
    },
    originalFetch: {
      method: "POST",
      credentials: "omitted",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    },
    productFetch: {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    },
    originalEntryCount: originalEntries.length,
    productEntryCount: productEntries.length,
    bodyEncodingMatches: new URLSearchParams(originalEntries).toString() === productBody.toString(),
    bodyEntryDiffs,
    candidateFailureCauses,
  };
}

function readOriginalZipEntry(zipPath: string, entryName: string): string {
  const script = `
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [IO.Compression.ZipFile]::OpenRead($env:ORIGINAL_PMS_ZIP)
try {
  $entry = $zip.GetEntry($env:ORIGINAL_PMS_ZIP_ENTRY)
  if (-not $entry) { exit 2 }
  $reader = [IO.StreamReader]::new($entry.Open(), [Text.Encoding]::UTF8)
  try { [Console]::Out.Write($reader.ReadToEnd()) }
  finally { $reader.Dispose() }
}
finally { $zip.Dispose() }
`;
  const result = spawnSync("powershell.exe", ["-NoProfile", "-Command", script], {
    env: { ...process.env, ORIGINAL_PMS_ZIP: zipPath, ORIGINAL_PMS_ZIP_ENTRY: entryName },
    encoding: "utf8",
    maxBuffer: 2 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(
      `Could not read ${entryName} from original ZIP ${zipPath}: ${result.stderr || result.stdout || `exit ${result.status}`}`,
    );
  }
  return result.stdout;
}

function parseOriginalPmsPostEntries(source: string, targetDate: string, targetMode: TabMode): Array<[string, string]> {
  const lines = source.split(/\r?\n/);
  const entries: Array<[string, string]> = [];
  let insideFetchFunction = false;
  let activeBranch = true;
  let insideArrivalBranch = false;
  let insideDepartureBranch = false;

  for (const line of lines) {
    if (/async function fetchPMSData\(date, mode\)/.test(line)) {
      insideFetchFunction = true;
      continue;
    }
    if (!insideFetchFunction) continue;
    if (/const response = await fetch/.test(line)) break;
    if (line.includes('if (mode === "ARRIVAL")')) {
      insideArrivalBranch = true;
      insideDepartureBranch = false;
      activeBranch = targetMode === "ARRIVAL";
      continue;
    }
    if (insideArrivalBranch && line.trim() === "} else {") {
      insideArrivalBranch = false;
      insideDepartureBranch = true;
      activeBranch = targetMode !== "ARRIVAL";
      continue;
    }
    if (insideDepartureBranch && line.trim() === "}") {
      insideDepartureBranch = false;
      activeBranch = true;
      continue;
    }
    if (!activeBranch) continue;
    const append = line.match(/params\.append\("([^"]+)",\s*("([^"]*)"|date)\);/);
    if (!append) continue;
    entries.push([append[1], append[2] === "date" ? targetDate : append[3]]);
  }

  if (entries.length === 0) {
    throw new Error("Could not parse original PMS POST URLSearchParams entries from sidepanel.js.");
  }
  return entries;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
