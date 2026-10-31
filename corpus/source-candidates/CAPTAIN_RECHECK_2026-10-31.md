# Independent captain source byte recheck — 31 October 2026

Compared fresh HTTP response bytes with `origin/captain/server-integration` at `b1c2542aafe14804b68eac72016c3392e85b5c07`. This is a byte-level check only; an HTTP 200 or matching hash does not independently establish that the source is current, fully reviewed or valid for all answers. No captain documents were imported into the data branch.

| Source | Result |
| --- | --- |
| PMUY FAQ | HTTP 200, 71,987 bytes, SHA-256 `9306514438d2c607275b402053010242f9cd8b51cbba7186c9e2f3852e7e18b9`, matches captain. |
| PMUY new connection | HTTP 200, 10,285 bytes, SHA-256 `b600bf485d54f9c3e2d31e1b6b3d7333de7ba8671b741a3630e9d161cfa7d451`, matches captain. |
| PM-SYM ministry note | HTTP 200 PDF, 400,209 bytes, SHA-256 `c9a1bf40e278e27ab8db96f0ce73e83e947890173d572cea07f8307394517202`, matches captain. |
| Generic LPG declaration | HTTP 200 PDF, 46,167 bytes, SHA-256 `a2a346d9d4f2e283366031575c2950f7b51f2979f7408eb2e862175f016b96ac`, matches captain's **failed** item; no approval implied. |
| PM-KISAN PIB release | HTTP 200, fresh HTML SHA-256 `a36f75f445e5f7a8786884e2bca84e321dd5ceec4b9e2b56a2a7462d8b7e10be`, differs from captain snapshot. Dynamic HTML is possible; equivalence is unproven. |
| NMMSS PIB notice | HTTP 200, fresh HTML SHA-256 `5a8476fe52b72289b81b449343fb7ee3061aefe4d07315e10470780509bf5283`, differs from captain snapshot; equivalence is unproven. |
| National Scholarship Portal listing | HTTP 200, fresh HTML SHA-256 `1da0c8dc23653c8e24169797d6965bf080af4b45eee6f2d29f69a5b8593842d5`, differs from captain snapshot. The page's NMMSS student closing date is 15 November 2026 on this check, different from the historical PIB date; preserve the captain's quarantine pending a reviewed replacement. Source: https://scholarships.gov.in/All-Scholarships, NMMSS entry. |
| PM-KISAN PDF, PM-KISAN home, PM-KISAN eKYC PDF, MSME booklet | HTTPS certificate verification failed with the local Python trust store; no bytes or new freshness result claimed. The existing committed PM-KISAN PDF independently matches its known hash. Do not bypass TLS or interpret this local failure as proof that the official site is down. |

The PMUY site asserts copyright and all rights reserved; the raw page content was not committed. No changes to the source contract, runtime data, review status or database were made.
