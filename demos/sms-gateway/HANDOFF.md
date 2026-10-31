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

- Current standalone `npm.cmd test`: 18/18 passed, with fake gateway/adb responses and fictional recipients only, including recipient normalization and retries without re-entering gateway credentials.
- USB update: 12/12 standalone tests passed, including unauthorized/multiple-device error handling, forwarding reuse/conflict refusal and invalid-port refusal (fake adb). A real authorized USB tunnel was subsequently created from laptop port 18080 to phone port 8080, and the digest-verified release APK install returned Success. The completed physical test is recorded below.
- Team-repository `npm.cmd test` from the publication checkout based on captain commit `a64221d`: 68/68 passed after recipient normalization/retry, including this demo's eighteen tests.
- `npm.cmd run demo`: localhost HTTP rehearsal passed for consent refusal, Hindi/English, failure, uncertainty and repeated message IDs.
- `node --check public/app.js` and `node --check src/server.mjs`: passed.
- `setup:phone` now runs a Node.js wizard, replacing the blocked PowerShell file. Initial interactive startup and USB default were verified, then cancelled before entering credentials. The user later completed the wizard locally with real gateway credentials and one consenting recipient; neither was printed or committed. Tests verify hidden password echo/history protection, private config validation and preservation of old config on invalid inputs.
- Actual browser console: prepared and confirmed English and Hindi simulated messages, and observed the clearly labelled simulated message log. No real number entered or message transmitted to a carrier.
- Official Android release `v1.78.0` secure APK downloaded locally; SHA256 `a4511489074d9a5eba52e0b2ab68eede3c184391b16afb46514b4bcf9bee565e` matched the GitHub release asset digest. APK stays in ignored `.runtime/downloads` and was installed only through the authorized installation command.

## Physical SMS test completed — 31 October 2026

The user supplied an Android phone with an active SIM and reports 100 SMS/day. They completed USB debugging approval, the app-side setup and the private Node configuration wizard. No Android permission was granted through an ADB bypass; the owner handled phone prompts. The real gateway app reports version `1.78.0`, and read-only package inspection confirmed `SEND_SMS` granted for the current Android user.

The initial Windows ADB connection became missing/offline despite a healthy WinUSB device. Restarting the default backend did not resolve it. Google's documented `ADB_USB_LEGACY=1` compatibility setting restored the `NATIVE` backend and an authorized `device` state. This was a session-local setting, not a global configuration or phone security change. Reconnection steps are in the README; use them again if the default backend problem returns after an ADB restart.

Observed checks and results:

- `npm.cmd run connect:usb`: passed; loopback `18080` forwarded to phone `8080`.
- `npm.cmd run check:phone`: passed; health response alone was not treated as delivery evidence.
- Authenticated phone `/docs/` and `/docs/swagger.json`: HTTP 200. Read-only missing-message lookups on both route aliases returned 404 without submitting an SMS. The pinned [v1.78.0 WebService.kt](https://github.com/capcom6/android-sms-gateway/blob/v1.78.0/app/src/main/java/me/capcom/smsgateway/modules/localserver/WebService.kt) confirms both `/message` and `/messages` registrations. The existing `/message` configuration was retained.
- User explicitly approved this exact one-message preview: `Yojana Sahayak demo: For PMUY applications, visit https://pmuy.gov.in/ujjwala2.html or ask an LPG distributor. Eligibility is not confirmed.`
- Local `/api/prepare` then `/api/send`: one real attempt, one consenting allowlisted recipient, one estimated GSM-7 segment. The approved text and masked recipient were checked before submitting. The gateway returned acceptance with `Pending`.
- Local `/api/status`: gateway subsequently reported `Delivered`. The recipient's complete SMS receipt was then confirmed by the user in this chat. Handset confirmation is user-reported; no private SMS inbox was collected.
- `/api/state`: one estimated segment reserved out of the six-segment demo budget. No automatic resend or second SMS was performed. The gateway is still reached entirely over the authorized USB tunnel.

Actual operator billing and remaining SIM allowance were not checked. Hindi/Unicode carrier delivery, a second real recipient, dual-SIM selection and the real browser send button remain untested. The prior browser tests were simulations. The real test used the localhost API and actual SIM; the user confirmed receipt separately.

## Contract and limitations

This is an outgoing operator demo, not an integrated WhatsApp notification feature or two-way SMS chatbot. Captain should agree the real user consent/recipient handoff before wiring it into existing results. The current site and Baileys bot do not automatically call this demo.

The phone app's route must be configured for its exact version. The documented local example uses `/message`; the shared API schema uses `/messages`. Both are supported explicitly; there is no automatic POST fallback. Both aliases are registered in the inspected v1.78.0 source, and the real English test passed through `/message`. Adapter failure/restart scenarios still use fake-provider tests. Only localhost/private IPv4 phone addresses are accepted, and the operator server is loopback-only.

No IVR, public bulk-messaging setup, public deployment, application submission, nationwide CSC directory or unbounded send quota is implemented. One real English SMS receipt has been user-confirmed; this does not establish broader deployment readiness. The source templates have a chosen review-by deadline of 7 November 2026 and fail closed afterward until re-reviewed.

Only source code, guidance and tests belong in the team repo. Keep `.runtime`, recipient allowlists, gateway credentials, SIM details, personal messages and the downloaded APK out of commits.
