// A confirmed transcript may answer an active questionnaire or ask a question.
function spokenChoice(text) {
  const normalized=String(text).trim().toLocaleLowerCase().replace(/[.!?।,]/gu,'').trim();
  return ({one:'1',two:'2',three:'3',four:'4',five:'5',six:'6',seven:'7',ek:'1',do:'2','एक':'1','दो':'2','तीन':'3','चार':'4','पांच':'5','पाँच':'5','छह':'6','सात':'7','१':'1','२':'2','३':'3','४':'4','५':'5','६':'6','७':'7'})[normalized] || normalized;
}
function languageChoice(text) {
  const choice=spokenChoice(text);
  if (['hindi','हिंदी','हिन्दी'].includes(choice)) return '1';
  if (['english','अंग्रेजी','अंग्रेज़ी'].includes(choice)) return '2';
  return choice;
}
function confirmationChoice(text) {
  const choice=spokenChoice(text);
  if (['1','yes','confirm','yes confirm','हाँ','हां','जी हाँ','जी हां','सही है','पुष्टि'].includes(choice)) return 'confirm';
  if (['2','no','नहीं','नही','दोबारा','फिर से','record again','try again'].includes(choice)) return 'retry';
  return null;
}
const voiceConfirmHint='बिना टाइप किए: आवाज़ में “हाँ” कहकर पुष्टि करें, या “दोबारा” कहकर फिर रिकॉर्ड करें।\nNo typing needed: say “yes” to confirm or “record again” to retry.';
export function createVoiceFlow({ answers, transcribe, fallback, answerQuestion=null, profileStatement=null, isProfileStatement=()=>false, isQuestionnaireReply=()=>false, selectedLanguage=()=>null, choosingLanguage=()=>false, now=Date.now, diagnostic=()=>{} }) {
  const states=new Map();
  const current=id=>{const s=states.get(id);if(s && s.expires<now()){states.delete(id);return null;}return s;};
  const processing=process.env.YOJANA_STT_PROVIDER==='sarvam'
    ? 'Audio will be sent to Sarvam for transcription. / आवाज़ पहचान के लिए Sarvam को भेजी जाएगी।'
    : 'Voice is processed locally. / आवाज़ इस कंप्यूटर पर संसाधित होगी।';
  const prompt=`Send one short Hindi or English voice question. Confirm the transcription before I answer. ${processing} Do not send Aadhaar, bank details or other private information.\nहिंदी या अंग्रेज़ी में छोटा आवाज़ वाला सवाल भेजें। जवाब से पहले लिखी हुई बात की पुष्टि करें। आधार या बैंक जानकारी न भेजें।`;
  return {
    acceptsAudio(id){return ['audio','confirm'].includes(current(id)?.phase);},
    hasPendingPrompt(id){return ['audio','confirm'].includes(current(id)?.phase);},
    acceptsPendingChoice(id,text){return current(id)?.phase==='confirm' && /^(?:1|2)$/u.test(String(text).trim());},
    async handleAudio(id, audio, activeConversation=false){
      if(!activeConversation && !this.acceptsAudio(id))return null;
      const pending=current(id);
      if(pending?.phase==='confirm'){
        try {
          diagnostic('transcribing voice confirmation');
          const language=selectedLanguage(id) || (pending.languageMenu ? (languageChoice(pending.text)==='1'?'hi':'en') : pending.language);
          const result=await transcribe(audio,{language});
          // A restart, expiry or another action cannot confirm a stale transcript.
          if(current(id)!==pending) return 'Confirmation expired or changed. Please record your question again. / पुष्टि बदल गई या समय समाप्त हुआ। सवाल फिर रिकॉर्ड करें।';
          const choice=result.languageUncertain ? null : confirmationChoice(result.text);
          if(choice==='confirm') return this.handle(id,'confirm');
          if(choice==='retry') return this.handle(id,'2');
          return `पुष्टि स्पष्ट नहीं हुई। आपकी पिछली बात अभी लागू नहीं की गई है।\nConfirmation was unclear. Your previous transcript has not been submitted.\n${voiceConfirmHint}`;
        } catch {
          return `पुष्टि की आवाज़ समझ नहीं आई। दोबारा कोशिश करें या 1 / 2 लिखें।\nCould not hear the confirmation. Try again or type 1 / 2.\n${voiceConfirmHint}`;
        }
      }
      states.delete(id);
      const languageMenu=choosingLanguage(id);
      try {
        diagnostic('transcription started');
        let result;
        try { result=await transcribe(audio,{language:selectedLanguage(id)}); }
        catch(error) { if(!languageMenu || !['unsupported detected language','empty or invalid transcript'].includes(error?.message)) throw error; }
        if(languageMenu && (!result || (!['1','2'].includes(languageChoice(result.text)) && !isProfileStatement(result.text)))) {
          diagnostic('retrying language choice in Hindi');
          result=await transcribe(audio,{language:'hi'});
        }
        if(languageMenu && !['1','2'].includes(languageChoice(result.text)) && !isProfileStatement(result.text)) return 'Could not identify option 1 or 2. Please say Hindi or English again, or type 1 for Hindi or 2 for English.\nविकल्प स्पष्ट नहीं है। हिंदी या अंग्रेज़ी फिर बोलें, या हिंदी के लिए 1 या अंग्रेज़ी के लिए 2 लिखें।';
        const choiceMenu=languageMenu && ['1','2'].includes(languageChoice(result.text));
        diagnostic('transcription ready for confirmation');
        states.set(id,{phase:'confirm',...result,languageMenu:choiceMenu,expires:now()+300000});
        if(choiceMenu) return languageChoice(result.text)==='1'
          ? `मैंने सुना: ${result.text}\nOption 1 selects *Hindi / हिंदी*. विकल्प 1 से हिंदी चुनी जाएगी।\n${voiceConfirmHint}\nReply *1* to confirm or *2* to record again. शब्द ठीक करने के लिए YOJANA EDIT और सुधार लिखें।`
          : `I heard: ${result.text}\nOption 2 selects *English / अंग्रेज़ी*. विकल्प 2 से अंग्रेज़ी चुनी जाएगी।\n${voiceConfirmHint}\nReply *1* to confirm or *2* to record again. To fix words, send YOJANA EDIT followed by the correction.`;
        return result.language==='hi'
          ? `मैंने सुना (हिंदी): ${result.text}\n${voiceConfirmHint}\nसही है तो *1* भेजें। दोबारा रिकॉर्ड करने के लिए *2* भेजें। शब्द ठीक करने के लिए YOJANA EDIT और सही वाक्य लिखें।`
          : `I heard (English): ${result.text}\n${voiceConfirmHint}\nReply *1* to confirm or *2* to record again. To correct words, send YOJANA EDIT followed by the correct sentence.`;
      } catch (error) {
        const safe=['empty or invalid transcript','unsupported detected language','low language confidence','invalid worker response','Voice transcription unavailable','Voice transcription timed out','voice worker input failed','voice worker model failed','voice worker decode failed','voice worker inference failed','Sarvam API key unavailable','Sarvam transcription unavailable','Invalid Sarvam response'];
        diagnostic('transcription failed: '+(safe.includes(error?.message)?error.message:'worker error'));
        if(process.env.YOJANA_STT_PROVIDER==='sarvam' && (error?.message?.startsWith('Sarvam transcription HTTP ') || ['Sarvam API key unavailable','Sarvam transcription unavailable','Invalid Sarvam response'].includes(error?.message)))
          return 'Speech service is unavailable right now. Please type your answer or question.\nआवाज़ सेवा अभी उपलब्ध नहीं है। कृपया जवाब या सवाल लिखकर भेजें।';
        if(languageMenu)return 'Could not reliably hear the language choice. Please record Hindi or English again, or type 1 for Hindi or 2 for English.\nभाषा का विकल्प स्पष्ट नहीं हुआ। हिंदी या अंग्रेज़ी फिर बोलें, या हिंदी के लिए 1 या अंग्रेज़ी के लिए 2 लिखें।';
        return 'Voice could not be transcribed reliably. Please record again or type your question.\nआवाज़ स्पष्ट नहीं समझी गई। दोबारा रिकॉर्ड करें या सवाल लिखकर भेजें।';
      }
    },
    async handle(id,text){
      const command=String(text).trim().toLowerCase(); const state=current(id);
      if(command==='voice'){states.set(id,{phase:'audio',expires:now()+300000});return prompt;}
      if(state?.phase==='confirm' && command.startsWith('edit ')){
        const corrected=String(text).trim().slice(5).trim();
        if(!corrected || corrected.length>1000) return 'Please send YOJANA EDIT followed by the correct sentence. / सही वाक्य लिखें।';
        if(state.languageMenu && !['1','2'].includes(languageChoice(corrected))) return 'Please correct the language option to 1 or 2. / भाषा के लिए 1 या 2 लिखें।';
        state.text=corrected;
        if(!state.languageMenu) state.language=selectedLanguage(id) || (/\p{Script=Devanagari}/u.test(corrected)?'hi':'en');
        state.expires=now()+300000;
        return `Corrected transcript: ${corrected}\n${voiceConfirmHint}\nReply *1* to confirm or *2* to record again. / सही हो तो *1*, दोबारा रिकॉर्ड करने के लिए *2* भेजें।`;
      }
      if(state && (command==='cancel' || (state.phase==='confirm' && command==='2'))){
        if(command==='2')states.set(id,{phase:'audio',expires:now()+300000});else states.delete(id);
        return 'Voice question cancelled. Record again or type your question. / आवाज़ वाला सवाल रद्द हुआ। दोबारा रिकॉर्ड करें या लिखें।';
      }
      if(state?.phase==='confirm' && ['confirm','1'].includes(command)){
        states.delete(id);
        try {
          if(state.languageMenu && !choosingLanguage(id)) return 'The menu changed. Please send YOJANA START and choose again.\nमेनू बदल गया है। कृपया फिर से शुरू करें।';
          const choice=state.languageMenu?languageChoice(state.text):spokenChoice(state.text);
          if(profileStatement && isProfileStatement(state.text)) return await profileStatement(id,state.text,state.language);
          if(isQuestionnaireReply(id,choice)) return await fallback(id,/^[1-7]$/u.test(choice)?choice:state.text);
          if(answerQuestion)return await answerQuestion(id,state.text,state.language);
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
