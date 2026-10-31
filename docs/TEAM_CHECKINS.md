# Team check-ins and current ownership

This page is the shared coordination note for the Yojana Sahayak team.

## Eight-minute check-in

During active work, use a quick check-in about every eight minutes. Each owner posts a short update on their assigned GitHub issue or pull request using this format:

- **Done:** the exact files or behavior completed
- **Next:** the next small task
- **Blocked:** the specific dependency, or `none`
- **Checked:** the command, device check and result; say `not tested` when applicable

The captain checks new commits, pull requests, CI results and contract changes, then records integration blockers and the next decision. The eight-minute cadence is a team routine; it does not mean a background bot is running.

## Current ownership

- **Charchit — server and integration:** owns `server/`, `/api/chat`, `/api/recommend`, Baileys integration, model checks and deployment. Keep the `YOJANA ` prefix during personal-number tests. Report actual model/phone/deployment checks separately from mock or local tests.
- **Pulkit — sources and data:** owns `data/supabase`, source review and corpus evidence. PR #5 is an audit handoff; only reviewed, reproducible public sources count toward the 10–20 document target. Keep candidate or historical rules out of answer retrieval until verified.
- **Tejas — UX and WhatsApp QA:** owns the Hindi/English message-copy and fictional-profile/evidence-link QA in issue #4. The pushed web journey is optional reference work; pause new UI implementation while the WhatsApp-first path is built. Mark phone/model/link behavior untested unless directly checked.
- **Mansi — independent user-flow QA:** review the fictional farmer/student journeys, missing answers, unsupported questions and citation targets. Record the first failure and exact reproduction steps in the QA issue.
- **Jaanvi — demo and submission:** draft the short presentation and demo script from features the team has actually tested. Include setup, source limitations, unsupported cases and what remains planned. Do not claim an unverified deployment, number or language.

If an owner cannot take an assigned task, they should post the blocker on the issue so the captain can reassign it.

## Next tasks: recommendation guidance and coverage

**Pulkit — sources and data (`data/supabase` branch):**

- Review current official application pages for PM-KISAN, PMUY, and PM-SYM. For each, record required documents, conditional alternatives, application steps, issuing authority, link, access date, and exact page or section. Mark uncertainty or unavailable information explicitly.
- Propose source-backed guidance for failed and missing conditions. Separate correctable input mistakes from conditions that cannot simply be changed; never suggest giving false information or guarantee eligibility.
- Investigate one women/child scheme and one health scheme using current official documents. First add reviewed evidence and fictional profiles; agree rule fields with Charchit before implementing matching. Do not claim coverage until the checks and citations are integrated.
- Submit a PR with the changed files, evidence, checks and remaining gaps. Do not commit real documents containing personal information or credentials.

**Tejas — WhatsApp UX and QA (own branch):**

- With a consenting second phone, check the revised Hindi and English results for a fictional match, failed condition, skipped answer, corrected answer, source link and CSC locator. Record the exact observed output and any failure; do not claim phone checks until performed.
- Review the bullet formatting and clear next-step wording with the captain. Check that document guidance distinguishes an official list from unverified information and does not ask people to send Aadhaar or bank details to the bot.
- Test the revised PM-KISAN profession question for the named categories; coordinate any server edits with Charchit. Report results and proposed copy in a PR or the existing WhatsApp QA issue.

Both owners should read this section before starting and report Done / Next / Blocked / Checked. The CSC link requires users to select their own area; automatic centre lookup is not implemented.

## Current release gate

Before calling the prototype ready, verify the required source count, cited Hindi and English answers, insufficient-evidence behavior, fictional match/exclusion/unknown cases, and the complete judge journey. Record exact results in the pull request or QA issue. Do not put credentials or real beneficiary information in the repository.
