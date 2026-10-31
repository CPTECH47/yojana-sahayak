# SMS demo handoff for Captain

Tejas asked for an automated real-SMS demo using an Android gateway. This separate project provides the reviewed-message -> consent -> local gateway -> SIM workflow without editing the existing project's `server/`, `client/` or `supabase/`.

## Ready

- Dependency-free local Node backend on port 3012 and a local operator console.
- Default, clearly labelled simulator; a separate Android adapter with configured private LAN URL and Basic auth.
- Hindi/English PMUY application and official CSC-locator guidance. No invented centre details or personal eligibility claims.
- Exact preview, per-message tester consent, allowlisted recipients, estimated segment count, six estimated real segments/day cap (India time).
- Persist-before-network duplicate protection; no blind retries; restart turns in-flight attempts into uncertain state; previews expire on restart.
- Explicit gateway acceptance versus gateway-reported delivery; the receiving phone remains the final real-demo check.
- Local setup wizard with masked password input, read-only phone health check and complete README/API instructions.
- USB alternative: `npm run install:phone` downloads official tools, checks one authorized physical phone, forwards only the requested localhost port and installs the digest-checked release APK. `npm run connect:usb` reuses the tunnel without app installation. Owner approval on the handset remains required.

## Validation performed

- Current standalone `npm.cmd test`: 15/15 passed, with fake gateway/adb responses and fictional recipients only, including three Node-wizard tests.
- USB update: 12/12 standalone tests passed, including unauthorized/multiple-device error handling, forwarding reuse/conflict refusal and invalid-port refusal (fake adb). A real authorized USB tunnel was subsequently created from laptop port 18080 to phone port 8080, and the digest-verified release APK install returned Success. The phone gateway service was not yet responding, so the application data path and carrier delivery remain unverified.
- Team-repository `npm.cmd test` from the publication checkout based on captain commit `a64221d`: 65/65 passed after the Node setup update, including this demo's fifteen tests.
- `npm.cmd run demo`: localhost HTTP rehearsal passed for consent refusal, Hindi/English, failure, uncertainty and repeated message IDs.
- `node --check public/app.js` and `node --check src/server.mjs`: passed.
- `setup:phone` now runs a Node.js wizard, replacing the blocked PowerShell file. Verified interactive startup and USB default, then cancelled before entering credentials; no real phone configuration was changed. Tests verify hidden password echo/history protection, private config validation and preservation of old config on invalid inputs. The wizard has not yet been completed with real phone credentials.
- Actual browser console: prepared and confirmed English and Hindi simulated messages, and observed the clearly labelled simulated message log. No real number entered or message transmitted to a carrier.
- Official Android release `v1.78.0` secure APK downloaded locally; SHA256 `a4511489074d9a5eba52e0b2ab68eede3c184391b16afb46514b4bcf9bee565e` matched the GitHub release asset digest. APK stays in ignored `.runtime/downloads` and is not committed or installed automatically.

## Physical setup pending

The user has an Android phone with an active SIM and reports 100 SMS/day. Google adb 37.0.1 was downloaded locally; phone-side authorization was completed by the owner. USB forwarding and the official APK installation succeeded. A tool policy blocked the attempted command to launch the phone app (no detailed reason supplied); no app authentication/permission dialog was automated. The owner must open SMS Gateway, grant SMS sending permission, start Local Server and enter the USB/LAN URL, credentials and consenting recipient through `npm.cmd run setup:phone` on the local machine. Those secrets must not be pasted into a GitHub issue or this handoff.

Run `npm.cmd run check:phone` first. It only checks health; then prepare and confirm ONE real SMS. A Hindi PMUY message currently estimates two SMS segments. The real SIM's total usage includes other phone apps and cannot be inferred from this demo's counter.

## Contract and limitations

This is an outgoing operator demo, not an integrated WhatsApp notification feature or two-way SMS chatbot. Captain should agree the real user consent/recipient handoff before wiring it into existing results. The current site and Baileys bot do not automatically call this demo.

The phone app's route must be configured from its own Swagger page: the documented local example uses `/message`; the shared API schema uses `/messages`. Both are supported explicitly; there is no automatic POST fallback. Tested adapter payload and state logic use a fake provider; the exact handset/version behavior remains unverified. Only localhost/private IPv4 phone addresses are accepted, and the operator server is loopback-only.

No IVR, public bulk-messaging setup, public deployment, application submission, nationwide CSC directory, unbounded send quota or actual phone delivery is claimed. The source templates have a chosen review-by deadline of 7 November 2026 and fail closed afterward until re-reviewed.

Only source code, guidance and tests belong in the team repo. Keep `.runtime`, recipient allowlists, gateway credentials, SIM details, personal messages and the downloaded APK out of commits.
