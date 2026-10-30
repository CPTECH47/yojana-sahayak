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

## Current release gate

Before calling the prototype ready, verify the required source count, cited Hindi and English answers, insufficient-evidence behavior, fictional match/exclusion/unknown cases, and the complete judge journey. Record exact results in the pull request or QA issue. Do not put credentials or real beneficiary information in the repository.
