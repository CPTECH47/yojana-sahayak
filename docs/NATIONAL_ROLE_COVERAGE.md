# National role coverage, 31 October 2026

One retrieval service and one deterministic recommendation service support all five roles. Role choices order questions; they do not establish eligibility. The model selects pinned answer IDs, while rule evaluation uses confirmed boolean answers. No model-written eligibility rule or approval percentage is rendered. New discoveries require review before entering either layer.

| Role | First checks | Further selected checks |
| --- | --- | --- |
| Farmer | PM-KISAN, PM-KMY | PM-SYM, PMUY |
| Student | NMMSS, fresh Class IX only | PMUY household check |
| Worker | PM-SYM | PMUY, PM-KISAN |
| Artisan/craft worker | PM Vishwakarma | PM-SYM, PMUY |
| Family/other citizen | PMUY | PM-SYM, PM-KISAN |

The further checks ask their own questions. Occupations can overlap; a student is not assumed to be an adult applicant or worker. Already-failed candidates stop asking questions. RESULTS offers an incomplete comparison at any time; unknowns cannot become positive answers. Counting satisfied selected conditions ranks the results within status groups; it is not a calibrated likelihood of official approval.

## Added official evidence

All three pages were downloaded over verified HTTPS, hashed, extracted and compared against the named sections on 31 October 2026. Only concise original summaries and metadata are committed. Private immutable snapshots and reviewer inputs remain ignored. The reviewer field explicitly identifies assistant review; independent team review is required before releasing these additions. The 30 November review expiry is an operator control and does not assert an application deadline.

| Document | Issuing body/date | URL | Reviewed locators |
| --- | --- | --- | --- |
| Securing Farmers’ Future with Dignity: 7 Years of PM-KMY | Agriculture Ministry / PIB, 11 September 2026 | [Official backgrounder](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2309204&lang=1&reg=48) | Who Can Benefit block 21; exclusions blocks 27–49; pension/enrolment blocks 17, 53–54, 202–204 |
| NMMSS 2026-27 ministry policy summary | Education Ministry / PIB, 1 September 2026 | [Official summary](https://www.pib.gov.in/newsite/erelcontent.aspx?lang=2&reg=48&relid=294184) | Policy blocks 18–19; portal procedure blocks 16, 21. Historical calendar excluded. |
| PM Vishwakarma: Strengthening Traditional Artisans and Craftspeople | MSME Ministry / PIB, 16 September 2026 | [Official backgrounder](https://www.pib.gov.in/PressNoteDetails.aspx?ModuleId=3&NoteId=159998&lang=1&reg=1) | Eligibility blocks 32–36; trades/registration blocks 40–70 |

Snapshot SHA-256 values, in table order:

```
24889118e2c2d261011e975f05b71ca5f14d20d90415b67d0aee69f562b1e6af
968712e5d7c27923f970b1b2d1d8c34296f7996fd5502bdaa4a085e606dec734
d70a7f7d7d6fcca3f80fe0f24b2e198ef4cc48aefc53c84481ed11e8278cddb0
```

Readable passages are `pmkmy-policy-2026:1–3`, `nmmss-policy-2026:1–2` and `pmvishwakarma-policy-2026:1–2` in `corpus/passages.json`. Rule and answer pins are separate. A changed or expired passage removes the corresponding rules; the workflow cannot update those pins.

## API fields

The existing single-profile request and alternative profiles array accept these additions. All listed fields are boolean; omitted, null or non-boolean values remain unknown.

| scheme_id | Boolean fields | Scope |
| --- | --- | --- |
| pm-kmy | small_marginal_land_up_to_2ha, age_18_to_40, recorded_on_2019_08_01, other_pension_coverage, other_kmy_exclusion | Selected entry and exclusion checks. Contributions and full exclusion interpretation require CSC confirmation. |
| nmmss | fresh_class_ix_selected, eligible_school, parental_income_at_most_350000, class_vii_marks_requirement | Fresh Class IX selection; renewal, entry-test applications, quotas and remaining exclusions are not decided here. |
| pm-vishwakarma | notified_trade_active, age_at_least_18, self_employed_unorganised, similar_loan_exclusion, family_member_registered, government_service_family | Selected registration conditions, including the repaid-loan exception. Current intake and approval remain unconfirmed. |

Each new result includes a localized `scope_note`. Unsupported schemes remain invalid. Supplying both profile forms, duplicate scheme IDs or unsupported bulk languages is invalid. Evidence failure produces an explicit unavailable result rather than a fabricated match.

## Verification and remaining limits

`server/fixtures/national-profiles.json` contains six wholly fictional profiles without names, phone numbers or identity documents. Tests exercise their positive, opposite-answer, missing-answer and changed-evidence cases, all five role routes, correction, mid-check questions, language changes, SAVE/RESUME/DELETE, and source expiry. These tests do not establish policy completeness, speech accuracy or real WhatsApp delivery.

All dates and present application intake must be checked separately. PMFBY/state/crop-season rules and additional scholarships, worker and household programmes remain outside this initial six-scheme set. The daily registry includes thirteen bounded discovery pages; it cannot guarantee discovery of every government announcement. New findings remain review candidates. SMS integration and live handset testing of this revision are pending.
