import { randomUUID } from 'node:crypto';
import { isIP } from 'node:net';
import { templates, selectTemplate, dayInIndia } from './templates.mjs';
import { normalizeRecipient } from './recipient.mjs';

export class DemoError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
const knownStates = new Set(['Pending', 'Processed', 'Sent', 'Delivered', 'Failed', 'Cancelled', 'Cancelling']);
export function gatewaySettings(config) {
  let url;
  try { url = new URL(config.gatewayUrl); } catch { throw new DemoError('Configure the Android phone LAN URL locally.'); }
  const octets = url.hostname.split('.').map(Number);
  const local = url.hostname === 'localhost' || (isIP(url.hostname) === 4 && (octets[0] === 127 || octets[0] === 10 || (octets[0] === 192 && octets[1] === 168) || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)));
  if (!local || !['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new DemoError('Use an HTTP(S) private IPv4 LAN address with a port, without URL credentials or a path.');
  if (!config.username || !config.password || String(config.username).includes(':')) throw new DemoError('Configure the gateway username and password locally.');
  const messagesPath = config.messagesPath || '/message';
  if (!['/message', '/messages'].includes(messagesPath)) throw new DemoError('Choose /message or /messages as shown by the phone Swagger docs.');
  return { base: url.origin, messagesPath, authorization: 'Basic ' + Buffer.from(config.username + ':' + config.password).toString('base64') };
}

export function createSmsService({ config, store, fetchImpl = fetch, now = Date.now }) {
  const mode = config.mode || 'simulator';
  if (!['simulator', 'android'].includes(mode)) throw new Error('Mode must be simulator or android.');
  const limit = Number(config.dailySegmentLimit ?? 6);
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) throw new Error('Demo segment limit must be 1-20.');
  const allowlist = new Set(config.allowedNumbers || []);
  const settings = mode === 'android' ? gatewaySettings(config) : null;
  if (config.simNumber && ![1, 2, 3].includes(Number(config.simNumber))) throw new Error('SIM slot must be 1, 2 or 3.');
  if (mode === 'android' && (!allowlist.size || [...allowlist].some(n => !/^\+[1-9]\d{7,14}$/.test(n)))) throw new Error('Real mode requires explicit E.164 test recipients in the local configuration.');
  const privateRecipients = new Map();
  for (const row of store.rows) {
    if (row.status === 'prepared') row.status = 'expired';
    if (row.status === 'submitting') row.status = 'uncertain';
  }
  store.save();
  const budgetUsed = () => store.rows.filter(row => row.mode === 'android' && row.attemptDay === dayInIndia(now())).reduce((sum, row) => sum + (row.reservedSegments || 0), 0);
  const publicRow = row => ({ id: row.id, mode: row.mode, recipient: row.maskedRecipient, template: row.template, language: row.language, text: row.text, status: row.status, gatewayState: row.gatewayState || null, gatewayId: row.gatewayId || null, estimate: row.estimate, createdAt: row.createdAt, note: row.note || '', source: row.source });
  const getRow = id => { const row = store.rows.find(item => item.id === id); if (!row) throw new DemoError('Unknown message ID.', 404); return row; };

  function state() {
    return {
      mode, dailySegmentLimit: limit, reservedSegmentsToday: budgetUsed(),
      recipientCount: allowlist.size,
      templates: templates.map(({ id, name, source, checkedOn, reviewBy }) => ({ id, name, source, checkedOn, reviewBy })),
      messages: store.rows.slice(-30).reverse().map(publicRow),
      scope: 'Outgoing SMS demo. No incoming SMS bot, live WhatsApp integration, IVR or nearest-CSC directory.',
    };
  }

  function prepare(input = {}) {
    if (input.consent !== true) throw new DemoError('Confirm the tester has agreed to this SMS first.');
    let template;
    try { template = selectTemplate(input.template, input.language, now()); } catch (error) { throw new DemoError(error.message); }
    if (store.rows.length >= 500) throw new DemoError('Demo ledger is full; review/archive it before continuing.', 429);
    const recipient = mode === 'simulator' ? 'demo-recipient' : normalizeRecipient(input.recipient);
    if (mode === 'android' && !allowlist.has(recipient)) throw new DemoError('Recipient is not on the locally configured consenting-test allowlist.', 403);
    const scenario = input.scenario || 'success';
    if (!['success', 'failure', 'uncertain'].includes(scenario)) throw new DemoError('Unknown simulator scenario.');
    if (mode === 'android' && scenario !== 'success') throw new DemoError('Simulation scenarios are not available in Android mode.');
    const row = {
      id: randomUUID(), mode, recipientHash: store.hash(recipient),
      maskedRecipient: mode === 'simulator' ? 'demo-recipient (fictional)' : '+…' + recipient.slice(-4),
      template: template.id, language: template.language, text: template.text, source: template.source,
      estimate: { encoding: template.encoding, units: template.units, segments: template.segments, estimate: true },
      status: 'prepared', createdAt: new Date(now()).toISOString(), expiresAt: now() + 600000, consentAt: new Date(now()).toISOString(), scenario,
    };
    privateRecipients.set(row.id, recipient);
    store.rows.push(row); store.save(); return publicRow(row);
  }

  async function send(id) {
    const row = getRow(id);
    // Durable idempotency: a second click or retry never invokes the gateway again.
    if (row.status !== 'prepared') return publicRow(row);
    if (now() > row.expiresAt || !privateRecipients.has(id)) { row.status = 'expired'; store.save(); throw new DemoError('Preview/consent expired. Prepare a fresh message.', 409); }
    if (mode === 'android' && budgetUsed() + row.estimate.segments > limit) throw new DemoError('Daily estimated segment budget exhausted. No SMS submitted.', 429);
    // Recheck the maintenance deadline immediately before delivery.
    try { selectTemplate(row.template, row.language, now()); } catch (error) { throw new DemoError(error.message, 409); }
    const recipient = privateRecipients.get(id);
    row.status = 'submitting';
    row.attemptDay = dayInIndia(now());
    row.reservedSegments = mode === 'android' ? row.estimate.segments : 0;
    store.save(); // Before network I/O; crashes/timeouts must not cause silent resends.
    try {
      if (mode === 'simulator') {
        row.status = row.scenario === 'success' ? 'simulated' : row.scenario === 'failure' ? 'simulated_failed' : 'simulated_uncertain';
        row.note = 'SIMULATION ONLY: no phone, carrier or recipient was contacted.';
      } else {
        const payload = { id: row.id, textMessage: { text: row.text }, phoneNumbers: [recipient], withDeliveryReport: true, ttl: 300 };
        if (config.simNumber) payload.simNumber = Number(config.simNumber);
        const response = await fetchImpl(settings.base + settings.messagesPath, {
          method: 'POST', redirect: 'error', headers: { Authorization: settings.authorization, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload), signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) {
          row.status = [400, 401, 403, 404, 422].includes(response.status) ? 'gateway_rejected' : 'uncertain';
          row.note = `Gateway returned HTTP ${response.status}. No automatic retry; check the phone before a new attempt.`;
        } else {
          const data = await response.json();
          if (!data || typeof data.id !== 'string' || !/^[\w-]{1,128}$/.test(data.id)) throw Error('Unrecognised gateway response');
          row.gatewayId = data.id;
          row.gatewayState = knownStates.has(data.state) ? data.state : 'Pending';
          row.status = 'gateway_accepted';
          row.note = 'Gateway accepted the request. This is not proof of handset delivery; use Check gateway status and inspect the receiving phone.';
        }
      }
    } catch {
      row.status = 'uncertain'; row.note = 'The request outcome is unknown. Do not resend blindly; inspect the Android queue and receiving phone.';
    } finally {
      privateRecipients.delete(id); store.save();
    }
    return publicRow(row);
  }

  async function status(id) {
    const row = getRow(id);
    if (row.mode !== mode) throw new DemoError('This message belongs to a different mode.', 409);
    if (mode === 'simulator' || !row.gatewayId) return publicRow(row);
    try {
      const response = await fetchImpl(settings.base + settings.messagesPath + '/' + encodeURIComponent(row.gatewayId), {
        redirect: 'error', headers: { Authorization: settings.authorization }, signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw Error('Status lookup failed');
      const data = await response.json();
      if (data.id !== row.gatewayId || !knownStates.has(data.state)) throw Error('Unrecognised status response');
      row.gatewayState = data.state;
      row.status = data.state === 'Delivered' ? 'gateway_reported_delivered' : data.state === 'Failed' ? 'gateway_reported_failed' : data.state === 'Cancelled' ? 'gateway_reported_cancelled' : 'gateway_accepted';
      row.note = 'Gateway-reported state only. For a real demo, confirm receipt and complete multipart text on the receiving phone.';
      store.save(); return publicRow(row);
    } catch { throw new DemoError('Could not refresh gateway status. Previous state retained; no resend attempted.', 502); }
  }
  return { state, prepare, send, status };
}
