import test from 'node:test';
import assert from 'node:assert/strict';
import { restartUrl, withRestartLink } from './whatsapp-restart.mjs';
import { createWhatsAppConversation } from './whatsapp-flow.mjs';

test('restart link targets the approved contact and prefills only START', () => {
  const url = new URL(restartUrl);
  assert.equal(url.origin, 'https://api.whatsapp.com');
  assert.equal(url.searchParams.get('phone'), '918273104167');
  assert.equal(url.searchParams.get('text'), 'YOJANA START');
  assert.equal(url.searchParams.get('type'), 'phone_number');
  assert.equal(url.searchParams.get('app_absent'), '0');
});

test('greeting and Hindi/English retry messages get one visible restart URL', async () => {
  const flow = createWhatsAppConversation({ answers: {}, naturalFlow: true });
  const greeting = withRestartLink(await flow.handle('fictional-restart', 'START'));
  assert.ok(greeting.includes(restartUrl));
  for (const language of ['1', '2']) {
    await flow.handle('fictional-restart', 'START');
    await flow.handle('fictional-restart', language);
    await flow.handle('fictional-restart', '1');
    const retry = withRestartLink(await flow.handle('fictional-restart', 'unclear'));
    assert.ok(retry.includes(restartUrl));
    assert.ok(retry.includes('लिंक खोलें, फिर भेजें दबाएँ।'));
    assert.ok(retry.includes('Open the link, then tap Send.'));
    assert.equal(withRestartLink(retry), retry);
  }
});

test('ordinary questions and non-text results are unchanged', () => {
  for (const text of ['1 Yes\n2 No', 'Source: https://pmkisan.gov.in/', '', null, undefined]) {
    assert.equal(withRestartLink(text), text);
  }
});
