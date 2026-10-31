import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync, unlinkSync, openSync, closeSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes, createHmac } from 'node:crypto';

export function openStore(directory) {
  mkdirSync(directory, { recursive: true });
  const lock = join(directory, 'operator.lock');
  // A crashed owner's lock can be recovered only when its PID no longer exists.
  if (existsSync(lock)) {
    const previous = readFileSync(lock, 'utf8');
    const pid = Number(previous);
    if (!Number.isSafeInteger(pid) || pid <= 0) throw Error('Invalid operator lock; inspect the private runtime directory.');
    try { process.kill(pid, 0); throw Error('Another demo process owns this runtime directory.'); }
    catch (error) { if (error.code !== 'ESRCH') throw error; }
    if (readFileSync(lock, 'utf8') === previous) unlinkSync(lock);
  }
  const fd = openSync(lock, 'wx', 0o600);
  writeFileSync(fd, String(process.pid)); closeSync(fd);
  try {
    const keyPath = join(directory, 'recipient-hmac.key');
    if (!existsSync(keyPath)) writeFileSync(keyPath, randomBytes(32), { flag: 'wx', mode: 0o600 });
    const key = readFileSync(keyPath);
    if (key.length !== 32) throw Error('Invalid private recipient key.');
    const path = join(directory, 'ledger.json');
    const rows = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : [];
    if (!Array.isArray(rows) || rows.some(row => !row.id || !row.status)) throw Error('Invalid ledger; refusing to discard send history.');
    let closed = false;
    return {
      rows,
      hash(phone) { return createHmac('sha256', key).update(phone).digest('hex'); },
      save() {
        if (closed) throw Error('Store closed.');
        const temp = path + '.tmp';
        writeFileSync(temp, JSON.stringify(rows, null, 2), { mode: 0o600 }); renameSync(temp, path);
      },
      close() { if (!closed) { closed = true; unlinkSync(lock); } },
    };
  } catch (error) { unlinkSync(lock); throw error; }
}
