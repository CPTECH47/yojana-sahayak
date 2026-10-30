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
5. Answers stay in per-chat process memory until completion or restart. The bot asks for no Aadhaar or bank details. It does not make an official eligibility decision.
6. For ordinary scheme questions, the bot retrieves approved passages and includes source title, authority, locator and URL. Time-sensitive sources expire from retrieval.

## How the pilot reduces unsupported answers

- Retrieval reads only manifest sources marked `approved`; expired sources are filtered out by date.
- The model is given retrieved passages and constrained to cite only their evidence IDs. A missing passage, empty draft, or unsupported evidence ID produces an insufficient-evidence response.
- Every numeric claim in the draft must appear in the cited passages. This blocks many invented amounts, percentages and dates.
- Scheme checks are explicit code and cite PM-KISAN, PMUY or PM-SYM sources. Unknown profile answers remain `needs_information`; results say `official_decision: false`.
- Dates and version context are retained with source records; the bot points to live official status checks when the result depends on an individual application.

These controls lower risk, but they cannot guarantee that a language model never misstates a non-numeric fact or translation. The response must always be treated as guidance, not a government decision. For a consequential question, the user should open the cited source or contact the official helpline/help desk.

## Not implemented yet

This repository currently accepts text only in the Baileys route. Voice transcription/audio replies, current student eligibility matching, artisan eligibility matching, state-specific scheme matching and an automated document-change monitor are not running. The proposed monitor must quarantine changes for human review; it must never auto-approve new eligibility rules.
