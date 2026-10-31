import { mkdirSync,readFileSync,writeFileSync,renameSync,existsSync,openSync,closeSync,unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes,createCipheriv,createDecipheriv,createHmac } from 'node:crypto';

// One process owns this encrypted local store. Never place it in a served directory.
export function openLocalStore(directory) {
  mkdirSync(directory,{recursive:true,mode:0o700});
  const lock=join(directory,'process.lock');
  try { const fd=openSync(lock,'wx',0o600);writeFileSync(fd,String(process.pid));closeSync(fd); }
  catch(error) {
    if(error.code!=='EEXIST') throw error;
    const pid=Number(readFileSync(lock,'utf8'));
    if(!Number.isInteger(pid)||pid<=0) throw Error('Invalid local state lock; inspect it manually');
    try {process.kill(pid,0);throw Error('Another bot process owns this state');}
    catch(check){if(check.code!=='ESRCH') throw check;}
    unlinkSync(lock);
    const fd=openSync(lock,'wx',0o600);writeFileSync(fd,String(process.pid));closeSync(fd);
  }
  let key;
  const keyPath=join(directory,'state.key'),file=join(directory,'state.enc');
  try {
    if(!existsSync(keyPath))writeFileSync(keyPath,randomBytes(32),{flag:'wx',mode:0o600});
    key=readFileSync(keyPath);
    if(key.length!==32)throw Error('Invalid state key');
  } catch(error){unlinkSync(lock);throw error;}
  let data={};
  if(existsSync(file)){
    try {
      const raw=readFileSync(file);const cipher=createDecipheriv('aes-256-gcm',key,raw.subarray(0,12));
      cipher.setAuthTag(raw.subarray(12,28));
      data=JSON.parse(Buffer.concat([cipher.update(raw.subarray(28)),cipher.final()]).toString('utf8'));
    } catch {unlinkSync(lock);throw Error('Local state cannot be decrypted; refusing to reset saved consent');}
  }
  function flush(){
    const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);
    const encrypted=Buffer.concat([cipher.update(JSON.stringify(data),'utf8'),cipher.final()]);
    const temp=file+'.tmp';writeFileSync(temp,Buffer.concat([iv,cipher.getAuthTag(),encrypted]),{mode:0o600});renameSync(temp,file);
  }
  let closed=false;
  return {
    id:chat=>createHmac('sha256',key).update(chat).digest('hex'),
    get:(space,id)=>structuredClone(data[space]?.[id]),
    entries:space=>Object.entries(structuredClone(data[space]||{})),
    put(space,id,value){data[space]||={};data[space][id]=structuredClone(value);flush();},
    delete(space,id){if(data[space])delete data[space][id];flush();},
    close(){if(!closed && existsSync(lock))unlinkSync(lock);closed=true;}
  };
}

export function memoryStore() {
  const spaces={};
  return {id:chat=>chat,get:(s,id)=>structuredClone(spaces[s]?.[id]),
    entries:s=>Object.entries(structuredClone(spaces[s]||{})),
    put(s,id,v){spaces[s]||={};spaces[s][id]=structuredClone(v);},
    delete(s,id){if(spaces[s])delete spaces[s][id];},close(){}};
}
