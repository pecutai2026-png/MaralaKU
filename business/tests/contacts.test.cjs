const {test}=require('node:test');const assert=require('node:assert/strict');
const {Store}=require('../server/store.cjs'),contacts=require('../server/contacts.cjs');
const {xlsx}=require('../server/workbook.cjs'),{createApp}=require('../server/server.cjs');
test('nomor Indonesia seragam, format internasional dan placeholder tidak digabung',()=>{
 for(const n of ['0812 3456 7890','6281234567890','+62 (812) 3456-7890','81234567890','006281234567890','8.123456789e10'])assert.equal(contacts.phone(n),'6281234567890');
 assert.equal(contacts.phone('+44 7700 900123'),'447700900123');for(const n of ['0','','abc081234567890','0000000000'])assert.equal(contacts.phone(n),'');
});
test('customer tampil hidup tanpa disalin, kontak duplikat ditolak dan audit dipertahankan',()=>{const s=new Store(':memory:');try{
 const c=s.save('customers',{name:'Ayu',phone:'081234567890'});assert.equal(contacts.list(s).length,1);assert.equal(s.list('contacts').length,0);
 s.save('customers',{name:'Ayu Baru',phone:'081234567890'},c.id);assert.equal(contacts.list(s)[0].name,'Ayu Baru');
 assert.throws(()=>contacts.save(s,{name:'Lain',phone:'+6281234567890'}),/sudah tersimpan/);
 assert.throws(()=>s.save('customers',{name:'Lain',phone:'+6281234567890'}),/sudah terdaftar/);
 const added=s.save('contacts',{name:'Budi',phone:'081234567891'},null,'tester');assert.equal(contacts.list(s).length,2);assert.equal(contacts.list(s,{q:'0812 3456 7891'})[0].id,added.id);assert(contacts.list(s).find(r=>r.id===added.id)._trace.createdBy);
 assert.throws(()=>s.save('contacts',{name:'Bypass',phone:'6281234567891'}),/sudah tersimpan/);
 assert.throws(()=>contacts.save(s,{name:'Wrong',phone:'081234567892'},c.id),/tidak ditemukan/);
 s.put('customers',{name:'Legacy',phone:'+6281234567890'});assert.equal(contacts.list(s).filter(r=>r.duplicate).length,2);
 s.put('customers',{name:'No number',phone:'0'});assert.equal(contacts.list(s).find(r=>r.phone==='0').duplicate,false);
 }finally{s.db.close();}});
test('impor CSV semicolon BOM, duplikat internal/customer, invalid dan pengulangan aman',()=>{const s=new Store(':memory:');try{
 s.save('customers',{name:'Existing',phone:'081234567890'});
 const input={format:'csv',content:'\uFEFFNama;No. WhatsApp;Kategori;Catatan\r\n"A, B";081234567891;Prospek;"Baris 1\nBaris 2"\r\nLain;+6281234567891;;\r\nLama;6281234567890;;\r\nRusak;0;;'};
 const preview=contacts.preview(s,input);assert.deepEqual(preview.rows.map(r=>r.status),['Siap','Duplikat','Duplikat','Perlu diperbaiki']);assert.equal(preview.rows[0].name,'A, B');assert.equal(preview.rows[0].notes,'Baris 1\nBaris 2');assert.equal(s.list('contacts').length,0);
 assert.deepEqual(contacts.commit(s,input,'test'),{inserted:1,duplicates:2,invalid:1});assert.deepEqual(contacts.commit(s,input,'test'),{inserted:0,duplicates:3,invalid:1});
 }finally{s.db.close();}});
test('Excel angka nomor, pemetaan kolom, cek ulang saat commit dan rollback',()=>{const s=new Store(':memory:');try{
 const input={format:'xlsx',content:xlsx([['Person','Mobile','Memo'],['A',81234567890,'Catatan']]).toString('base64')};assert(contacts.preview(s,input).needsMapping);input.mapping={name:0,phone:1,notes:2,category:-1};assert.equal(contacts.preview(s,input).rows[0].phone,'+6281234567890');
 contacts.save(s,{name:'Baru masuk',phone:'081234567890'});assert.equal(contacts.commit(s,input).duplicates,1);
 const second={format:'csv',content:'Nama,WhatsApp\nB,081234567892\nC,081234567893'};const audit=s.audit;s.audit=()=>{throw Error('audit gagal');};assert.throws(()=>contacts.commit(s,second),/audit gagal/);s.audit=audit;assert.equal(s.list('contacts').length,1);
 assert.throws(()=>contacts.parse({format:'csv',content:'Nama,WA\n"rusak'}),/kutip/);
 }finally{s.db.close();}});
test('API kontak login/izin, impor, ekspor dan tidak dapat menghapus customer',async()=>{
 const {server,store:s}=createApp({dbFile:':memory:'});await new Promise(r=>server.listen(0,'127.0.0.1',r));const root='http://127.0.0.1:'+server.address().port;let cookie='';const call=(path,method='GET',body)=>fetch(root+path,{method,headers:{'Content-Type':'application/json',Cookie:cookie},body:body?JSON.stringify(body):undefined});
 try{assert.equal((await call('/api/contacts')).status,401);await call('/api/setup','POST',{name:'Admin',username:'admin',password:'Password12345'});cookie=(await call('/api/login','POST',{username:'admin',password:'Password12345'})).headers.get('set-cookie').split(';')[0];
 const customer=s.save('customers',{name:'Customer',phone:'081234567890'});assert.equal((await call('/api/contacts/'+customer.id,'DELETE',{})).status,404);
 const contact=await (await call('/api/contacts','POST',{name:'Contact',phone:'081234567891'})).json();assert.equal((await call('/api/records/contacts','POST',{name:'Duplicate',phone:'+6281234567891'})).status,409);
 assert.equal((await call('/api/contacts/export')).status,200);assert.equal((await call('/api/contacts/'+contact.id,'DELETE',{})).status,200);assert.equal((await (await call('/api/contacts')).json()).length,1);
 await call('/api/users','POST',{name:'Viewer',username:'viewer',password:'Password12345',role:'VIEWER',active:true});cookie=(await call('/api/login','POST',{username:'viewer',password:'Password12345'})).headers.get('set-cookie').split(';')[0];
 assert.equal((await call('/api/contacts')).status,200);for(const path of ['/api/contacts','/api/contacts/preview','/api/contacts/import'])assert.equal((await call(path,'POST',{})).status,403);assert.equal((await call('/api/contacts/export')).status,403);
 }finally{await new Promise(r=>server.close(r));s.db.close();}
});
