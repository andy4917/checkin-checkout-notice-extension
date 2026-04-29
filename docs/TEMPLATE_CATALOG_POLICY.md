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

The door password guide is COEX-only. The canonical asset is:

`assets/coex/A동 B동 현관문 비밀번호.mp4`

The source zip contained four copies of the same MP4, all represented by one catalog entry:

`asset-door-password-video-sha256-7d4d5297`

Gangnam and Seolleung check-in messages remove the door password guide sentence and do not expose the asset.

## Duplicate Policy

Only proven duplicates are canonicalized:

- exact CSM foreign pre-arrival group
- exact room-upgrade Korean group
- exact room-upgrade English group
- exact full-cleaning group
- strong-similar laundry-complete group
- strong-similar two-week CSM group

Functional overlap alone is not enough to merge templates. Existing `arrival`, `BEFORE_30`, `AFTER_15`, and `LATE_12` copy remains separate from newly cataloged source-pack candidates unless exact or strong-similar evidence exists.
