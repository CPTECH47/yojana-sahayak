// Voice is explicitly enabled per chat; only a confirmed transcript becomes a question.
export function createVoiceFlow({ answers, transcribe, fallback, now=Date.now }) {
  const states=new Map();
  const current=id=>{const s=states.get(id);if(s && s.expires<now()){states.delete(id);return null;}return s;};
  const prompt='Send one short Hindi or English voice question. Confirm the transcription before I answer. Voice is processed locally. Do not send Aadhaar, bank details or other private information.\nहिंदी या अंग्रेज़ी में छोटा आवाज़ वाला सवाल भेजें। जवाब से पहले लिखी हुई बात की पुष्टि करें। आधार या बैंक जानकारी न भेजें।';
  return {
    acceptsAudio(id){return current(id)?.phase==='audio';},
    async handleAudio(id, audio){
      if(!this.acceptsAudio(id))return null;
      states.delete(id);
      try {
        const result=await transcribe(audio);
        states.set(id,{phase:'confirm',...result,expires:now()+300000});
        return result.language==='hi'
          ? `मैंने सुना: ${result.text}\nसही है तो YOJANA CONFIRM भेजें। गलत है तो YOJANA CANCEL भेजें और फिर से रिकॉर्ड करें।`
          : `I heard: ${result.text}\nSend YOJANA CONFIRM if correct. If not, send YOJANA CANCEL and record again.`;
      } catch {return 'Voice could not be transcribed reliably. Send YOJANA VOICE to try again, or type your question.\nआवाज़ स्पष्ट नहीं समझी गई। दोबारा कोशिश करें या सवाल लिखकर भेजें।';}
    },
    async handle(id,text){
      const command=String(text).trim().toLowerCase(); const state=current(id);
      if(command==='voice'){states.set(id,{phase:'audio',expires:now()+300000});return prompt;}
      if(state && command==='cancel'){states.delete(id);return 'Voice question cancelled / आवाज़ वाला सवाल रद्द किया गया।';}
      if(state?.phase==='confirm' && command==='confirm'){
        states.delete(id);
        try {
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
