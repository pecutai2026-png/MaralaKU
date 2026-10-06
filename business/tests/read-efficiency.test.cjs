const {test}=require('node:test'),assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite');
const {CloudDatabase}=require('../cloudflare/sqlite.cjs');
test('request cache mengurangi pembacaan berulang, terisolasi dan invalid saat tulis/rollback',()=>{
 const native=new DatabaseSync(':memory:');let reads=0;
 const storage={sql:{exec(sql,...args){const stmt=native.prepare(sql);if(/^\s*SELECT/i.test(sql)){const rows=stmt.all(...args);reads+=rows.length;return {toArray:()=>rows};}stmt.run(...args);return {toArray:()=>[]};}},transactionSync(fn){native.exec('SAVEPOINT testing');try{const r=fn();native.exec('RELEASE testing');return r;}catch(e){native.exec('ROLLBACK TO testing; RELEASE testing');throw e;}}};
 const db=new CloudDatabase(storage);db.exec('CREATE TABLE sample(id INTEGER PRIMARY KEY, value TEXT)');for(let i=0;i<100;i++)db.prepare('INSERT INTO sample VALUES(?,?)').run(i,'old');
 const query=()=>db.prepare('SELECT * FROM sample ORDER BY id').all();
 for(let i=0;i<100;i++)query();const before=reads;assert.equal(before,10000);
 reads=0;db.beginRequest();for(let i=0;i<100;i++)query();assert.equal(reads,100);query()[0].value='mutated';assert.equal(query()[0].value,'old');
 db.prepare('UPDATE sample SET value=? WHERE id=?').run('new',0);assert.equal(query()[0].value,'new');
 assert.throws(()=>db.transactionSync(()=>{db.prepare('UPDATE sample SET value=? WHERE id=?').run('rollback',0);assert.equal(query()[0].value,'rollback');throw Error('rollback');}));assert.equal(query()[0].value,'new');
 db.endRequest();native.prepare('UPDATE sample SET value=? WHERE id=?').run('next-request',0);db.beginRequest();assert.equal(query()[0].value,'next-request');db.endRequest();native.close();
 console.log('Skenario 100 pembacaan identik × 100 baris: 10.000 → 100 baris hasil query (99%); bukan estimasi total pemakaian produksi.');
});
