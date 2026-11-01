# WhatsApp user flow and evidence safeguards

## Who the pilot is for

- Citizens and families who need a plain-language explanation of a scheme, its stated conditions, benefits, documents or application route.
- Farmers asking about PM-KISAN and students asking about NMMSS.
- Volunteers and help-desk staff who need a source link and passage locator to help someone continue with the official programme.
- The current questionnaire checks selected conditions for PM-KISAN, PMUY and PM-SYM. Students and artisans receive a relevant information link, not an eligibility match, because current reviewed rules are not available for those checks.

## WhatsApp journey

The current Baileys entry point uses PR #10's six-scheme comparison by default. Farmer checks start with PM-KISAN and PM-KMY; student, worker, artisan and family roles start with NMMSS, PM-SYM, PM Vishwakarma and PMUY respectively. See [national role coverage](NATIONAL_ROLE_COVERAGE.md) for exact selected rules and source limits. Confirmed natural-profile facts carry into comparison; ambiguous income periods are clarified first. Results keep the optional CSC yes/no offer. Additional discovered pages remain separately labelled under review. `YOJANA_MULTI_SCHEME=0` selects the earlier single-scheme route; `YOJANA_NATURAL_FLOW=0` restores the earlier default menu route as well.

1. A person sends `YOJANA START` in a direct chat. The prefix is required during the prototype test on a personal number.
2. The bot greets the person and offers `1` Hindi, `2` English, or a Hindi/English text or voice description of their situation. A voice transcript must be confirmed before use. The bot extracts only explicit, supported profile facts and shows them for a second confirmation. It searches across approved scheme passages and shows cited information leads; newly discovered official pages appear separately as *under review*. Confirmed answers to reviewed rule conditions are not asked again. An income without an explicit period triggers a separate period question. The role menu remains available.
3. Farmers, families, and workers get **one scheme-specific question per reply**. A NO answer still advances; the result appears only after every question has been asked. In both languages: `1` Yes, `2` No, `3` Back, `4` Skip, `5` Cancel. Word commands also work. Invalid replies repeat the current question and offer bold `YOJANA START` to restart. Outside an active conversation, the `YOJANA ` prefix remains required on the personal number.
4. The bot checks selected PM-KISAN, PMUY, or PM-SYM rules against reviewed passages and returns a cited preliminary result. It then asks whether nearby service-centre help is wanted. Only after YES/1 does it request a PIN or town and provide a Google Maps search link plus the official CSC locator; NO/2 ends this optional step. Map listings are not verified CSCs. Student and artisan paths show an official information link but do not claim an eligibility match.
5. Unsaved answers stay in process memory. Completed answers remain editable during the session. SAVE separately consents to encrypted local retention of supplied profile details for 30 days; RESUME restores and re-evaluates them after restart. ALERTS ON separately opts into reviewed updates, STOP revokes delivery consent, and DELETE erases saved profile information. The bot asks for no Aadhaar, bank details or ID numbers. Voice sent through Sarvam uses its external transcription service when configured.
6. For ordinary scheme questions, the bot retrieves approved passages and includes source title, authority, locator and URL. Time-sensitive sources expire from retrieval.

A person may also begin with a direct named scheme question, for example `YOJANA PM-KISAN benefit amount?`, without completing the role menu. In the same chat, a later question such as `YOJANA How much per year?` uses that scheme as context. An explicitly named different scheme overrides the previous one. During a questionnaire, the selected scheme is the default for follow-up questions; a completed fictional profile can answer the narrow personal question “Am I eligible?” with the same preliminary rule check and citations. No private identifier is needed, and unknown facts still produce a clarification or insufficient-evidence response.

## How the pilot reduces unsupported answers

Abuse controls run before downloads or AI calls. Each chat has one active request, short text/voice burst allowances and a clear wait response if busy. Different numeric replies are not deduplicated. Repeated factual questions can reuse a five-minute evidence-bound fact-ID selection; sources are still rechecked. See [spam protection](SPAM_PROTECTION.md) for exact limits and recovery behavior.

- Retrieval reads only manifest sources marked `approved`; expired sources are filtered out by date.
- The model is given retrieved passages and constrained to cite only their evidence IDs. A missing passage, empty draft, or unsupported evidence ID produces an insufficient-evidence response.
- The model selects only fact IDs from retrieved pinned records. Final bilingual wording comes from those records, including amounts and periods; model prose and model-generated links are never displayed.
- Scheme checks are explicit code and cite PM-KISAN, PMUY or PM-SYM sources. Unknown profile answers remain `needs_information`; results say `official_decision: false`.
- Qwen proposes candidate role, period and narrowly supported rule facts. Code checks exact statements and asks for confirmation; income amount comes from visible text, never model output. Income and period must be confirmed before a worker income threshold is checked. Hindi search terms are expanded to a small reviewed English vocabulary; factual retrieval still filters by scheme and approved source.
- Cross-scheme lead search reads only approved passages. Qwen may select passage IDs, but it cannot supply a source link, scheme name or eligibility decision. A failed model call falls back to audience-word matching. A newly approved scheme can enter this lead search from the corpus without adding a hard-coded scheme alias. New automatically found pages are shown only with an explicit *under review* label; they cannot supply factual answers or a match.
- Dates and version context are retained with source records; the bot points to live official status checks when the result depends on an individual application.

These controls lower risk, but they cannot guarantee that a language model never misstates a non-numeric fact or translation. The response must always be treated as guidance, not a government decision. For a consequential question, the user should open the cited source or contact the official helpline/help desk.

## Voice and remaining work

Hindi and English voice notes are accepted in an active direct chat without a voice command. The bot shows the recognised text; reply 1 or `YOJANA CONFIRM` to use it, 2 or `YOJANA CANCEL` to discard it, or `YOJANA EDIT <correct sentence>` to fix words before confirming. Confirmed voice questions use the same current-scheme context and evidence checks as text questions. Voice questions receive cited text answers only. Local faster-whisper remains an option. With `YOJANA_STT_PROVIDER=sarvam`, recordings are sent to Sarvam Saaras v4 and use credits. One paired-phone Hindi question was transcribed correctly and answered with a cited text reply; this does not establish accuracy across languages or accents.

Natural profile descriptions and descriptive answers to a condition use local Qwen to propose structured facts. Code accepts only exact quoted, supported statements and narrowly recognized literal statements, then asks the person to confirm before applying them. The bot still asks each unanswered condition separately and the final recommendation is computed by sourced code rules, not generated model prose. If a reply is ambiguous, the same question is repeated with numbered yes/no/skip choices. Only PM-KISAN, PMUY, and PM-SYM currently have selected reviewed rule checks. Student and artisan schemes are information leads. `YOJANA_NATURAL_FLOW=0` restores the earlier menu behavior without reverting other team commits.

`YOJANA_NATURAL_FLOW=0` disables the new free-form profile path and returns to the earlier language/role flow. The baseline before this feature is commit `e9375d100496cbd7f362d6bc85c70fa5fb9a8c1b`. Keep the CSC offer and numbered answer controls when disabling the new path. Restart the bot after changing the setting. No real-user phone retest of this new path has been completed yet.

Audio replies, current student eligibility matching, artisan eligibility matching and state-specific scheme matching are not running. A source scan runs when the WhatsApp process starts and every 12 hours while it remains running. It checks the approved URLs and selected official discovery pages, saving new or changed documents as local candidates. Coverage is limited to those seed pages and linked documents; it is not a complete feed of every government scheme. The scan never auto-approves eligibility rules. Run `npm.cmd run sources:update` for a one-time scan; install `requirements-ingest.txt` first. Set `YOJANA_SOURCE_UPDATES=0` to turn the scheduled scan off.

## Startup and missing-reply checks

Run `node server/whatsapp-prototype.mjs` in PowerShell from the project directory. Copy only the command, without the shell's `PS C:\...>` prompt. Send `YOJANA START` in a direct **WhatsApp chat from a different account to the linked bot account**, never in PowerShell or the bot's Message yourself chat. The bot deliberately ignores its own messages and groups.

`Another bot process owns this state` means a process already holds the session/state lock. Do not start another copy, delete the lock, or stop every Node process. Inspect the existing bot's status first. `WhatsApp connected` confirms the connection, not successful decryption or a delivered reply. Send one fresh command after connection; historical/offline `append` batches are intentionally not replayed through the questionnaire.

For diagnosis only, set `$env:YOJANA_DIAGNOSTICS='1'` before starting the single bot process. It logs aggregate batch counts and processing status without message bodies, phone numbers, JIDs, message IDs or authentication material. A ciphertext count indicates a message could not be decrypted, while a decoded START with a non-sent outcome needs handler/delivery investigation. Leave diagnostics off during routine use; never share raw session files or unreviewed library logs.

## Re-linking after a 401

A 401 logged-out response means the saved WhatsApp session was rejected; the bot stops reconnecting. Stop the bot, and with the account owner's consent move `server/.baileys-auth` to a secure location outside the repository as a backup. Do not share or commit it. Restart the bot to create a fresh pairing request, then link the intended WhatsApp account via Linked devices. A successful connection must be verified on the phone; do not assume re-linking resolves every 401. For phone-number pairing, start PowerShell with `$env:YOJANA_PAIRING_MODE='code'` before running `node server/whatsapp-prototype.mjs` and follow the prompts.
