# WhatsApp user flow and evidence safeguards

## Who the pilot is for

- Citizens and families who need a plain-language explanation of a scheme, its stated conditions, benefits, documents or application route.
- Farmers asking about PM-KISAN and students asking about NMMSS.
- Volunteers and help-desk staff who need a source link and passage locator to help someone continue with the official programme.
- The corpus also contains introductory information on PMUY, PM Vishwakarma and PM-SYM. A document in the corpus does not mean the bot has a full eligibility questionnaire for that scheme.

## WhatsApp journey

1. A person sends `YOJANA START` in a direct chat. The prefix is required during the prototype test on a personal number.
2. The bot greets the person and asks them to reply `YOJANA HINDI` or `YOJANA ENGLISH`. It stores that choice by direct-chat ID in memory for this process session; a restart clears the choices.
3. The bot shows next steps in the chosen language. It then finds approved passages for the relevant scheme and asks the local model to write a concise answer using only those passages.
4. An answer includes the official document title, issuing authority, page/section and source URL. Time-sensitive claims show when the source was checked.
5. A match result is preliminary. Missing answers stay unknown; the user can ask a volunteer or confirm on the official portal.

## How the pilot reduces unsupported answers

- Retrieval reads only manifest sources marked `approved`; expired sources are filtered out by date.
- The model is given retrieved passages and constrained to cite only their evidence IDs. A missing passage, empty draft, or unsupported evidence ID produces an insufficient-evidence response.
- Every numeric claim in the draft must appear in the cited passages. This blocks many invented amounts, percentages and dates.
- Scheme rules used for matching are explicit code and cite the PM-KISAN guideline. Unknown profile answers remain `needs_information`; the result says `official_decision: false`.
- Dates and version context are retained with source records; the bot points to live official status checks when the result depends on an individual application.

These controls lower risk, but they cannot guarantee that a language model never misstates a non-numeric fact or translation. The response must always be treated as guidance, not a government decision. For a consequential question, the user should open the cited source or contact the official helpline/help desk.

## Not implemented yet

This repository currently accepts text only in the Baileys route. Voice transcription/audio replies, multi-turn profile capture in WhatsApp, full questionnaires for students/families/workers, and an automated document-change monitor are not running. The proposed monitor must quarantine changes for human review; it must never auto-approve new eligibility rules.
