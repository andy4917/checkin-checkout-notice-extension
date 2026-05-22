# 입실퇴실 안내문 생성기 Agent Instructions

## Authority

- This file is the repo-local project contract for `C:\Users\anise\code\Dev-Product\입실퇴실 안내문 생성기`.
- Higher-priority system, developer, runtime, global, and direct user instructions always take precedence over this file.
- The file on disk is `agents.md`. Do not use `AGENTS.md` casing as a separate scope signal in this repo.
- If higher-priority context supplies a global workflow or SSOT path, follow that context. Do not invent or hardcode an absent external workflow path here.
- The user is the Production Owner. Complete the requested product outcome with direct evidence where practical; do not make the user operate routine implementation, testing, cleanup, or tool steps.

## Completion Contract

- Candidate, final text, score, PASS label, hook PASS, package verification, and self-claim are not completion.
- Completion requires the in-scope product outcome to be implemented or explicitly blocked, with no hidden fallback, fake success, unnecessary legacy path, dead code, or unreported residue.
- Package scripts remain command authority. If a required final check is blocked, report the exact PowerShell command and blocker instead of fabricating verification.

## Product Contract

- This repo is a Chrome extension with a Svelte side panel mounted from `src/ui/main.ts`.
- `src/ui/App.svelte` must stay a skeleton/orchestrator.
- Screen markup belongs in `src/ui/components/*`.
- Catalog, PMS, OTA, storage, and domain behavior must stay in their owner modules.
- Current navigation storage dependencies for the Svelte side panel must enter through `src/ui/side-panel-navigation-dependencies.ts`; do not hide `fetch`, `chrome.storage.local`, `navigator.clipboard`, or `window` as default parameters in application/UI workflows.
- Do not recreate or depend on legacy DOM side panel code under `src/sidepanel/*`. That path is removed as a product surface.

## Data And Configuration

- Do not add fake values, demo data, placeholder business data, silent fallbacks, or hardcoded success paths.
- Do not add branch labels, PMS codes, route IDs, customer numbers, endpoint paths, or status codes inside UI components.
- Product operation values that already exist in source must stay in the narrow owner module that owns that contract, such as `src/config/*`, `src/catalog/*`, PMS/OTA modules, or typed domain modules.
- New or changed operation values require a named owner module and source evidence; do not scatter them through components, tests, docs, or migration notes.

## Repository Hygiene

- Do not leave generated screenshots, temporary reports, old build scraps, agent run receipts, or migration byproducts tracked or untracked in the repo.
- Historical documents are not current verification authority. If a historical note conflicts with the current repo contract, update the note or mark it superseded.
- Do not add module-unit tests as the closeout strategy for frontend work. Final-stage checks must demonstrate the app entry builds/loads and at least one real failure path is observable.
