import test from 'node:test';
import assert from 'node:assert/strict';
import { answerMatch, demoCommand } from './yojana-answer.mjs';

test('prefixed messages are stripped for the WhatsApp command handler', () => {
  assert.equal(demoCommand('YOJANA START'), 'START');
  assert.equal(demoCommand('hello without prefix'), null);
});

test('PM-KISAN fictional match output is localized and remains non-official', () => {
  const reply = answerMatch('MATCH yes no no', 'hi');
  assert.match(reply, /संभावित मेल/u);
  assert.match(reply, /यह सरकारी निर्णय नहीं है/u);
  assert.match(reply, /https:\/\/pmkisan.gov.in\//u);
});
