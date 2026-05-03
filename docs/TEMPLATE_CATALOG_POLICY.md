# Template Catalog Policy

## Branches

The extension supports three WINGS branches:

| Branch ID | Label | WINGS/PMS code |
| --- | --- | --- |
| `coex` | 코엑스 | `13` |
| `gangnam` | 강남 | `91` |
| `seolleung` | 선릉 | `14` |

The same code is applied to `BSNS_CODE`, `PROPERTY_NO`, and `PP_BSNS_CODE`.

## COEX-Only Door Password Guide

The door password guide source is COEX-only, but the video asset is intentionally excluded from the current extension runtime package. Do not expose the guide as an attachment unless the asset is explicitly added to `src/assets/asset-catalog.ts` with branch scope and package verification.

`assets/coex/A동 B동 현관문 비밀번호.mp4`

The source zip contained four copies of the same MP4. If the asset is reintroduced later, those copies must be represented by one catalog entry:

`asset-door-password-video-sha256-7d4d5297`

Gangnam and Seolleung must never expose the guide. Current runtime behavior filters attachment IDs through `filterAttachmentIdsForBranch()`, and the empty runtime asset catalog means no branch exposes this video.

## Duplicate Policy

Only proven duplicates are canonicalized:

- exact CSM foreign pre-arrival group
- exact room-upgrade Korean group
- exact room-upgrade English group
- exact full-cleaning group
- strong-similar laundry-complete group
- strong-similar two-week CSM group

Functional overlap alone is not enough to merge templates. Catalog entries must keep source evidence in `src/catalog/template-catalog.ts`; newly imported source-pack candidates should merge only when exact or documented strong-similar evidence exists.
