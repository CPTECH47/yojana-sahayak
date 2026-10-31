# WhatsApp user flow and evidence safeguards

## Who the pilot is for

- Citizens and families who need a plain-language explanation of a scheme, its stated conditions, benefits, documents or application route.
- Farmers asking about PM-KISAN and students asking about NMMSS.
- Volunteers and help-desk staff who need a source link and passage locator to help someone continue with the official programme.
- The current questionnaire checks selected conditions for PM-KISAN, PMUY and PM-SYM. Students and artisans receive a relevant information link, not an eligibility match, because current reviewed rules are not available for those checks.

## WhatsApp journey

1. A person sends `YOJANA START` in a direct chat. The prefix is required during the prototype test on a personal number.
2. The bot greets the person and offers `1` Hindi, `2` English, or a Hindi/English text or voice description of their situation. A voice transcript must be confirmed before use. A free-form profile summary also requires confirmation; an income without an explicit period triggers a separate period question. The role menu remains available.
3. Farmers, families, and workers get **one scheme-specific question per reply**. A NO answer still advances; the result appears only after every question has been asked. In both languages: `1` Yes, `2` No, `3` Back, `4` Skip, `5` Cancel. Word commands also work. Invalid replies repeat the current question and offer bold `YOJANA START` to restart. Outside an active conversation, the `YOJANA ` prefix remains required on the personal number.
4. The bot checks selected PM-KISAN, PMUY, or PM-SYM rules against reviewed passages and returns a cited preliminary result. It then asks whether nearby service-centre help is wanted. Only after YES/1 does it request a PIN or town and provide a Google Maps search link plus the official CSC locator; NO/2 ends this optional step. Map listings are not verified CSCs. Student and artisan paths show an official information link but do not claim an eligibility match.
5. Unsaved answers stay in process memory. Completed answers remain editable during the session. SAVE separately consents to encrypted local retention of supplied profile details for 30 days; RESUME restores and re-evaluates them after restart. ALERTS ON separately opts into reviewed updates, STOP revokes delivery consent, and DELETE erases saved profile information. The bot asks for no Aadhaar, bank details or ID numbers. Voice sent through Sarvam uses its external transcription service when configured.
6. For ordinary scheme questions, the bot retrieves approved passages and includes source title, authority, locator and URL. Time-sensitive sources expire from retrieval.

A person may also begin with a direct named scheme question, for example `YOJANA PM-KISAN benefit amount?`, without completing the role menu. In the same chat, a later question such as `YOJANA How much per year?` uses that scheme as context. An explicitly named different scheme overrides the previous one. During a questionnaire, the selected scheme is the default for follow-up questions; a completed fictional profile can answer the narrow personal question “Am I eligible?” with the same preliminary rule check and citations. No private identifier is needed, and unknown facts still produce a clarification or insufficient-evidence response.

## How the pilot reduces unsupported answers

- Retrieval reads only manifest sources marked `approved`; expired sources are filtered out by date.
- The model is given retrieved passages and constrained to cite only their evidence IDs. A missing passage, empty draft, or unsupported evidence ID produces an insufficient-evidence response.
- The model selects only fact IDs from retrieved pinned records. Final bilingual wording comes from those records, including amounts and periods; model prose and model-generated links are never displayed.
- Scheme checks are explicit code and cite PM-KISAN, PMUY or PM-SYM sources. Unknown profile answers remain `needs_information`; results say `official_decision: false`.
- Qwen extracts only candidate role and income period. Code accepts a role only when the user's text explicitly names it; income amount comes from visible text, never model output. Income and period must be confirmed before a worker income threshold is checked. Hindi search terms are expanded to a small reviewed English vocabulary; retrieval still filters by scheme and approved source.
- Dates and version context are retained with source records; the bot points to live official status checks when the result depends on an individual application.

These controls lower risk, but they cannot guarantee that a language model never misstates a non-numeric fact or translation. The response must always be treated as guidance, not a government decision. For a consequential question, the user should open the cited source or contact the official helpline/help desk.

## Voice and remaining work

Hindi and English voice notes are accepted in an active direct chat without a voice command. The bot shows the recognised text; reply 1 or `YOJANA CONFIRM` to use it, 2 or `YOJANA CANCEL` to discard it, or `YOJANA EDIT <correct sentence>` to fix words before confirming. Confirmed voice questions use the same current-scheme context and evidence checks as text questions. Voice questions receive cited text answers only. Local faster-whisper remains an option. With `YOJANA_STT_PROVIDER=sarvam`, recordings are sent to Sarvam Saaras v4 and use credits. One paired-phone Hindi question was transcribed correctly and answered with a cited text reply; this does not establish accuracy across languages or accents.

`YOJANA_NATURAL_FLOW=0` disables the new free-form profile path and returns to the earlier language/role flow. The baseline before this feature is commit `e9375d100496cbd7f362d6bc85c70fa5fb9a8c1b`. Keep the CSC offer and numbered answer controls when disabling the new path. Restart the bot after changing the setting. No real-user phone retest of this new path has been completed yet.

Audio replies, current student eligibility matching, artisan eligibility matching, state-specific scheme matching and an automated document-change monitor are not running. The proposed monitor must quarantine changes for human review; it must never auto-approve new eligibility rules.

## Re-linking after a 401

A 401 logged-out response means the saved WhatsApp session was rejected; the bot stops reconnecting. Stop the bot, and with the account owner's consent move `server/.baileys-auth` to a secure location outside the repository as a backup. Do not share or commit it. Restart the bot to create a fresh pairing request, then link the intended WhatsApp account via Linked devices. A successful connection must be verified on the phone; do not assume re-linking resolves every 401. For phone-number pairing, start PowerShell with `$env:YOJANA_PAIRING_MODE='code'` before running `node server/whatsapp-prototype.mjs` and follow the prompts.
