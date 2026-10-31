# Yojana Sahayak — local SMS demo

A separate, dependency-free Node.js demonstration of the outgoing SMS journey:

`Reviewed message -> tester consent -> local backend -> USB tunnel or local Wi-Fi -> Android SMS Gateway -> SIM network -> recipient phone`

The default simulator contacts no phone, provider or carrier. Real mode uses one configured Android phone and explicitly allowlisted test recipients. It never uses Baileys to send SMS. It does not modify or launch the existing WhatsApp bot.

## Start on Windows

Requires the existing Node.js 22.9+ installation. No npm install, cloud subscription, database, AI model, Docker or GCP credits are needed for this demo.

```powershell
npm.cmd test
npm.cmd run demo
npm.cmd start
```

Open **http://127.0.0.1:3012/**. Choose PMUY application guidance or the official CSC locator, choose Hindi/English, check tester consent, prepare the exact preview, then run the simulated send. The console shows the estimated SMS segments and a clearly labelled simulator outcome. Failure and uncertain-outcome rehearsals are available in simulator mode. The automated `demo` command runs these paths through localhost HTTP and cleans up only its own temporary fixture directory.

Run those commands from this demo's directory. In the team repository this is `demos/sms-gateway`; the separate local copy is `C:\Users\ACER\Documents\Codex\2026-10-30\acess-m\work\yojana-sms-demo`.

## Connect your Android phone

### USB connection (Wi-Fi not required)

The USB cable carries requests between the laptop and the gateway. The recipient SMS still travels over the SIM's mobile network, not the USB cable. Normal charging/file-transfer USB mode alone is insufficient for this tunnel.

1. Connect and unlock one Android phone with a data-capable cable. Enable USB debugging in the phone's Developer options. Approve the laptop's RSA debugging prompt yourself; do this only for your trusted laptop. Phone authentication and permission dialogs are not automated. You can disable debugging again after testing.
2. From this demo directory run:

```powershell
npm.cmd run install:phone
```

This downloads official Google platform-tools into ignored `.runtime/tools` if adb is unavailable, checks the single authorized physical USB device, creates a localhost `18080 -> phone 8080` forwarding rule and installs the checksum-pinned official release APK. No global PATH changes, root access, bootloader unlocking, permission grants, device resets or SMS sends occur. An existing different forwarding rule is not overwritten. The APK's installation/update may itself require confirmation on your phone. A missing/unauthorized device causes an explicit stop.

3. Open SMS Gateway on the phone, grant the SMS sending permission when asked, enable **Local Server**, and tap **Start Service**. Keep the USB cable connected. Note the username/password shown by the local server, and the message route in the app's `/docs`.
4. Run `npm.cmd run setup:phone`. Press Enter at its phone-URL prompt to use the generated USB address `http://127.0.0.1:18080`; enter the gateway credentials and one consenting test recipient privately. Then run `npm.cmd run check:phone` and restart the operator demo before confirming one real SMS.

If the app is already installed, `npm.cmd run connect:usb` sets up/reuses the tunnel without installing anything. Re-run that command after unplugging/reconnecting the phone. If local configuration already exists, only its gateway URL is changed to the USB address, with a local backup; no send is triggered. For another phone gateway port, set `SMS_PHONE_PORT`; for another laptop tunnel port set `SMS_USB_LOCAL_PORT` before running the command. Both must be between 1024 and 65535. `ADB_PATH` can identify an existing adb executable.

To remove this demo's tunnel when finished, run the downloaded adb executable with `forward --remove tcp:18080` (or your chosen local port). Do not use `--remove-all`, which could affect unrelated work. Disconnect USB and turn off USB debugging on the phone if you no longer need it.

Reference: [Google platform-tools](https://developer.android.com/tools/releases/platform-tools) and [ADB USB authorization/forwarding](https://developer.android.com/tools/adb). Developer settings and phone-side RSA/SMS prompts require the phone owner. If Windows sees a phone only as a portable file-transfer device, it has not yet established an authorized ADB connection.

### Local Wi-Fi alternative

1. Use a phone you own or are authorized to administer, with an active SIM and an appropriate SMS plan. For this project the reported allowance is 100 SMS/day; the demo reserves at most **six estimated segments/day** by default. Other phone apps, carrier counting, international charges and any operator restrictions are outside that counter. Hindi can occupy multiple SMS segments. Use only consenting team test numbers for this demo.
2. Install the official secure/release APK from [SMS Gateway for Android releases](https://github.com/capcom6/android-sms-gateway/releases). A downloaded copy, when available, is under `.runtime/downloads/`; it is not installed automatically. Do not install the development/insecure variant for a public environment.
3. On the phone, grant the required SMS sending permission, enable **Local Server**, and tap **Start Service**. Keep it on the same trusted Wi-Fi/LAN as the laptop. The LAN can work without internet; the SIM still needs carrier service. Use a test phone where possible because the gateway app can process sensitive SMS data depending on permissions.
4. Note the phone LAN URL, local-server username and password. Check the phone's `/docs` page for its message route. The official local guide uses `/message`; the current shared API schema uses `/messages`. This demo supports either, selected explicitly. It does not try a second POST route automatically after a failed send.
5. Stop the simulator server with Ctrl+C, then run:

```powershell
npm.cmd run setup:phone
npm.cmd run check:phone
npm.cmd start
```

The Node.js setup wizard asks for the phone URL, username, hidden password input and **one** consenting test recipient. Enter a normal 10-digit Indian mobile number (the wizard adds `+91`) or an explicit international number with its country code. Spaces, parentheses and hyphens are accepted; placeholders, extensions and invalid Indian mobile lengths are rejected. Invalid recipient input is re-prompted without discarding credentials. Numbers are saved in canonical international format; the console applies the same normalization before the allowlist check. Password characters are not displayed, and prompt history is disabled. The wizard does not run a `.ps1` file or change PowerShell execution policy. It writes `.runtime/config.json` locally; never upload that file. The console never receives gateway credentials. Keep Windows access to `.runtime` restricted to the operator. Manual JSON configuration below is an alternative.

6. Open **http://127.0.0.1:3012/**. Check the prominent ANDROID GATEWAY label, enter the same allowlisted recipient, select the message and language, obtain consent, prepare the preview and click **Confirm real SMS send** once. Any real SIM charges are your plan's responsibility.
7. Use **Check gateway status**. Gateway acceptance is not handset delivery. Check the receiving phone and confirm that the complete message arrived. A gateway-reported multipart delivery does not independently establish that every part is readable. `Processed`, `Sent` and a timed-out request must never be presented as proven delivery.

Example private configuration (placeholders are not real credentials):

```json
{
  "mode": "android",
  "gatewayUrl": "http://192.168.1.20:8080",
  "username": "FROM_PHONE_APP",
  "password": "FROM_PHONE_APP",
  "allowedNumbers": ["+91YOUR_TEST_NUMBER"],
  "messagesPath": "/message",
  "dailySegmentLimit": 6,
  "simNumber": 1
}
```

Only private IPv4/localhost URLs are accepted. Do not expose this local gateway by port forwarding. HTTP local mode uses Basic auth, so use a trusted network; HTTPS works if the phone provides a normally trusted certificate. Certificate verification is never disabled. SIM selection is optional; otherwise the gateway uses its default. The demo limit can be configured from 1 to 20 estimated segments/day; it is deliberately below the reported 100/day allowance.

To return to simulation, stop the server, change `mode` to `simulator` in the private config and restart. Previous real-send ledger entries stay counted for that day. Do not delete the ledger to evade the budget.

## What is automated

- Two curated application/help messages in Hindi/English, with a source and review-by date. No free-form AI claims, entitlement amounts or personal eligibility decisions.
- GSM-7 versus Unicode segment estimates, including GSM extension characters.
- Explicit per-preview consent, recipient allowlist, 10-minute preview expiry and a six-segment real-attempt budget per India calendar day.
- Durable send-attempt reservation before contacting the gateway, same-ID duplicate protection, exclusive local store ownership and no blind retry after ambiguity or restart.
- The documented Android request shape: one `phoneNumbers` recipient, `textMessage.text`, unique `id`, `withDeliveryReport: true` and `ttl: 300` seconds. Delivery-status lookup uses the configured route and gateway message ID.
- Clearly separate simulated, submitting, accepted, failed, uncertain and gateway-reported delivery states.
- Same-origin localhost-only console; JSON/body-size/host/origin checks; no browser credentials or external fonts/scripts. Missing resources return 404.
- Local message log with keyed recipient hashes and masked display numbers. Full recipient numbers remain only in memory during preview/attempt and are not stored in this demo ledger. The allowlist and credentials do exist in the private config; the Android gateway and carrier keep their own records.

The demo counter reserves estimated segments even after rejection/uncertainty rather than risking an uncounted second send. It does not query the SIM's actual plan balance. A rejected or uncertain attempt is not automatically refunded or resent. Prepared previews expire on restart; submitting attempts become uncertain. The ledger retains up to 500 rows and refuses new previews when full; any archiving/reset must be reviewed by the operator.

## Integration contract for Captain

This project runs separately on port 3012. It is an operator demo, not a public messaging API. The existing project must not invoke it on every match or opt a person into future messages automatically. First agree the consent, recipient and handoff contract with the server owner.

- `GET /api/state` returns public templates, masked message log, mode and demo budget.
- `POST /api/prepare` takes `{template: "pmuy-apply"|"csc-help", language: "en"|"hi", recipient?: string, consent: true, scenario?: "success"|"failure"|"uncertain"}` and returns a preview `id` and segment estimate. Real mode rejects scenario overrides and non-allowlisted recipients.
- `POST /api/send` takes `{id}` and submits that exact preview once. Reusing the ID returns its recorded status without another POST to the phone.
- `POST /api/status` takes `{id}` and performs only a read-only gateway status lookup.
- POSTs require JSON plus `X-Demo-Request: 1` and the local same-origin request. The server always binds to 127.0.0.1.

No incoming SMS ingestion, application submission, automatic campaign, IVR, actual nearest-CSC directory or WhatsApp integration has been implemented in this separate demo. An offline recipient can receive SMS, but the current WhatsApp onboarding still requires internet or a volunteer-assisted session. A normal two-way SMS bot would require a separately reviewed incoming-SMS handler and reply-consent flow.

## Sources and source maintenance

- [Official PMUY application page](https://pmuy.gov.in/ujjwala2.html): application via an LPG distributor or the portal. Checked in this session on 31 October 2026. The message provides application guidance only.
- [Official CSC locator](https://locator.csccloud.in/): manual PIN/area search. No fabricated centre addresses or phone numbers are bundled.
- [Android local server guide](https://docs.sms-gate.app/getting-started/local-server/).
- [Gateway status definitions](https://docs.sms-gate.app/features/status-tracking/) and [shared OpenAPI schema](https://capcom6.github.io/android-sms-gateway/swagger.json). Confirm compatibility using the exact phone version's `/docs`.

Template `reviewBy: 2026-11-07` is a chosen demo maintenance deadline, not a government scheme expiry. The backend blocks later sends until a person rechecks the official pages and updates the curated text and date together.

## Verified and pending

Eighteen standalone tests passed, covering consent, language, expiry, allowlist, Unicode segments, duplicate/concurrent sends, budget, timeout/restart, redaction, LAN configuration, HTTP origin checks, USB forwarding/authorization/conflict handling, Node setup validation, recipient normalization/retry and hidden password/history behavior. The test suite uses fake Android gateway/adb responses and fictional recipients. `npm run demo` exercised English/Hindi and success/failure/uncertain cases over localhost HTTP. English and Hindi prepare/confirm/simulated-result paths were also observed in the actual browser console. The Node setup wizard was started in an interactive terminal, displayed the USB URL default and cancelled before entering credentials; no execution-policy change or SMS send occurred.

A real authorized USB tunnel and installation of the checksum-verified official release APK were subsequently confirmed. The app's local gateway service and private credentials were not yet configured at the final check. This is not evidence of carrier delivery or a public-ready telephony service. Real gateway/network/SIM/Unicode completeness must be tested after phone setup. No private credentials or real recipient numbers are bundled in the project.
