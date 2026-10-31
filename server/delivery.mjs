// Durable at-most-once attempt: an uncertain send is never automatically replayed.
export function createDelivery({store,handle,send,maximum=40,concurrency=4,now=Date.now}) {
  const chats=new Map();let pending=0,active=0;const waiters=[];
  async function enter(){if(active<concurrency){active++;return;}await new Promise(resolve=>waiters.push(resolve));}
  function leave(){if(waiters.length)waiters.shift()();else active--;}
  return async function processEvent(chat,id,text){
    const key=store.id(chat+':'+id);
    if(store.get('messages',key))return 'duplicate';
    if(pending>=maximum)return 'busy';
    // Bound disk use without clearing recent deduplication records.
    for(const [oldKey,event] of store.entries('messages'))if(now()-event.at>7*86400000)store.delete('messages',oldKey);
    if(store.entries('messages').length>=10000)return 'busy';
    store.put('messages',key,{at:now(),status:'pending'});
    pending++;
    const previous=chats.get(chat)||Promise.resolve();
    const task=previous.catch(()=>{}).then(async()=>{
      await enter();
      try {
        const reply=await handle(chat,text);
        store.put('messages',key,{at:now(),status:'sending'});
        await send(chat,reply);
        store.put('messages',key,{at:now(),status:'sent'});
        return 'sent';
      } catch {
        store.put('messages',key,{at:now(),status:'uncertain'});
        return 'uncertain';
      } finally {leave();pending--;}
    });
    chats.set(chat,task);
    try{return await task;}finally{if(chats.get(chat)===task)chats.delete(chat);}
  };
}
