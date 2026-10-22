import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
export function createStore(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS quotes (id TEXT PRIMARY KEY, share_token TEXT UNIQUE NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL);');
  const upsert = db.prepare('INSERT INTO quotes VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET data=excluded.data');
  const parse = row => row ? JSON.parse(row.data) : null;
  return {
    get: id => parse(db.prepare('SELECT data FROM quotes WHERE id=?').get(id)),
    byToken: token => parse(db.prepare('SELECT data FROM quotes WHERE share_token=?').get(token)),
    list: () => db.prepare('SELECT data FROM quotes ORDER BY created_at DESC LIMIT 100').all().map(parse),
    save: quote => { upsert.run(quote.id, quote.shareToken, JSON.stringify(quote), quote.createdAt); return quote; },
    close: () => db.close()
  };
}
