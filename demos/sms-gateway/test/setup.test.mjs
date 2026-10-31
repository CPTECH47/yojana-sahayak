import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { setupPhone, terminalPrompt } from '../scripts/setup-phone.mjs';

function directory(t) {
  const dir = mkdtempSync(join(tmpdir(), 'yojana-sms-setup-test-'));
  t.after(() => { if (!resolve(dir).startsWith(resolve(tmpdir()) + sep + 'yojana-sms-setup-test-')) throw Error('Unexpected cleanup path.'); rmSync(dir, { recursive: true, force: true }); });
  return dir;
}

test('Node setup uses the USB default, validates fields and saves without printing secrets', async t => {
  const dir = directory(t);
  writeFileSync(join(dir, 'usb.json'), JSON.stringify({ gatewayUrl:'http://127.0.0.1:18080' }));
  const answers = ['', 'gateway-user', 'test-password-only', '+12025550123', '/messages'];
  const prompts = [];
  const result = await setupPhone({ directory:dir, ask:async(label,options)=>{prompts.push({label,options});return answers.shift();} });
  assert.deepEqual(result, { mode:'android', recipientCount:1, dailySegmentLimit:6 });
  const config = JSON.parse(readFileSync(join(dir, 'config.json'), 'utf8'));
  assert.equal(config.gatewayUrl, 'http://127.0.0.1:18080');
  assert.equal(config.password, 'test-password-only'); assert.equal(config.messagesPath, '/messages');
  assert.equal(prompts[2].options.secret, true);
  assert.ok(!JSON.stringify(result).includes(config.password));
});

test('invalid phone setup preserves the existing local configuration', async t => {
  const dir = directory(t), path = join(dir, 'config.json');
  writeFileSync(path, '{"mode":"simulator"}');
  const answers = ['https://public.example', 'user', 'test-secret', '+12025550123', ''];
  await assert.rejects(setupPhone({directory:dir,ask:async()=>answers.shift()}),/private/);
  assert.equal(readFileSync(path,'utf8'), '{"mode":"simulator"}');
});

test('password entry is hidden and cannot be recalled in the next prompt history', async () => {
  const input = new PassThrough(), output = new PassThrough();
  input.isTTY = true; input.setRawMode = () => {};
  output.isTTY = true; output.columns = 80;
  let displayed = ''; output.on('data',chunk=>{displayed += chunk.toString();});
  const prompt = terminalPrompt(input, output);
  try {
    const password = prompt.ask('Password: ', {secret:true});
    input.write('hidden-test-value\r');
    assert.equal(await password, 'hidden-test-value');
    assert.ok(!displayed.includes('hidden-test-value'));
    const next = prompt.ask('Next: ');
    input.write('\x1b[A\r');
    assert.equal(await next, '');
    assert.ok(!displayed.includes('hidden-test-value'));
  } finally { prompt.close(); input.destroy(); output.destroy(); }
});
