import test from 'node:test';
import assert from 'node:assert/strict';
import { installSafeSignalLogging } from './safe-signal-logging.mjs';

test('sensitive signal diagnostics are withheld while normal warnings remain',()=>{
  const calls=[];const logger={warn:(...a)=>calls.push(a),error:(...a)=>calls.push(a)};
  installSafeSignalLogging(logger);
  logger.warn('Session already closed',{secret:'do not log'});
  logger.error('Session error: a private identifier','private stack');
  logger.warn('ordinary warning');
  assert.deepEqual(calls,[['WhatsApp session diagnostic withheld for privacy.'],['WhatsApp session diagnostic withheld for privacy.'],['ordinary warning']]);
});
