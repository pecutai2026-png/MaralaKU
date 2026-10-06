const fs = require('node:fs');
const path = require('node:path');
const {DatabaseSync} = require('node:sqlite');
const {exportSnapshot} = require('../server/snapshot.cjs');
const source = path.resolve(process.argv[2] || 'data/marala.sqlite');
const output = path.resolve(process.argv[3] || 'private-exports/marala-cloud.json');
if (source === output || !fs.existsSync(source)) throw new Error('Database sumber tidak ditemukan atau lokasi keluaran tidak valid.');
const db = new DatabaseSync(source, {readOnly:true});
try {
  db.exec('BEGIN');
  const snapshot = exportSnapshot(db);
  db.exec('COMMIT');
  const content = JSON.stringify(snapshot);
  if (Buffer.byteLength(content) > 32_000_000) throw new Error('Cadangan melebihi batas impor 32 MB. Jangan unggah sebagian; perlukan migrasi bertahap.');
  fs.mkdirSync(path.dirname(output), {recursive:true});
  fs.writeFileSync(output, content, {flag:'wx', mode:0o600});
  console.log('Cadangan privat dibuat:', output);
  console.log('Simpan berkas ini secara privat; berisi data usaha dan hash password. Jangan unggah ke GitHub.');
} finally { db.close(); }
