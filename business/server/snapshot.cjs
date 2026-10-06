const {fail} = require('./domain.cjs');
const COLUMNS = {
  records: ['id','kind','unit_id','product_id','invoice_id','date','number','data','deleted','created_at','updated_at'],
  users: ['id','username','name','password','role','permissions','active','deleted'],
  settings: ['key','value'], imports: ['digest','payload','at'], audit: ['id','actor','action','entity','at']
};
function exportSnapshot(db) {
  const tables = {};
  for (const table of Object.keys(COLUMNS)) tables[table] = db.prepare(`SELECT ${table === 'records' ? 'rowid AS _rowid,' : ''}* FROM ${table} ORDER BY rowid`).all();
  return {format:'marala-cloud-snapshot',version:2,createdAt:new Date().toISOString(),tables};
}
function restore(store, snapshot) {
  if (snapshot?.format !== 'marala-cloud-snapshot' || snapshot.version !== 2 || !snapshot.tables) fail('Gunakan cadangan dari alat ekspor Cloudflare versi 2.');
  for (const [table, columns] of Object.entries(COLUMNS)) {
    const rows = snapshot.tables[table];
    if (!Array.isArray(rows) || rows.length > 100000) fail('Tabel cadangan tidak valid: ' + table);
    for (const row of rows) {
      if (!row || columns.some(key => !(key in row) || ![null,'string','number'].includes(row[key] === null ? null : typeof row[key]))) fail('Baris cadangan tidak valid: ' + table);
      if (table === 'records' && (!Number.isSafeInteger(row._rowid) || row._rowid < 1)) fail('Urutan riwayat stok tidak valid.');
      if (table === 'users' && !/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(row.password)) fail('Format password akun tidak didukung.');
      if (['records','settings','users'].includes(table)) {
        try { JSON.parse(row[table === 'records' ? 'data' : table === 'settings' ? 'value' : 'permissions']); }
        catch { fail('JSON cadangan rusak: ' + table); }
      }
    }
  }
  if (!snapshot.tables.users.some(u => u.active === 1 && u.deleted === 0 && u.role === 'SUPER ADMIN')) fail('Cadangan harus memiliki Super Admin aktif.');
  return store.tx(() => {
    if (store.db.prepare('SELECT count(*) n FROM users').get().n || store.db.prepare('SELECT count(*) n FROM records').get().n) fail('Pemulihan hanya diizinkan pada database online yang masih kosong.',409);
    store.db.exec('PRAGMA defer_foreign_keys=ON');
    for (const [table, original] of Object.entries(COLUMNS)) {
      const columns = table === 'records' ? [...original, 'rowid'] : original;
      const suffix = table === 'settings' ? ' ON CONFLICT(key) DO UPDATE SET value=excluded.value' : '';
      const sql = `INSERT INTO ${table}(${columns.join(',')}) VALUES(${columns.map(() => '?').join(',')})${suffix}`;
      for (const row of snapshot.tables[table]) store.db.prepare(sql).run(...columns.map(key => row[key === 'rowid' ? '_rowid' : key]));
    }
    if (store.db.prepare('PRAGMA foreign_key_check').all().length) fail('Relasi data cadangan tidak lengkap.');
    require('./inventory.cjs').normalize(store);
    store.audit('cloud-migration','restore','snapshot-v2');
    store.db.exec('PRAGMA defer_foreign_keys=OFF');
    return {ok:true,records:snapshot.tables.records.length,users:snapshot.tables.users.length};
  });
}
module.exports = {exportSnapshot,restore};
