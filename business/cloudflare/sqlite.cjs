const crypto = require('node:crypto');

// Adapt Cloudflare's synchronous SQLite cursor to the interface used by Store.
// Large JSON values are split so existing 2 MB attachments survive migration.
class CloudDatabase {
  constructor(storage) {
    this.storage = storage;
    this.sql = storage.sql;
    this.sql.exec('CREATE TABLE IF NOT EXISTS cloud_large_values (id TEXT, part INTEGER, value TEXT NOT NULL, PRIMARY KEY(id,part))');
  }
  beginRequest() { this.readCache = new Map(); this.cacheBytes = 0; }
  endRequest() { this.readCache = null; this.cacheBytes = 0; }
  invalidate() { if (this.readCache) this.readCache.clear(); this.cacheBytes = 0; }
  exec(sql) { this.invalidate(); this.sql.exec(sql); }
  transactionSync(fn) { try { return this.storage.transactionSync(fn); } catch (error) { this.invalidate(); throw error; } }
  decode(value) {
    if (typeof value !== 'string' || !/^@marala:blob:[a-f0-9-]{36}$/.test(value)) return value;
    const rows = this.sql.exec('SELECT value FROM cloud_large_values WHERE id=? ORDER BY part', value.slice(13)).toArray();
    if (!rows.length) throw new Error('Lampiran database tidak lengkap.');
    return rows.map(r => r.value).join('');
  }
  rows(sql, args) {
    const key = /^\s*SELECT\b/i.test(sql) && this.readCache ? JSON.stringify([sql,args]) : null;
    if (key && this.readCache.has(key)) return structuredClone(this.readCache.get(key));
    const rows = this.sql.exec(sql, ...args).toArray().map(row => Object.fromEntries(
      Object.entries(row).map(([key, value]) => [key, ['data', 'value', 'payload'].includes(key) ? this.decode(value) : value])
    ));
    if (key) { const size = Buffer.byteLength(JSON.stringify(rows)); if (size < 1000000 && this.cacheBytes + size < 8000000 && this.readCache.size < 256) { this.readCache.set(key,structuredClone(rows)); this.cacheBytes += size; } }
    return rows;
  }
  prepare(sql) {
    return {
      get: (...args) => this.rows(sql, args)[0],
      all: (...args) => this.rows(sql, args),
      run: (...args) => this.transactionSync(() => {
        this.invalidate();
        const target = /^INSERT INTO records\b/i.test(sql) ? ['records', 'id', 'data', 7]
          : /^INSERT INTO settings\b/i.test(sql) ? ['settings', 'key', 'value', 1]
          : /^INSERT INTO imports\b/i.test(sql) ? ['imports', 'digest', 'payload', 1] : null;
        let old;
        if (target) {
          const [table, key, column, index] = target;
          old = this.sql.exec(`SELECT ${column} AS previous FROM ${table} WHERE ${key}=?`, args[0]).toArray()[0]?.previous;
          const value = args[index];
          if (typeof value === 'string' && Buffer.byteLength(value, 'utf8') > 900000) {
            const id = crypto.randomUUID();
            // 200k UTF-16 units remain below SQLite's row limit even for Unicode.
            for (let offset = 0, part = 0; offset < value.length; part++) {
              let end = Math.min(value.length, offset + 200000);
              if (end < value.length && /[\uD800-\uDBFF]/.test(value[end - 1])) end--;
              this.sql.exec('INSERT INTO cloud_large_values VALUES(?,?,?)', id, part, value.slice(offset, end));
              offset = end;
            }
            args[index] = '@marala:blob:' + id;
          }
        }
        const result = this.sql.exec(sql, ...args).toArray();
        if (typeof old === 'string' && /^@marala:blob:[a-f0-9-]{36}$/.test(old)) {
          this.sql.exec('DELETE FROM cloud_large_values WHERE id=?', old.slice(13));
        }
        return result;
      })
    };
  }
}

class LoginAttempts {
  constructor(db) {
    this.db = db;
    db.exec('CREATE TABLE IF NOT EXISTS login_attempts (ip TEXT PRIMARY KEY, count INTEGER NOT NULL, until INTEGER NOT NULL, expires INTEGER NOT NULL); CREATE INDEX IF NOT EXISTS login_expiry ON login_attempts(expires)');
  }
  key(ip) { return crypto.createHash('sha256').update(ip).digest('hex'); }
  get(ip) { return this.db.prepare('SELECT count,until FROM login_attempts WHERE ip=? AND expires>?').get(this.key(ip), Date.now()); }
  set(ip, value) {
    this.db.prepare('DELETE FROM login_attempts WHERE expires<=?').run(Date.now());
    this.db.prepare('INSERT INTO login_attempts VALUES(?,?,?,?) ON CONFLICT(ip) DO UPDATE SET count=excluded.count,until=excluded.until,expires=excluded.expires').run(this.key(ip), value.count, value.until, Date.now() + 900000);
  }
  delete(ip) { this.db.prepare('DELETE FROM login_attempts WHERE ip=?').run(this.key(ip)); }
}
module.exports = { CloudDatabase, LoginAttempts };
