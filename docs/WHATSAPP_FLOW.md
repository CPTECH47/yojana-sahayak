# WhatsApp user flow and evidence safeguards

## Who the pilot is for

- Citizens and families who need a plain-language explanation of a scheme, its stated conditions, benefits, documents or application route.
- Farmers asking about PM-KISAN and students asking about NMMSS.
- Volunteers and help-desk staff who need a source link and passage locator to help someone continue with the official programme.
- The current questionnaire checks selected conditions for PM-KISAN, PMUY and PM-SYM. Students and artisans receive a relevant information link, not an eligibility match, because current reviewed rules are not available for those checks.

## WhatsApp journey

1. A person sends `YOJANA START` in a direct chat. The prefix is required during the prototype test on a personal number.
2. The bot greets the person and asks them to reply `1` for Hindi or `2` for English. It then asks for a role: farmer, student, worker, artisan, family/other, or volunteer.
3. Farmers, families, and workers get short scheme-specific questions. Once the questionnaire starts, the user can reply naturally with a number, YES/NO, BACK, SKIP, or CANCEL without repeating the prefix. Outside the active questionnaire, a `YOJANA ` prefix is still required during personal-number testing. Invalid replies prompt the same question again; `BACK` lets the user correct the previous answer. `SKIP` leaves the field unknown.
4. The bot checks selected PM-KISAN, PMUY, or PM-SYM rules against reviewed passages and returns a cited preliminary result. Student and artisan paths show an official information link but do not claim an eligibility match.
5. Unsaved answers stay in process memory. Completed answers remain editable during the session. SAVE separately consents to encrypted local retention of fictional answers for 30 days; RESUME restores and re-evaluates them after restart. ALERTS ON separately opts into reviewed updates, STOP revokes delivery consent, and DELETE erases saved profile information. The bot asks for no Aadhaar or bank details.
6. For ordinary scheme questions, the bot retrieves approved passages and includes source title, authority, locator and URL. Time-sensitive sources expire from retrieval.

## How the pilot reduces unsupported answers

- Retrieval reads only manifest sources marked `approved`; expired sources are filtered out by date.
- The model is given retrieved passages and constrained to cite only their evidence IDs. A missing passage, empty draft, or unsupported evidence ID produces an insufficient-evidence response.
- The model selects only fact IDs from retrieved pinned records. Final bilingual wording comes from those records, including amounts and periods; model prose and model-generated links are never displayed.
- Scheme checks are explicit code and cite PM-KISAN, PMUY or PM-SYM sources. Unknown profile answers remain `needs_information`; results say `official_decision: false`.
- Dates and version context are retained with source records; the bot points to live official status checks when the result depends on an individual application.

These controls lower risk, but they cannot guarantee that a language model never misstates a non-numeric fact or translation. The response must always be treated as guidance, not a government decision. For a consequential question, the user should open the cited source or contact the official helpline/help desk.

## Not implemented yet

An experimental opt-in Hindi/English voice-question path is available in code but is not yet verified on a phone. Send `YOJANA VOICE`, record a question and confirm the recognised text with `YOJANA CONFIRM`; use `YOJANA CANCEL` if wrong. Voice questions receive text answers only. A local faster-whisper installation and model are required. The first model download needs internet. Voice notes are only accepted after opt-in, kept in memory for transcription and are not applied as questionnaire facts.

Audio replies, current student eligibility matching, artisan eligibility matching, state-specific scheme matching and an automated document-change monitor are not running. The proposed monitor must quarantine changes for human review; it must never auto-approve new eligibility rules.

## Re-linking after a 401

A 401 logged-out response means the saved WhatsApp session was rejected; the bot stops reconnecting. Stop the bot, and with the account owner's consent move `server/.baileys-auth` to a secure location outside the repository as a backup. Do not share or commit it. Restart the bot to create a fresh pairing request, then link the intended WhatsApp account via Linked devices. A successful connection must be verified on the phone; do not assume re-linking resolves every 401. For phone-number pairing, start PowerShell with `$env:YOJANA_PAIRING_MODE='code'` before running `node server/whatsapp-prototype.mjs` and follow the prompts.
