const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Store}=require('../server/store.cjs');
const {exportSnapshot,restore}=require('../server/snapshot.cjs');

test('pemulihan privat menjaga ID, akun, urutan riwayat dan menolak overwrite',()=>{
  const source=new Store(':memory:'), destination=new Store(':memory:');
  try {
    source.saveUser({username:'admin',name:'Admin',password:'Password12345',role:'SUPER ADMIN'});
    const item=source.save('stockitems',{name:'Cup',unit:'cup',price:1000,minWarehouse:1,maxWarehouse:20,minTeko:1,maxTeko:20});
    const warehouse=source.list('stocks').find(s=>s.location==='Gudang');
    source.tx(()=>source.save('movements',{stockId:warehouse.id,date:'2026-09-22',quantity:10,direction:'Masuk'}));
    source.tx(()=>source.save('transfers',{stockItemId:item.id,date:'2026-09-22',quantity:4,from:'Gudang',to:'Teko Marala'}));
    const backup=exportSnapshot(source.db);
    assert(!('sessions' in backup.tables));
    const broken=structuredClone(backup);broken.tables.records.find(r=>r.kind==='stocks').unit_id='missing';
    assert.throws(()=>restore(destination,broken));
    assert.equal(destination.list('stockitems').length,0);
    assert.equal(destination.db.prepare('SELECT count(*) n FROM users').get().n,0);
    assert.equal(restore(destination,backup).users,1);
    assert.equal(destination.stockQuantity(warehouse.id),6);
    assert.deepEqual(destination.list('movements'),source.list('movements'));
    assert.equal(destination.db.prepare('SELECT password FROM users').get().password,backup.tables.users[0].password);
    assert.throws(()=>restore(destination,backup),/kosong/);
  } finally {source.db.close();destination.db.close();}
});
