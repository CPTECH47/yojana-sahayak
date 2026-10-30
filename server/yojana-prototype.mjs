import { pathToFileURL } from 'node:url';

// A small, source-backed rules rehearsal. This is not an official eligibility decision.
// Source reviewed: https://pmkisan.gov.in/ (PM-KISAN Scheme and Scheme Exclusion).
export const source = {
  title: 'PM-KISAN Scheme and Scheme Exclusion',
  url: 'https://pmkisan.gov.in/',
  checkedOn: '2026-10-30'
};

export function assessPmkisan(profile) {
  const reasons = [];
  const missing = [];
  const ask = (field, label) => {
    if (typeof profile[field] !== 'boolean') missing.push(label);
    return profile[field];
  };

  const ownsCultivableLand = ask('ownsCultivableLand', 'Does your family own cultivable land?');
  const paidIncomeTaxLastYear = ask('paidIncomeTaxLastYear', 'Did anyone in the family pay income tax in the last assessment year?');
  const practisingRegisteredProfessional = ask('practisingRegisteredProfessional', 'Is anyone in the family a registered professional practising that profession?');

  if (ownsCultivableLand === false) reasons.push('The published scheme is for landholding farmer families.');
  if (paidIncomeTaxLastYear === true) reasons.push('The published exclusions include income-tax payers.');
  if (practisingRegisteredProfessional === true) reasons.push('The published exclusions include practising registered professionals such as engineers.');

  const status = reasons.length ? 'does_not_match_selected_rules'
    : missing.length ? 'more_information_needed'
    : 'possible_match_check_full_guidelines';

  if (status === 'possible_match_check_full_guidelines') {
    reasons.push('The supplied answers pass these three selected checks. Other official exclusions still need review.');
  }

  return { scheme: 'PM-KISAN', status, reasons, missing, source };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const examples = [
    { label: 'landholding farmer, no selected exclusion', profile: { ownsCultivableLand: true, paidIncomeTaxLastYear: false, practisingRegisteredProfessional: false } },
    { label: 'practising engineer', profile: { ownsCultivableLand: true, paidIncomeTaxLastYear: false, practisingRegisteredProfessional: true } },
    { label: 'missing landholding answer', profile: { paidIncomeTaxLastYear: false, practisingRegisteredProfessional: false } }
  ];
  for (const example of examples) console.log(JSON.stringify({ label: example.label, result: assessPmkisan(example.profile) }));
}
