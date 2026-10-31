import test from 'node:test';
import assert from 'node:assert/strict';
import { connectUsb } from '../src/usb.mjs';
function fake({state='device',mappings='',fail=false}={}) {
  const calls=[];
  return {calls,run(args){calls.push(args);if(args[1]==='get-state'){if(fail)throw Error('unauthorized');return state;}if(args[1]==='get-serialno')return 'fictional-usb-device';if(args[0]==='forward')return mappings;return '';}};
}
test('USB setup uses the single physical device and creates only its loopback tunnel',()=>{
  const f=fake();const result=connectUsb(f);
  assert.equal(result.gatewayUrl,'http://127.0.0.1:18080');
  assert.deepEqual(f.calls.at(-1),['-d','forward','--no-rebind','tcp:18080','tcp:8080']);
});
test('USB authorization failure blocks all forwarding and installation work',()=>{
  const f=fake({fail:true});assert.throws(()=>connectUsb(f),/authorized/);assert.equal(f.calls.length,1);
});
test('USB setup reuses an identical tunnel and refuses to overwrite another device',()=>{
  const same=fake({mappings:'fictional-usb-device tcp:18080 tcp:8080'});
  assert.equal(connectUsb(same).reused,true);assert.equal(same.calls.length,3);
  const other=fake({mappings:'other-device tcp:18080 tcp:8080'});
  assert.throws(()=>connectUsb(other),/overwritten/);assert.equal(other.calls.length,3);
});
test('USB setup rejects invalid ports before contacting a device',()=>{
  const f=fake();assert.throws(()=>connectUsb({...f,localPort:1}),/ports/);assert.equal(f.calls.length,0);
});
