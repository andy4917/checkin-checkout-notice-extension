Global authority capsule:
- The user's explicit instruction is the highest project authority inside allowed system/developer constraints.
- Before work, read and follow:
C:\Users\anise\code\Dev-Management\docs\GLOBAL_AGENT_WORKFLOW.md

Repo contract:
- This repo is a Chrome extension with a Svelte side panel mounted from `src/ui/main.ts`.
- `src/ui/App.svelte` must stay a skeleton/orchestrator. Screen markup belongs in `src/ui/components/*`; catalog, PMS, OTA, storage, and domain behavior must stay in their owner modules.
- Do not add hardcoded branch labels, PMS codes, route IDs, fake values, demo data, silent fallbacks, or placeholder business data in UI components.
- Browser/global dependencies for the Svelte side panel must enter through `src/ui/side-panel-dependencies.ts`; do not hide `fetch`, `chrome.storage.local`, `navigator.clipboard`, or `window` as default parameters in application/UI workflows.
- Do not recreate or depend on legacy DOM sidepanel code under `src/sidepanel/*`. That path is removed as a product surface.
- Do not leave generated screenshots, temporary reports, old build scraps, or migration byproducts untracked in the repo.
- Do not add module-unit tests as the closeout strategy for frontend work. Final-stage checks must demonstrate the app entry builds/loads and at least one real failure path is observable.
- Package scripts remain command authority. If a required final check is blocked, report the exact blocker instead of fabricating verification.
