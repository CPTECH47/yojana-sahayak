// A confirmed transcript may answer an active questionnaire or ask a question.
function spokenChoice(text) {
  const normalized=String(text).trim().toLocaleLowerCase().replace(/[.!?।,]/gu,'').trim();
  return ({one:'1',two:'2',three:'3',four:'4',five:'5',six:'6',ek:'1',do:'2','एक':'1','दो':'2','तीन':'3','चार':'4','पांच':'5','पाँच':'5','छह':'6','१':'1','२':'2','३':'3','४':'4','५':'5','६':'6'})[normalized] || normalized;
}
export function createVoiceFlow({ answers, transcribe, fallback, isQuestionnaireReply=()=>false, selectedLanguage=()=>null, choosingLanguage=()=>false, now=Date.now, diagnostic=()=>{} }) {
  const states=new Map();
  const current=id=>{const s=states.get(id);if(s && s.expires<now()){states.delete(id);return null;}return s;};
  const prompt='Send one short Hindi or English voice question. Confirm the transcription before I answer. Voice is processed locally. Do not send Aadhaar, bank details or other private information.\nहिंदी या अंग्रेज़ी में छोटा आवाज़ वाला सवाल भेजें। जवाब से पहले लिखी हुई बात की पुष्टि करें। आधार या बैंक जानकारी न भेजें।';
  return {
    acceptsAudio(id){return current(id)?.phase==='audio';},
    async handleAudio(id, audio, activeConversation=false){
      if(!activeConversation && !this.acceptsAudio(id))return null;
      states.delete(id);
      const languageMenu=choosingLanguage(id);
      try {
        diagnostic('transcription started');
        let result;
        try { result=await transcribe(audio,{language:selectedLanguage(id)}); }
        catch(error) { if(!languageMenu || !['unsupported detected language','empty or invalid transcript'].includes(error?.message)) throw error; }
        if(languageMenu && (!result || !['1','2'].includes(spokenChoice(result.text)))) {
          diagnostic('retrying language choice in Hindi');
          result=await transcribe(audio,{language:'hi'});
        }
        if(languageMenu && !['1','2'].includes(spokenChoice(result.text))) return 'Could not identify option 1 or 2. Please type 1 for Hindi or 2 for English.\nविकल्प स्पष्ट नहीं है। हिंदी के लिए 1 या अंग्रेज़ी के लिए 2 लिखें।';
        diagnostic('transcription ready for confirmation');
        states.set(id,{phase:'confirm',...result,languageMenu,expires:now()+300000});
        if(languageMenu) return spokenChoice(result.text)==='1'
          ? `I heard: ${result.text}\nOption 1 selects *Hindi / हिंदी*. Send YOJANA CONFIRM to continue in Hindi, or YOJANA CANCEL to choose again.\nविकल्प 1 से हिंदी चुनी जाएगी।`
          : `I heard: ${result.text}\nOption 2 selects *English / अंग्रेज़ी*. Send YOJANA CONFIRM to continue in English, or YOJANA CANCEL to choose again.\nविकल्प 2 से अंग्रेज़ी चुनी जाएगी।`;
        return result.language==='hi'
          ? `मैंने सुना (हिंदी): ${result.text}\nशब्द और भाषा सही हों तो YOJANA CONFIRM भेजें। गलत हो तो YOJANA CANCEL भेजें और फिर से रिकॉर्ड करें।`
          : `I heard (English): ${result.text}\nSend YOJANA CONFIRM if the words and language are correct. Otherwise send YOJANA CANCEL and record again.`;
      } catch (error) {
        const safe=['empty or invalid transcript','unsupported detected language','low language confidence','invalid worker response','Voice transcription unavailable','Voice transcription timed out','voice worker input failed','voice worker model failed','voice worker decode failed','voice worker inference failed'];
        diagnostic('transcription failed: '+(safe.includes(error?.message)?error.message:'worker error'));
        if(languageMenu)return 'Could not reliably hear the language choice. Please type 1 for Hindi or 2 for English.\nभाषा का विकल्प स्पष्ट नहीं हुआ। हिंदी के लिए 1 या अंग्रेज़ी के लिए 2 लिखें।';
        return 'Voice could not be transcribed reliably. Please record again or type your question.\nआवाज़ स्पष्ट नहीं समझी गई। दोबारा रिकॉर्ड करें या सवाल लिखकर भेजें।';
      }
    },
    async handle(id,text){
      const command=String(text).trim().toLowerCase(); const state=current(id);
      if(command==='voice'){states.set(id,{phase:'audio',expires:now()+300000});return prompt;}
      if(state && command==='cancel'){states.delete(id);return 'Voice question cancelled / आवाज़ वाला सवाल रद्द किया गया।';}
      if(state?.phase==='confirm' && command==='confirm'){
        states.delete(id);
        try {
          if(state.languageMenu && !choosingLanguage(id)) return 'The menu changed. Please send YOJANA START and choose again.\nमेनू बदल गया है। कृपया फिर से शुरू करें।';
          const choice=spokenChoice(state.text);
          if (isQuestionnaireReply(id, choice) && /^(?:[1-6]|yes|no|हाँ|हां|नहीं|नही|जी|ना|skip)$/iu.test(choice)) return await fallback(id,choice);
          const result=await answers.chat({question:state.text,language:state.language});
          const label=state.language==='hi'?'स्रोत':'Source';
          const links=(result.citations || []).map(c=>`${label}: ${c.title}, ${c.locator} — ${c.url}`).join('\n');
          return `${result.answer_text || (state.language==='hi'?'आधिकारिक स्रोत से पुष्टि नहीं हो सकी।':'I could not confirm this from an official source.')}${links?'\n'+links:''}`;
        } catch {return state.language==='hi'?'उत्तर सेवा अभी उपलब्ध नहीं है।':'The answer service is unavailable right now.';}
      }
      return fallback(id,text);
    },
  };
}
