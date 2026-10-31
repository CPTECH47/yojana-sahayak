import { questionSets } from './scheme-questions.mjs';
import { schemes } from './corpus.mjs';

export const schemeQuestions = {
  'pm-kisan': questionSets.farmer,
  'pm-sym': questionSets.worker,
  pmuy: questionSets.family,
  'pm-kmy': questionSets['pm-kmy'],
  nmmss: questionSets.nmmss,
  'pm-vishwakarma': questionSets['pm-vishwakarma'],
};
const priorities = {
  farmer: ['pm-kisan', 'pm-kmy', 'pm-sym', 'pmuy'],
  student: ['nmmss', 'pmuy'],
  worker: ['pm-sym', 'pmuy', 'pm-kisan'],
  artisan: ['pm-vishwakarma', 'pm-sym', 'pmuy'],
  family: ['pmuy', 'pm-sym', 'pm-kisan']
};
const roleNumbers = { 1: 'farmer', 2: 'student', 3: 'worker', 4: 'artisan', 5: 'family' };

export function compareProfiles(input, recommend) {
  const profiles = input.profiles;
  if (!Array.isArray(profiles) || !profiles.length || profiles.length > 10 || Object.hasOwn(input, 'profile')
    || (input.language !== undefined && !['en', 'hi'].includes(input.language))
    || profiles.some(profile => !profile || !Object.hasOwn(schemeQuestions, profile.scheme_id))
    || new Set(profiles.map(profile => profile.scheme_id)).size !== profiles.length) {
    return { status: 'invalid_request', results: [], reason_code: 'invalid_profiles' };
  }
  const results = [];
  const unavailable = [];
  for (const profile of profiles) {
    const response = recommend({ profile, language: input.language });
    const item = response.results?.[0];
    if (!item) {
      unavailable.push(profile.scheme_id);
      continue;
    }
    const total = schemeQuestions[profile.scheme_id].length;
    const unknown = item.missing_fields.length;
    const failed = item.status === 'not_matched' ? item.reasons.length : 0;
    results.push({ ...item, condition_counts: { total, met: total - unknown - failed, failed, unknown } });
  }
  const order = { potential_match: 0, needs_information: 1, not_matched: 2 };
  results.sort((a, b) => order[a.status] - order[b.status]
    || b.condition_counts.met / b.condition_counts.total - a.condition_counts.met / a.condition_counts.total);
  return { status: results.length ? 'ok' : 'insufficient_evidence', results,
    unavailable_schemes: unavailable, ranking_basis: 'reviewed_condition_coverage', official_decision: false };
}

export function createSchemeComparison({ answers, now = Date.now, onResults = () => {} }) {
  const sessions = new Map();
  const clear = id => sessions.delete(id);
  function assess(state) {
    return compareProfiles({ profiles: Object.values(state.profiles), language: state.language }, answers.recommend);
  }
  function question(state, question) {
    const controls = state.language === 'hi'
      ? '1 हाँ · 2 नहीं · 3 पिछला सवाल · 4 पता नहीं · 5 रोकें'
      : '1 Yes · 2 No · 3 Back · 4 Unsure · 5 Cancel';
    const hint = state.language === 'hi' ? '\nRESULTS: अभी तक की तुलना देखें।' : '\nRESULTS: compare answers so far.';
    const source = question.source_hint ? assess(state).results.find(item => item.scheme_id === question.scheme_id)?.citations.at(-1) : null;
    return `${schemes[question.scheme_id].name}\n${question.number}. ${question[state.language]}\n${controls}${hint}${source ? `\n${source.title}, ${source.locator} — ${source.url}` : ''}`;
  }
  function next(state, showResults = false) {
    const response = assess(state);
    const usable = new Set(response.results.filter(item => item.status !== 'not_matched').map(item => item.scheme_id));
    const pending = state.questions.find(item => usable.has(item.scheme_id)
      && !Object.hasOwn(state.profiles[item.scheme_id], item.key));
    if (pending && !showResults) {
      state.pending = pending;
      return question(state, pending);
    }
    state.pending = null;
    onResults(state.id, { role: state.role, profiles: structuredClone(state.profiles) });
    const hi = state.language === 'hi';
    const lines = [hi ? 'जाँची गई योजनाओं की शुरुआती तुलना' : 'Preliminary comparison of reviewed schemes'];
    for (const item of response.results) {
      const counts = item.condition_counts;
      const label = item.status === 'potential_match' ? (hi ? 'संभावित मेल' : 'Possible match')
        : item.status === 'not_matched' ? (hi ? 'बताई गई शर्त मेल नहीं खाती' : 'Reported condition did not match')
          : (hi ? 'और जानकारी चाहिए' : 'More information needed');
      lines.push(`\n*${item.scheme_name}* — ${label}`);
      lines.push(hi ? `चुनी शर्तें: ${counts.met}/${counts.total} मेल, ${counts.failed} विफल, ${counts.unknown} अज्ञात।`
        : `Selected conditions: ${counts.met}/${counts.total} met, ${counts.failed} failed, ${counts.unknown} unknown.`);
      if (item.status === 'not_matched') lines.push(...item.reasons);
      if (item.scope_note) lines.push(item.scope_note);
      for (const key of item.missing_fields) {
        lines.push((hi ? 'बाकी सवाल: ' : 'Missing answer: ') + schemeQuestions[item.scheme_id].find(q => q.key === key)[state.language]);
      }
      for (const source of item.citations) lines.push(`${source.title}, ${source.locator} — ${source.url}`);
    }
    if (response.unavailable_schemes.length) lines.push(hi ? 'कुछ योजनाओं के जाँचे गए नियम अभी उपलब्ध नहीं हैं।' : 'Reviewed rules are unavailable for some schemes.');
    lines.push(hi ? '\nयह चुनी शर्तों की जाँच है; सरकारी मंजूरी की संभावना नहीं। अंतिम पुष्टि आधिकारिक कार्यालय से करें।'
      : '\nThese counts describe selected checks. They are not a probability of government approval. Confirm full eligibility with the official office.');
    lines.push(hi ? '*YOJANA START* से फिर शुरू करें। NEXT से छूटे जवाब दें। EDIT और सवाल का नंबर भेजकर सुधारें। CSC से केंद्र खोजें।'
      : '*YOJANA START* to restart. NEXT answers skipped questions. EDIT and a question number corrects an answer. CSC finds service-centre help.');
    return lines.join('\n');
  }
  function handle(id, text, language) {
    for (const [key, state] of sessions) if (now() - state.at > 86400000) sessions.delete(key);
    const value = text.trim().toLocaleLowerCase();
    if (value === 'schemes') {
      if (sessions.size >= 2000 && !sessions.has(id)) return 'The service is busy. Please try again later.';
      sessions.set(id, { id, at: now(), language, phase: 'role' });
      return language === 'hi' ? 'अपनी भूमिका चुनें:\n1 किसान\n2 विद्यार्थी\n3 कामगार\n4 कारीगर\n5 परिवार / अन्य नागरिक'
        : 'Choose your role:\n1 Farmer\n2 Student\n3 Worker\n4 Artisan or craft worker\n5 Family member / other citizen';
    }
    const state = sessions.get(id);
    if (!state) return null;
    state.language = language;
    state.at = now();
    if (value === 'cancel' || (state.phase !== 'role' && value === '5')) {
      clear(id);
      return state.language === 'hi' ? 'तुलना रोक दी गई। *YOJANA START* से फिर शुरू करें।' : 'Comparison cancelled. Send *YOJANA START* to restart.';
    }
    if (state.phase === 'role') {
      const role = roleNumbers[value];
      if (!role) return state.language === 'hi' ? 'कृपया 1–5 में से भूमिका चुनें।' : 'Choose a role from 1–5.';
      state.role = role;
      state.profiles = Object.fromEntries(priorities[role].map(scheme_id => [scheme_id, { scheme_id }]));
      state.questions = priorities[role].flatMap(scheme_id => schemeQuestions[scheme_id].map(q => ({ ...q, scheme_id })));
      state.questions.forEach((q, index) => { q.number = index + 1; });
      state.history = [];
      state.phase = 'questions';
      return next(state);
    }
    if (value === '3' || value === 'back') {
      const previous = state.history.pop();
      if (previous) {
        delete state.profiles[previous.scheme_id][previous.key];
        state.pending = previous;
        return question(state, previous);
      }
      return next(state);
    }
    const edit = /^edit\s+(\d+)$/u.exec(value);
    if (edit) {
      const target = state.questions[Number(edit[1]) - 1];
      if (!target) return state.language === 'hi' ? 'सही सवाल का नंबर भेजें।' : 'Send a valid question number.';
      state.pending = target;
      return question(state, target);
    }
    if (value === 'next') {
      const usable = new Set(assess(state).results.filter(item => item.status !== 'not_matched').map(item => item.scheme_id));
      const missing = state.questions.find(q => usable.has(q.scheme_id) && Object.hasOwn(state.profiles[q.scheme_id], q.key) && state.profiles[q.scheme_id][q.key] === null);
      if (missing) { state.pending = missing; return question(state, missing); }
      return next(state);
    }
    if (value === 'results') return next(state, true);
    const choices = { '1': true, yes: true, 'हाँ': true, 'हां': true, '2': false, no: false, 'नहीं': false, 'नही': false, '4': null, skip: null, unsure: null, 'पता नहीं': null };
    if (!Object.hasOwn(choices, value) || !state.pending) return state.pending ? question(state, state.pending) : next(state);
    const pending = state.pending;
    state.profiles[pending.scheme_id][pending.key] = choices[value];
    state.history.push(pending);
    return next(state);
  }
  function snapshot(id) {
    const state = sessions.get(id);
    return state?.profiles ? { role: state.role, profiles: structuredClone(state.profiles) } : null;
  }
  function restore(id, saved, language) {
    const number = Object.keys(roleNumbers).find(key => roleNumbers[key] === saved?.role);
    if (!number || !saved.profiles || typeof saved.profiles !== 'object') return null;
    handle(id, 'SCHEMES', language);
    if (!sessions.has(id)) return null;
    handle(id, number, language);
    const state = sessions.get(id);
    for (const q of state.questions) {
      const value = saved.profiles[q.scheme_id]?.[q.key];
      if (typeof value === 'boolean' || value === null) {
        state.profiles[q.scheme_id][q.key] = value;
        state.history.push(q);
      }
    }
    return next(state, true);
  }
  return { handle, clear, snapshot, restore, active: id => sessions.has(id), scheme: id => sessions.get(id)?.pending?.scheme_id,
    prompt: id => { const state = sessions.get(id); return state?.pending ? question(state, state.pending) : ''; } };
}
