# Application guidance research (review draft)

Contributor: Pulkit  
Branch: `data/supabase`  
Checked: 2026-10-31  
Status: research draft; not runtime answer data or an eligibility decision. Pages below are discovery leads. Before indexing, save a permitted source snapshot, hash it, confirm effective version/date and page/section locator, manually review passages, and agree the shared fields with Charchit. Do not ask people to send Aadhaar, bank, health, pregnancy, or child records to WhatsApp.

## Agriculture: PM-KISAN

- [Official portal](https://pmkisan.gov.in/) provides registration, e-KYC, status, and grievance paths. [Registration](https://pmkisan.gov.in/RegistrationFormupdated.aspx).
- [Revised operational guidelines](https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines%28English%29.pdf) are stated revised 29 March 2020. They describe land records, family definition, exclusions, and state verification; historical text alone is not current eligibility proof.
- Occupation alone is insufficient. Verify current registration alternatives and the relevant State/UT workflow. Do not collect registration fields; route mismatch, payment, and grievance cases to the official portal/state process.

## LPG: PMUY

- The [Ujjwala 2.0 application page](https://pmuy.gov.in/ujjwala2.html) describes a woman aged 18+, no other OMC LPG connection in the household, and qualification as a poor household through the prescribed declaration. It lists KYC, identity/address, household-composition, family Aadhaar, bank and declaration documents. Apply through distributor or online portal.
- [FAQ](https://pmuy.gov.in/faq.html) and [scheme page](https://pmuy.gov.in/about.html) need reconciliation with the current page before answering benefit amounts or open application status. The linked generic declaration's issuer and effective date are unclear; it does not establish the PMUY deprivation-category test. See `PILOT_CANDIDATES.md`; keep it out of runtime matching.

## Informal workers: PM-SYM

- [Maandhan portal](https://maandhan.in/) and [Ministry information note](https://www.labour.gov.in/static/uploads/2025/07/cdc13db52c1398b561576094a81b7b7d.pdf) describe a voluntary contributory pension for eligible unorganised workers. The note gives entry age 18–40 and monthly income up to Rs 15,000, with exclusions including EPF/ESIC/NPS coverage, income-tax payment, and another government pension.
- Confirm current enrollment, age-linked contribution and required documents at Maandhan/CSC. The note is not an enrollment decision. Never collect Aadhaar, bank, or phone details in chat.

## Women and children: PMMVY

- [Ministry scheme page](https://www.wcd.gov.in/public/women/pradhan-mantri-matru-vandana-yojna) and [FAQ](https://spniwcd.wcd.gov.in/pradhan-mantri-matru-vandana-yojna/faqs) describe PMMVY 2.0 benefits and listed eligibility proofs. Timing, instalment conditions, and State/UT practice still need checking against current rules.
- Refer applicants to Anganwadi/ASHA or the official citizen portal. Do not request pregnancy, child, Aadhaar, or bank records over WhatsApp.

## Health: PM-JAY

- [NHA](https://nha.gov.in/), [beneficiary charter](https://nha.gov.in/img/resources/Adhikar-Patra.pdf), and [eligibility help flyer](https://nha.gov.in/img/resources/Ayushman-Mitra-Flyer-english.pdf) describe official eligibility-check routes; [beneficiary portal](https://beneficiary.nha.gov.in/). Legacy family eligibility and the 70+ senior-citizen route differ. Do not infer eligibility from income alone.
- NHA materials list helpline 14555 and referral through CSC/empanelled hospital. Use the portal for actual eligibility; never ask for health or identity records in WhatsApp.

## Fictional integration profiles

- PMUY possible match: fictional adult woman reports no household OMC connection; declaration and documents unverified. Say possible match only.
- PMUY potential exclusion: fictional household reports an OMC connection in a covered family member's name. Mark reported condition unmet pending official verification; do not suggest concealing it.
- PM-SYM missing facts: fictional worker has not shared age band, income band, or EPF/ESIC/NPS coverage. Mark unknown; ask only coarse non-identifying questions.
- PMMVY missing proof: fictional adult has not identified which listed eligibility proof applies. Offer official checklist and local help; do not claim a match.
- PM-JAY senior route: fictional Ravi, age 72, asks about enrollment. Explain the separate 70+ route and direct to NHA portal/14555/CSC; do not claim enrolled.

## Review gates

- Snapshot/hash and source rights are still needed for each candidate; exact current PM-KISAN alternatives, PM-SYM contributions, PMMVY timelines, and PM-JAY route details need review.
- Agree manifest, passage, and rule fields with Charchit. Only reviewed, current evidence may become answerable. Preserve source-version conflicts and unknowns explicitly; never turn research leads into approved eligibility rules.
