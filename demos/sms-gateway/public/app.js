const $ = id => document.getElementById(id);
let state, preview, lastFingerprint;
const fingerprint = () => ['template', 'language', 'recipient', 'scenario', 'consent'].map(id => $(id).type === 'checkbox' ? $(id).checked : $(id).value).join('|');
function notice(message, error = false) { $('notice').textContent = message; $('notice').className = error ? 'error' : ''; }
async function api(path, input) {
  const response = await fetch(path, input ? { method:'POST', headers:{'Content-Type':'application/json','X-Demo-Request':'1'}, body:JSON.stringify(input), signal:AbortSignal.timeout(16000) } : { signal:AbortSignal.timeout(5000) });
  const result = await response.json(); if (!response.ok) throw Error(result.error || 'Request failed.'); return result;
}
function drawLog() {
  $('log').replaceChildren();
  if (!state.messages.length) $('log').textContent = 'No messages yet.';
  for (const row of state.messages) {
    const item = document.createElement('article'); item.className = 'record';
    const title = document.createElement('strong'); title.textContent = `${row.mode.toUpperCase()} · ${row.recipient} · ${row.language}`;
    const status = document.createElement('p'); status.className = 'status'; status.textContent = `${row.status}${row.gatewayState ? ' / Gateway: ' + row.gatewayState : ''}`;
    const text = document.createElement('p'); text.textContent = row.text;
    const meta = document.createElement('p'); meta.className = 'meta'; meta.textContent = `${new Date(row.createdAt).toLocaleString()} · ${row.estimate.segments} estimated segment(s) · ${row.id}`;
    const note = document.createElement('p'); note.className = 'meta'; note.textContent = row.note;
    item.append(title, status, text, meta, note);
    if (row.mode === 'android' && row.gatewayId) {
      const button = document.createElement('button'); button.className = 'secondary'; button.textContent = 'Check gateway status';
      button.onclick = async () => { button.disabled = true; try { await api('/api/status', {id:row.id}); await refresh(); notice('Gateway status refreshed. Confirm receipt on the receiving phone.'); } catch (error) { notice(error.message, true); button.disabled = false; } };
      item.append(button);
    }
    $('log').append(item);
  }
}
async function refresh() {
  state = await api('/api/state');
  $('mode').textContent = state.mode === 'simulator' ? 'SIMULATOR — no SMS, phone or carrier connection. All outcomes are fictional.' : 'ANDROID GATEWAY — confirmation will submit a real SMS through your SIM.';
  $('mode').className = state.mode === 'android' ? 'mode live' : 'mode';
  $('recipientLabel').hidden = state.mode !== 'android'; $('recipient').required = state.mode === 'android';
  $('scenarioLabel').hidden = state.mode !== 'simulator';
  $('budget').textContent = `Real-send budget: ${state.reservedSegmentsToday}/${state.dailySegmentLimit} estimated segments reserved today (India time). Other apps’ SIM usage is not counted.`;
  if (!$('template').options.length) for (const template of state.templates) { const option = document.createElement('option'); option.value = template.id; option.textContent = template.name; $('template').append(option); }
  drawLog();
}
$('form').addEventListener('input', () => { $('send').disabled = true; });
$('form').onsubmit = async event => {
  event.preventDefault(); $('prepare').disabled = true; $('send').disabled = true;
  try {
    preview = await api('/api/prepare', { template:$('template').value, language:$('language').value, recipient:$('recipient').value, consent:$('consent').checked, scenario:$('scenario').value });
    lastFingerprint = fingerprint(); $('preview').hidden = false; $('previewHint').hidden = true;
    $('text').textContent = preview.text; $('text').lang = preview.language;
    $('estimate').textContent = `${preview.estimate.encoding} · approximately ${preview.estimate.segments} SMS segment(s). Carrier counting/charges can differ.`;
    $('target').textContent = `To: ${preview.recipient}`;
    $('source').href = preview.source;
    $('send').textContent = state.mode === 'simulator' ? 'Run simulated send' : 'Confirm real SMS send';
    $('sendNote').textContent = 'Preview expires in 10 minutes. Changing a field requires a new preview.';
    $('send').disabled = false; await refresh(); notice('Preview ready. Review the exact text before confirming.');
  } catch(error) { notice(error.message, true); } finally { $('prepare').disabled = false; }
};
$('send').onclick = async () => {
  if (!preview || fingerprint() !== lastFingerprint) return notice('Prepare a new preview after changing a field.', true);
  $('send').disabled = true;
  try {
    const result = await api('/api/send', {id:preview.id});
    notice(result.mode === 'simulator' ? 'Simulation recorded. No real SMS was sent.' : 'Gateway attempt recorded. Check the log and receiving phone.');
    $('consent').checked = false; $('recipient').value = ''; preview = null; await refresh();
  } catch(error) { notice(error.message + ' Refresh the log before any new send; an uncertain request must not be retried blindly.', true); try { await refresh(); } catch {} }
};
refresh().catch(error => notice('Local server unavailable: ' + error.message + ' Reload once the server is running.', true));
