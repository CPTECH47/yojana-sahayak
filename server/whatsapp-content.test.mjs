import test from 'node:test';
import assert from 'node:assert/strict';
import { proto } from '@whiskeysockets/baileys';
import { messageContent, messageText, messageBatchDiagnostic, ingressStatusDiagnostic } from './whatsapp-content.mjs';

test('ordinary and wrapped WhatsApp audio are recognised without logging message contents',()=>{
  const audio={seconds:5,fileLength:10};
  for(const message of [{message:{audioMessage:audio}},{message:{ephemeralMessage:{message:{audioMessage:audio}}}},{message:{viewOnceMessageV2:{message:{audioMessage:audio}}}}]){
    assert.equal(messageContent(message).audioMessage,audio);
    assert.equal(messageText(message),'');
  }
  assert.equal(messageText({message:{ephemeralMessage:{message:{conversation:'YOJANA VOICE'}}}}),'YOJANA VOICE');
});

test('transport diagnostics expose counts only, including wrapped START and ciphertext',()=>{
  const secrets=['15555550199','private-event-id','private recorded words','private decryption detail'];
  const messages=[
    {key:{id:secrets[1],remoteJid:secrets[0]+'@s.whatsapp.net',fromMe:true},message:{conversation:secrets[2]}},
    {key:{id:secrets[1],remoteJid:'private-lid@lid'},message:{ephemeralMessage:{message:{audioMessage:{url:secrets[2],seconds:1}}}}},
    {key:{id:secrets[1],remoteJid:'private-group@g.us'},messageStubType:proto.WebMessageInfo.StubType.CIPHERTEXT,messageStubParameters:[secrets[3]]},
    {key:{id:secrets[1],remoteJid:secrets[0]+'@s.whatsapp.net'},message:{ephemeralMessage:{message:{extendedTextMessage:{text:'YOJANA START'}}}}},
  ];
  const summary=messageBatchDiagnostic('notify',messages);
  assert.deepEqual(summary,{stage:'upsert',type:'notify',total:4,own:1,direct:3,group:1,text:2,audio:1,ciphertext:1,start:1});
  const printed=JSON.stringify(summary);
  for(const secret of [...secrets,'private-lid','private-group','YOJANA START'])assert.equal(printed.includes(secret),false);
});

test('diagnostic categories cannot carry arbitrary event types or ingress results',()=>{
  const secret='private-message-and-phone-15555550199';
  assert.deepEqual(messageBatchDiagnostic(secret,null),{stage:'upsert',type:'other',total:0,own:0,direct:0,group:0,text:0,audio:0,ciphertext:0,start:0});
  assert.deepEqual(ingressStatusDiagnostic(secret),{stage:'ingress',status:'other'});
  assert.deepEqual(ingressStatusDiagnostic({message:secret}),{stage:'ingress',status:'other'});
  assert.deepEqual(ingressStatusDiagnostic('sent'),{stage:'ingress',status:'sent'});
  assert.deepEqual(ingressStatusDiagnostic('uncertain'),{stage:'ingress',status:'uncertain'});
});
