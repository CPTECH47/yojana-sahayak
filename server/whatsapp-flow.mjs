function normalize(text) {
  return String(text ?? '').trim().normalize('NFC').toLocaleLowerCase();
}

function requestedLanguage(text) {
  const value = normalize(text);
  if (['1', 'hi', 'hindi', 'हिंदी', 'हिन्दी'].includes(value)) return 'hi';
  if (['2', 'en', 'english'].includes(value)) return 'en';
  return null;
}

function isStart(text) {
  return /^(?:start|hi|hello|नमस्ते|नमस्कार)?$/iu.test(normalize(text));
}

function languagePrompt() {
  return 'नमस्ते! Welcome to Yojana Sahayak.\nकृपया भाषा चुनें / Please choose a language:\n1 लिखें हिंदी के लिए / Reply 1 for Hindi\n2 लिखें अंग्रेज़ी के लिए / Reply 2 for English\nहर संदेश की शुरुआत YOJANA से करें / Start every message with YOJANA.';
}

function nextSteps(language) {
  if (language === 'hi') return [
    'ठीक है, अब मैं हिंदी में जवाब दूँगा। भाषा बदलने के लिए YOJANA 2 भेजें।',
    'आप PM-KISAN, PMUY, PM Vishwakarma, PM-SYM या NMMSS के बारे में पूछ सकते हैं।',
    'उदाहरण: YOJANA PM-KISAN में कितनी राशि मिलती है?',
    'काल्पनिक PM-KISAN शुरुआती जाँच: YOJANA MATCH yes no no। यह सरकारी पात्रता निर्णय नहीं है।',
  ].join('\n');
  return [
    'Okay, I will reply in English. Send YOJANA 1 to switch languages.',
    'Ask about PM-KISAN, PMUY, PM Vishwakarma, PM-SYM, or NMMSS.',
    'Example: YOJANA PM-KISAN kitna paisa deta hai?',
    'Fictional preliminary PM-KISAN check: YOJANA MATCH yes no no. This is not an official eligibility decision.',
  ].join('\n');
}

// Language preference is isolated per direct-chat JID and lives only for this process session.
export function createWhatsAppConversation({ answers, match }) {
  const languageByChat = new Map();

  async function handle(chatId, text) {
    if (!chatId) throw new TypeError('A direct-chat identifier is required');
    if (isStart(text)) {
      languageByChat.delete(chatId);
      return languagePrompt();
    }

    const languageChoice = requestedLanguage(text);
    if (languageChoice) {
      languageByChat.set(chatId, languageChoice);
      return nextSteps(languageChoice);
    }

    const language = languageByChat.get(chatId);
    if (!language) return languagePrompt();
    if (/^match\b/i.test(normalize(text))) return match(text, language);

    let result;
    try {
      result = await answers.chat({ question: text, language });
    } catch {
      return language === 'hi'
        ? 'स्थानीय उत्तर सेवा अभी उपलब्ध नहीं है। कृपया थोड़ी देर बाद फिर पूछें।'
        : 'The local answer service is unavailable. Please try again shortly.';
    }
    let reply = result.answer_text;
    if (result.citations?.length) {
      const sourceLabel = language === 'hi' ? 'स्रोत' : 'Source';
      reply += '\n' + result.citations.map(c => `${sourceLabel}: ${c.title}, ${c.locator} — ${c.url}`).join('\n');
    }
    return reply;
  }

  return { handle };
}
