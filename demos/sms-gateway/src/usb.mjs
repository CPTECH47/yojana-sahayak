// USB forwarding only: no phone settings changes, SMS permission grants or carrier calls.
export function connectUsb({run, localPort=18080, phonePort=8080}) {
  for(const port of [localPort,phonePort]) if(!Number.isInteger(port)||port<1024||port>65535)throw Error('USB ports must be integers from 1024 to 65535.');
  let state;
  try { state=run(['-d','get-state']).trim(); }
  catch { throw Error('No single authorized USB phone found. Connect and unlock the phone, enable USB debugging and approve this laptop on the phone. Multiple USB phones must be disconnected.'); }
  if(state!=='device')throw Error('The USB phone is not authorized/online. Complete the debugging prompt on the phone yourself.');
  const serial=run(['-d','get-serialno']).trim();
  if(!serial || /\s/.test(serial))throw Error('Could not identify one USB device.');
  const local=`tcp:${localPort}`, remote=`tcp:${phonePort}`;
  const mappings=run(['forward','--list']).trim().split(/\r?\n/u).filter(Boolean).map(line=>line.trim().split(/\s+/u));
  const existing=mappings.find(row=>row[1]===local);
  if(existing && (existing[0]!==serial || existing[2]!==remote))throw Error('The selected laptop port already belongs to a different forwarding rule. No rule was overwritten.');
  if(!existing)run(['-d','forward','--no-rebind',local,remote]);
  return {gatewayUrl:`http://127.0.0.1:${localPort}`,localPort,phonePort,reused:Boolean(existing)};
}
