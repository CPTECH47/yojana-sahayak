# Pilot source candidates: PMUY and PMFBY

Contributor: Pulkit. Checked: 2026-10-31. Status: **review required; not in the answer index**. This file records source passages and synthetic scenarios; it does not establish current scheme eligibility or application status. Existing manifest and API fields were not changed.

## PMUY official FAQ

- Document: Frequently Asked Questions on Ujjwala Scheme. Authority: Ministry of Petroleum and Natural Gas, Government of India. [Official FAQ](https://www.pmuy.gov.in/faq.html). Publication date: not stated; accessed 2026-10-31.
- Downloaded HTML snapshot SHA-256: `9306514438d2c607275b402053010242f9cd8b51cbba7186c9e2f3852e7e18b9`. The complete snapshot is currently in a local temporary audit directory, not in this repository; preserve an agreed snapshot before treating the hash as reproducible corpus evidence.
- Q1–Q2: the FAQ identifies an adult woman from a poor household and a deprivation declaration; it also says no LPG connection may be registered to a family member in the relevant family composition document. Q6 lists application documents with specific exceptions, including provisions for migrant applicants. These are extracted source passages in paraphrase; see the linked FAQ for exact wording.
- Review the full 14-point declaration, any categorical alternatives, amendments, application availability and local implementation before building rules. The page's sidebar and FAQ may represent different versions; its listed monetary assistance differs from the [current PMUY home page](https://pmuy.gov.in/index.aspx). Do not answer an amount or claim applications are open without reconciling current authoritative evidence.
- Synthetic scenarios: an adult woman, declaration condition documented, no household connection: **possible match pending remaining conditions**; an existing connection in a covered family member's name: **potential exclusion subject to verification**; unknown household connection: **need information**. These are test design expectations, not official decisions.

## PMFBY revamped operational guidelines

- Document: Pradhan Mantri Fasal Bima Yojana Revamped Operational Guidelines, effective Kharif 2020. Authority: Department of Agriculture, Cooperation and Farmers Welfare, Ministry of Agriculture and Farmers Welfare, Government of India. [Official PDF](https://pmfby.gov.in/pdf/Revamped%20Operational%20Guidelines_17th%20August%202020.pdf). Effective date: Kharif 2020; downloaded 2026-10-31.
- Local PDF snapshot, 157 pages, SHA-256: `fc57c66ee9a275309bdcf84a81398376075bdd8657d026c673ef363a3a7616f8`. Snapshot currently resides in a local temporary audit directory, not the repository. Preserve it in the agreed corpus location and confirm reuse terms before indexing.
- Page 13, section 3.1: farmers, including sharecroppers and tenants, can be covered when growing notified crops in notified areas and having an insurable interest; required documents and state notification conditions apply. Page 15, section 5.4: the 2020 version excludes losses from war, nuclear risks, malicious damage and other preventable risks. This is a historical extract, not a current guarantee of coverage.
- Extraction is readable on these selected pages but includes ligatures and replacement/control characters in other places; verify against the original PDF before index approval. The [official PMFBY site](https://www.pmfby.gov.in/) lists 2023 guidelines: review the newer text and the relevant state, crop and season notification before implementing these historical conditions. State-season coverage and deadlines are **unknown** until verified.
- Synthetic scenarios: tenant growing a notified crop in a notified area with insurable interest: **potential match pending notification, documents and current rules**; no notification confirmed: **need information**; a loss described as malicious damage: **historical exclusion candidate**, not an automated current outcome without newer-rule review.

## Review and integration gate

These two distinct public documents are candidate additions, not part of the current 3-document runtime corpus. The provided 86-URL directory is discovery only. For a count toward the required 10–20, preserve the source bytes and metadata, verify extraction, use rights, dates and current applicability, agree the shared schema with Charchit, and ensure the server cannot retrieve unreviewed content. No private profile or credential is included.


## PMUY-linked generic declaration form: manual extraction

- Official file: [Declaration for new LPG connection](https://www.pmuy.gov.in/Declaration_for_new_connection.pdf), linked from the [PMUY Ujjwala 2.0 application page](https://www.pmuy.gov.in/ujjwala2.html). The page distributes this form and its footer credits IOCL, BPCL and HPCL; neither page identifies the specific issuing body. **Issuer: unclear.**
- The PDF contains one page (46,167 bytes), SHA-256 `a2a346d9d4f2e283366031575c2950f7b51f2979f7408eb2e862175f016b96ac`. Accessed 2026-10-31. PDF metadata shows file creation 2015-01-06 20:55:14 +05:30, created using Toshiba e-STUDIO306. This is a file-creation timestamp, not a publication or effective date. **Publication/effective date: unstated.**
- `pypdf` extraction returned no text. I rendered page 1 at 180 dpi and manually read and visually checked the numbered declarations; the failure was text-layer extraction, not page readability. No OCR engine was used.
- Page 1, declarations 1–3: applicant affirms citizenship and age 18+, and that the applicant or form-defined household has no PSU LPG or domestic PNG connection. Household definition: spouses, unmarried children and dependent parents living together with a common kitchen.
- Page 1, declarations 4–6 and 9–11: form requests ration-card proof or an alternative, KYC with identity/address proof, domestic use at the declared address, address-change notification and accurate declarations. Declarations 7–8 address additional LPG installations in the same kitchen and use of a second cylinder. These are paraphrases, not verbatim transcription.
- Limitation: this is a generic domestic LPG connection form, not the PMUY-specific deprivation-category declaration referenced by the FAQ. Do not use it alone for PMUY eligibility or exclusion and keep it out of answer retrieval pending source/issuer review. Unknown household connection status remains unknown; do not coach users to omit or alter information.
