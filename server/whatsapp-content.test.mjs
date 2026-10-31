import test from 'node:test';
import assert from 'node:assert/strict';
import { messageContent, messageText } from './whatsapp-content.mjs';

test('ordinary and wrapped WhatsApp audio are recognised without logging message contents',()=>{
  const audio={seconds:5,fileLength:10};
  for(const message of [{message:{audioMessage:audio}},{message:{ephemeralMessage:{message:{audioMessage:audio}}}},{message:{viewOnceMessageV2:{message:{audioMessage:audio}}}}]){
    assert.equal(messageContent(message).audioMessage,audio);
    assert.equal(messageText(message),'');
  }
  assert.equal(messageText({message:{ephemeralMessage:{message:{conversation:'YOJANA VOICE'}}}}),'YOJANA VOICE');
});
