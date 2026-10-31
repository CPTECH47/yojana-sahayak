# Yojana Sahayak — project brief

**Captain and server integration:** Charchit. **Status:** working pilot under development.

## Official INNOVISTA problem 03

Build an assistant that answers government-scheme questions in Hindi and English with a named source document, and helps a person find schemes they may qualify for. The minimum working version requires **10–20 public scheme documents**, runtime retrieval of relevant passages before answering, and a short eligibility questionnaire. A working prototype, live demo, readable source/setup instructions and future ideas are submission items. Use public or sample data and do not submit real personal information. Voice, more languages and a WhatsApp-style chat are bonus goals.

The exact judging weights, submission deadline and project URL have not been supplied to this repository.

## One judge journey

A fictional farmer in Uttarakhand asks about PM-KISAN, confirms sample landholding and exclusion answers, receives a preliminary match status with reasons, asks a new Hindi question and opens the cited official document. A fictional student then asks about NMMSS. A family can ask about PMUY, and a help-desk volunteer can share the citation. An unsupported question must receive a clear no-evidence reply. A reviewed document change should alter the answer after re-ingestion.

No result is an official eligibility decision or government endorsement. A dedicated WhatsApp number is an optional later setup until linked and tested. The present Baileys route uses an explicit `YOJANA ` prefix during personal-number testing.

## Agreed API contract for the first integration slice

`POST /api/chat` accepts `{ "question": string, "language"?: "en"|"hi"|"pa", "scheme_id"?: string }`. It returns `status` (`answered`, `clarify`, `insufficient_evidence`, `invalid_request` or `error`), `language`, `scheme_id`, `answer_text`, `reason_code` and `citations[]`. Each citation contains `evidence_id`, `document_id`, `title`, `authority`, `url`, `locator` and `verified_at`.

`POST /api/recommend` accepts `{ "language"?: "en"|"hi", "profile": { "scheme_id"?: "pm-kisan"|"pmuy"|"pm-sym", ...scheme-specific boolean answers } }`. If `scheme_id` is omitted, it defaults to the original PM-KISAN pilot. The supported profile fields are: PM-KISAN `owns_cultivable_land`, `income_tax_payer_last_year`, `practising_registered_professional`, `other_official_exclusion`; PMUY `adult_woman_18_plus`, `household_has_existing_lpg`, `can_submit_deprivation_declaration`; PM-SYM `age_18_to_40`, `monthly_income_at_most_15000`, `unorganised_worker`, `covered_by_epf_esic_nps`, `income_tax_payer`, `receives_other_government_pension`. It returns `results[]` with `scheme_id`, `status` (`potential_match`, `needs_information` or `not_matched`), localized `reasons`, `missing_fields`, `citations` and `official_decision: false`. Student and artisan paths are information-only because current reviewed eligibility rules are not in this pilot.

## Repair-branch contract additions

On codex/project-hardening, chat accepts only en/hi and returns mode (model_selected or extractive) and fact_ids. Final prose comes from pinned bilingual records. Model output is never displayed. Recommendation returns insufficient_evidence with an empty results list if any required rule passage is unavailable or changed. /api/ready separately checks model availability and the minimum active source count. Saved fictional profiles require SAVE, alert consent requires ALERTS ON, and STOP/DELETE revoke delivery/retention. See docs/HARDENING.md for operation and the changes awaiting captain merge.

## Current limits and owner boundaries

The PM-KISAN `practising_registered_professional` field means a farmer-family member is a doctor, engineer, lawyer, chartered accountant or architect registered with a professional body and currently practising. Callers must not set it based on an unrelated occupation. Result messages explain reported failed checks and how to correct wrong answers; they do not promise a way to become eligible. PMUY documents link to its official application page; other scheme document lists require review.

The corpus now has ten reviewed official documents/pages; source metadata, dates, hashes, passage locators and expiry are recorded under `corpus/`. myScheme, India.gov.in and data.gov.in are discovery sources only; answer evidence comes from the official issuing portal or ministry. The WhatsApp bot asks a short role-based questionnaire and makes preliminary PM-KISAN, PMUY and PM-SYM checks; student and artisan journeys provide relevant scheme information without claiming current eligibility. Answers are session-only and do not request Aadhaar or bank details. Local Qwen is required for generated chat answers. The bilingual web journey is pushed on `ui/main-journey` as an optional reference; the team priority is the WhatsApp-first text journey. Supabase scheme storage, public deployment and voice are not yet verified. Charchit owns server/model integration; Pulkit owns reviewed source evidence and data setup; Tejas owns Hindi/English UX and fictional-profile/citation QA. Mansi owns independent user-flow QA; Jaanvi owns the demo script and presentation. See [team check-ins](docs/TEAM_CHECKINS.md) for ownership and the eight-minute update rhythm. Coordinate changes to shared contracts before editing them.
