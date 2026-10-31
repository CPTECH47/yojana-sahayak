import { createHash } from 'node:crypto';
import { loadPassages } from './corpus.mjs';

// Watches only already-reviewed local corpus changes. Fetching cannot approve updates.
export function scanReviewedUpdates({store,answers,passages=loadPassages(),now=Date.now()}){
  const versions={};
  for(const scheme of new Set(passages.map(p=>p.scheme_id))) {
    versions[scheme]=createHash('sha256').update(JSON.stringify(passages.filter(p=>p.scheme_id===scheme).map(p=>[p.id,p.snapshot_sha256,p.text]))).digest('hex');
  }
  const previous=store.get('system','versions');
  store.put('system','versions',versions);
  if(!previous)return 0; // Start with a baseline, never pretend all existing sources are new.
  let queued=0;
  for(const [id,profile] of store.entries('profiles')){
    if(profile.expires_at<=now){store.delete('profiles',id);continue;}
    if(!profile.alert_opt_in || !profile.storage_consent)continue;
    for(const selectedProfile of Object.values(profile.profiles || {primary:profile.profile})){
    const scheme=selectedProfile?.scheme_id;
    if(!versions[scheme] || previous[scheme]===versions[scheme])continue;
    const result=answers.recommend({profile:selectedProfile,language:profile.language});
    if(!['potential_match','needs_information'].includes(result.results?.[0]?.status) || !result.results[0].citations?.length)continue;
    const key=id+':'+scheme+':'+versions[scheme];
    if(store.get('alerts',key))continue;
    store.put('alerts',key,{profile_id:id,scheme_id:scheme,version:versions[scheme],status:'queued',at:now});
    queued++;
    }
  }
  return queued;
}

export async function deliverReviewedAlerts({store,answers,send,enabled=false,now=Date.now()}){
  if(!enabled)return 0; // Experimental Baileys sends require an explicit consenting-test opt-in.
  let sent=0;
  for(const [key,alert] of store.entries('alerts')){
    if(alert.status!=='queued')continue;
    const profile=store.get('profiles',alert.profile_id),versions=store.get('system','versions');
    if(!profile?.storage_consent || !profile.alert_opt_in || profile.expires_at<=now || versions?.[alert.scheme_id]!==alert.version){
      store.put('alerts',key,{...alert,status:'cancelled'});continue;
    }
    const selectedProfile=Object.values(profile.profiles || {primary:profile.profile}).find(p=>p?.scheme_id===alert.scheme_id);
    if(!selectedProfile){store.put('alerts',key,{...alert,status:'cancelled'});continue;}
    const result=answers.recommend({profile:selectedProfile,language:profile.language});
    const item=result.results?.[0];
    if(!item || !['potential_match','needs_information'].includes(item.status) || !item.citations?.length) {
      store.put('alerts',key,{...alert,status:'cancelled'});continue;
    }
    const heading=profile.language==='hi'?'जाँची गई योजना जानकारी बदली है':'Reviewed scheme information changed';
    const text=heading+': '+item.scheme_name+'\n'+item.reasons.join('\n')+'\n'+item.citations.map(c=>c.title+': '+c.url).join('\n')+'\nYOJANA STOP';
    store.put('alerts',key,{...alert,status:'sending'});
    try{await send(profile.recipient,text);store.put('alerts',key,{...alert,status:'sent'});sent++;}
    catch{store.put('alerts',key,{...alert,status:'uncertain'});}
  }
  return sent;
}
