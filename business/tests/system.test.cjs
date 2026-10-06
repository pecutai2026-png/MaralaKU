const {test}=require('node:test');const assert=require('node:assert/strict');const {Store,date}=require('../server/store.cjs');const {migrate}=require('../server/migrate.cjs');const {xlsx,readXlsx,readCsv,csv}=require('../server/workbook.cjs');const {createApp}=require('../server/server.cjs');
function fixture(){const s=new Store(':memory:');const unit=s.save('units',{name:'Teko Marala'}),customer=s.save('customers',{name:'Test Customer',phone:'0812'}),product=s.save('products',{unitId:unit.id,code:'GT',name:'Green Tea',unit:'Sachet',cost:4000,price:10000});return {s,unit,customer,product};}
function draft(f){return {unitId:f.unit.id,customerId:f.customer.id,date:'2026-09-22',dueDate:'2026-09-29',items:[{productId:f.product.id,name:'Green Tea Khusus',unit:'Paket',qty:2,price:12000,discount:2000,notes:'Tanpa gula'}],discount:1000,other:1000};}
function expense(f,extra={}){return {number:'EXP-001',date:'2026-09-22',unitId:f.unit.id,category:'Operasional',description:'Konsumsi',amount:100000,method:'Cash',source:'Petty Cash',status:'Dibayar',...extra};}
test('master unit, produk, edit, filter relasi dan duplikasi',()=>{const f=fixture();const other=f.s.save('units',{name:'Sewa'});f.s.save('products',{...f.product,name:'Teh Hijau'},f.product.id);assert.equal(f.s.list('products',{unitId:f.unit.id})[0].name,'Teh Hijau');assert.equal(f.s.list('products',{unitId:other.id}).length,0);assert.throws(()=>f.s.save('units',{name:'Teko Marala'}));assert.throws(()=>f.s.remove('units',f.unit.id));f.s.db.close();});
test('snapshot invoice, diskon, harga manual, pembayaran kumulatif dan rekening lama',()=>{const f=fixture();const bank=f.s.save('banks',{name:'BSI',account:'123',owner:'BUMM',active:true});const i=f.s.save('invoices',{...draft(f),bankId:bank.id});assert.equal(i.total,22000);assert.equal(i.items[0].name,'Green Tea Khusus');assert.equal(f.s.get(f.product.id).price,10000);f.s.save('banks',{...bank,account:'456'},bank.id);assert.equal(f.s.get(i.id).bank.account,'123');f.s.save('payments',{invoiceId:i.id,date:'2026-09-22',amount:5000,method:'Cash'});f.s.save('payments',{invoiceId:i.id,date:'2026-09-23',amount:7000,method:'Transfer'});assert.equal(f.s.invoiceView(i).balance,10000);assert.throws(()=>f.s.save('payments',{invoiceId:i.id,date:'2026-09-23',amount:10001,method:'Cash'}));f.s.save('payments',{invoiceId:i.id,date:'2026-09-24',amount:10000,method:'QRIS'});assert.equal(f.s.invoiceView(i).status,'Lunas');assert.throws(()=>f.s.save('invoices',{...draft(f),discount:999999}));f.s.db.close();});
test('stok terpisah, mutasi, nilai, minimum/maksimum, opname dan periode',()=>{const f=fixture();const item=f.s.save('stockitems',{name:'Green Tea',unit:'Sachet',price:10000,minWarehouse:5,maxWarehouse:50,minTeko:5,maxTeko:50});const a=f.s.list('stocks').find(x=>x.stockItemId===item.id&&x.location==='Gudang'),b=f.s.list('stocks').find(x=>x.stockItemId===item.id&&x.location==='Teko Marala');const move=(stockId,quantity,direction='Masuk',dt='2026-09-22')=>f.s.save('movements',{stockId,date:dt,quantity,direction,price:10000});move(a.id,10);move(b.id,5);assert.equal(f.s.stockQuantity(a.id)+f.s.stockQuantity(b.id),15);assert.equal(f.s.stockView(a).value+f.s.stockView(b).value,150000);move(a.id,7,'Keluar');assert.equal(f.s.stockView(a).status,'STOK MINIMUM');assert.throws(()=>move(a.id,4,'Keluar'));const op=f.s.save('opnames',{stockId:a.id,date:'2026-09-23',actual:2,price:10000});assert.equal(op.difference,-1);assert.equal(op.differenceValue,-10000);assert.equal(f.s.stockQuantity(a.id,'2026-09-22'),3);move(a.id,2,'Keluar','2026-09-24');assert.equal(f.s.stockView(a).status,'HABIS');move(a.id,60,'Masuk','2026-09-25');assert.equal(f.s.stockView(a).status,'STOK BERLEBIH');f.s.db.close();});
test('petty cash bulanan, sumber rekening terpisah, rollback saldo kurang',()=>{const f=fixture();f.s.save('expenses',expense(f));f.s.save('expenses',expense(f,{number:'EXP-002',amount:150000}));f.s.save('expenses',expense(f,{number:'EXP-003',amount:500000,source:'Rekening'}));assert.equal(f.s.petty('2026-09').balance,750000);assert.equal(f.s.petty('2026-10').balance,750000);assert.throws(()=>f.s.save('expenses',expense(f,{number:'EXP-004',amount:800000})));f.s.save('funds',{date:'2026-09-23',amount:50000,description:'Tambahan'});assert.equal(f.s.petty('2026-09').balance,800000);assert.equal(f.s.petty('2026-09').history.at(-1).balance,800000);f.s.db.close();});
test('laporan transaksi, rentang tanggal dan tidak hitung ganda pembayaran',()=>{const f=fixture();const i=f.s.save('invoices',draft(f));f.s.save('payments',{invoiceId:i.id,date:'2026-09-22',amount:1000,method:'Cash'});f.s.save('sales',{date:'2026-10-01',unitId:f.unit.id,description:'Oktober',amount:999,cost:0});f.s.save('expenses',expense(f,{amount:5000}));const r=f.s.report({from:'2026-09-01',to:'2026-09-30'});assert.equal(r.revenue,1000);assert.equal(r.cost,364);assert.equal(r.profit,-4364);assert.equal(r.count,1);assert.throws(()=>f.s.list('sales',{from:'2026-10-01',to:'2026-09-01'}));assert.throws(()=>date('2026-13-01'));f.s.db.close();});
test('Excel dan CSV roundtrip aman untuk karakter khusus dan rumus',()=>{const rows=[['number','date','description','amount'],['E1','2026-09-22','A, B "C" & <D>\nBaris',10000],['=HYPERLINK("x")','','',0]];assert.deepEqual(readXlsx(xlsx(rows)),rows.map(r=>r.map(String)));assert.equal(readCsv(csv(rows))[1][2],rows[1][2]);assert.match(readCsv(csv(rows))[2][0],/^'/);assert.throws(()=>readCsv('"belum ditutup'));});
test('migrasi idempoten menjaga snapshot dan data asli',()=>{const f=fixture();const old={customers:[['Lama','123','Acara']],invoices:[['INV/LAMA/1','Lama','22 Sep 2026','Rp9.000','DP']],invoiceDetails:{'INV/LAMA/1':{subtotal:10000,discount:2000,other:1000}},payments:[{date:'22 Sep 2026',invoice:'INV/LAMA/1',customer:'Lama',method:'Cash',amount:5000}]};const first=f.s.tx(()=>migrate(f.s,old,'test'));assert(first.count>0);const count=f.s.list('invoices').length;assert.equal(f.s.tx(()=>migrate(f.s,old,'test')).count,0);assert.equal(f.s.list('invoices').length,count);assert.equal(f.s.invoiceView(f.s.list('invoices')[0]).balance,4000);assert.equal(f.s.db.prepare('SELECT count(*) n FROM imports').get().n,1);f.s.db.close();});
test('API login, permission server, CSRF, import atomic, export filter, reset password',async()=>{const {server,store}=createApp({dbFile:':memory:'});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;let cookie='';const call=async(p,method='GET',body,headers={})=>{const res=await fetch(base+p,{method,headers:{'Content-Type':'application/json',Cookie:cookie,...headers},body:body?JSON.stringify(body):undefined});return {status:res.status,res,data:res.headers.get('content-type')?.includes('json')?await res.json():await res.arrayBuffer()};};try{
 assert.equal((await call('/api/records/expenses')).status,401);
 assert.equal((await call('/api/setup','POST',{name:'Admin',username:'admin',password:'Password12345'})).status,201);
 const login=await call('/api/login','POST',{username:'admin',password:'Password12345'});assert.equal(login.status,200);cookie=login.res.headers.get('set-cookie').split(';')[0];const adminCookie=cookie;
 const unit=(await call('/api/records/units','POST',{name:'Teko Marala'})).data;
 const u=(await call('/api/users','POST',{username:'viewer',name:'Viewer',password:'Password67890',role:'VIEWER',active:true,permissions:{expenses:['view'],reports:['view','export']}})).data;assert(u.id);assert.equal((await call('/api/activity')).status,200);const unitTrace=await call('/api/activity?recordId='+unit.id);assert.equal(unitTrace.status,200);assert.equal(unitTrace.data.record._trace.createdBy.username,'admin');
 assert.equal((await call('/api/records/units','POST',{name:'CSRF'},{Origin:'https://evil.example'})).status,403);
 const preview=await call('/api/import/preview','POST',{format:'csv',content:'number,date,category,description,unit,amount,method,source,status,notes\nA,2026-09-22,ATK,Satu,Teko Marala,600000,Cash,Petty Cash,Dibayar,\nB,2026-09-22,ATK,Dua,Teko Marala,600000,Cash,Petty Cash,Dibayar,'});assert.equal(preview.status,200);assert.equal(preview.data[0].error,'');assert.match(preview.data[1].error,/Saldo/);assert.equal(store.list('expenses').length,0);
 const d={number:'A',date:'2026-09-22',unitId:unit.id,category:'ATK',description:'Satu',amount:100000,method:'Cash',source:'Petty Cash',status:'Dibayar'};
 assert.equal((await call('/api/import/commit','POST',{rows:[d,{...d}]})).status,409);assert.equal(store.list('expenses').length,0);
 assert.equal((await call('/api/import/commit','POST',{rows:[d]})).status,200);
 const exp=await call('/api/export?kind=expenses&from=2026-10-01&to=2026-10-31');assert.equal(readXlsx(Buffer.from(exp.data)).length,1);
 const vl=await call('/api/login','POST',{username:'viewer',password:'Password67890'});cookie=vl.res.headers.get('set-cookie').split(';')[0];assert.equal((await call('/api/records/expenses')).status,200);assert.equal((await call('/api/records/expenses','POST',{...d,number:'B'})).status,403);assert.equal((await call('/api/users')).status,403);assert.equal((await call('/api/settings')).status,403);assert.equal((await call('/api/activity')).status,403);assert.equal((await call('/api/activity?recordId='+unit.id)).status,403);assert.equal((await call('/api/export?kind=expenses')).status,403);
 cookie=adminCookie;assert.equal((await call('/api/users/'+u.id,'PUT',{...u,password:'NewPassword123',active:true})).status,200);assert.equal((await call('/api/login','POST',{username:'viewer',password:'Password67890'})).status,401);assert.equal((await call('/api/login','POST',{username:'viewer',password:'NewPassword123'})).status,200);
 }finally{await new Promise(r=>server.close(r));store.db.close();}});
test('pengaturan, lampiran, rekening, persetujuan dan izin laporan terpisah',async()=>{const {server,store}=createApp({dbFile:':memory:'});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;let cookie='';const call=async(p,method='GET',body)=>{const res=await fetch(base+p,{method,headers:{'Content-Type':'application/json',Cookie:cookie},body:body?JSON.stringify(body):undefined});return {status:res.status,res,data:res.headers.get('content-type')?.includes('json')?await res.json():await res.arrayBuffer()};};try{await call('/api/setup','POST',{name:'Admin',username:'admin',password:'Password12345'});const login=await call('/api/login','POST',{username:'admin',password:'Password12345'});cookie=login.res.headers.get('set-cookie').split(';')[0];const adminCookie=cookie;
const originalManifest=(await call('/manifest.webmanifest')).data;assert.equal(originalManifest.start_url,'/index.html');
const appIcon='data:image/png;base64,iVBORw0KGgo=';
assert.equal((await call('/api/settings','POST',{application:{name:'Aplikasi Baru',shortName:'Marala Baru',icon192:appIcon,icon512:appIcon}})).status,200);
const manifest=(await call('/manifest.webmanifest')).data;assert.equal(manifest.name,'Aplikasi Baru');assert.equal(manifest.id,originalManifest.id);assert.equal(manifest.icons.length,2);const firstIcon=manifest.icons[0].src;
assert.equal((await call(firstIcon)).res.headers.get('content-type'),'image/png');
assert.equal((await call('/api/settings','POST',{application:{name:'Berubah Lagi',shortName:'Marala'}})).status,200);
assert.notEqual((await call('/manifest.webmanifest')).data.icons[0].src,firstIcon);
assert.equal((await call('/api/settings','POST',{application:{name:'Invalid',icon192:'data:application/pdf;base64,AA==',icon512:appIcon}})).status,400);
assert.equal((await call('/manifest.webmanifest')).data.name,'Berubah Lagi');
const savedCookie=cookie;cookie='';assert.equal((await call('/manifest.webmanifest')).status,200);assert.equal((await call('/api/application-brand')).data.name,'Berubah Lagi');assert.equal((await call('/api/settings','POST',{application:{name:'Forbidden'}})).status,401);cookie=savedCookie;
const settings=(await call('/api/settings')).data;const logo='data:image/png;base64,iVBORw0KGgo=';assert.equal((await call('/api/settings','POST',{identity:{...settings.identity,name:'BUMM Baru',address:'Alamat Uji',logo},invoice:{...settings.invoice,prefix:'INV/BARU',showFooter:false}})).status,200);assert.equal((await call('/api/identity')).data.logo,logo);assert.equal((await call('/api/settings')).data.invoice.prefix,'INV/BARU');assert.equal((await call('/api/settings','POST',{identity:{name:'X',logo:'javascript:alert(1)'}})).status,400);
const unit=(await call('/api/records/units','POST',{name:'Unit Uji'})).data;const request=(await call('/api/records/requests','POST',{number:'REQ-1',letterNumber:'SURAT-1',date:'2026-09-22',applicant:'Staff',unitId:unit.id,description:'Operasional',amount:100000,status:'Disetujui'})).data;assert.equal(request.letterNumber,'SURAT-1');
const staff=(await call('/api/users','POST',{name:'Staff',username:'staff',password:'StaffPassword123',role:'STAFF',active:true,permissions:{requests:['view','edit','delete'],reports:['view','export']}})).data;const sl=await call('/api/login','POST',{username:'staff',password:'StaffPassword123'});cookie=sl.res.headers.get('set-cookie').split(';')[0];assert.equal((await call('/api/records/requests/'+request.id,'PUT',{...request,amount:1})).status,403);assert.equal((await call('/api/records/requests/'+request.id,'DELETE',{})).status,403);assert.equal((await call('/api/report/opnames')).status,200);assert.equal((await call('/api/records/opnames')).status,403);assert.equal((await call('/api/export?kind=opnamereport')).status,200);for(const kind of ['profit','revenue'])assert.equal((await call('/api/export?kind='+kind+'&from=2026-09-01&to=2026-09-30')).status,200);
cookie=adminCookie;const admin=(await call('/api/session')).data.user;assert.equal((await call('/api/users/'+admin.id,'DELETE',{})).status,400);assert.equal((await call('/api/users/'+staff.id,'PUT',{...staff,active:false})).status,200);assert.equal((await call('/api/login','POST',{username:'staff',password:'StaffPassword123'})).status,401);
}finally{await new Promise(r=>server.close(r));store.db.close();}});
test('stok independen, transfer atomik dan nilai gabungan',()=>{const s=new Store(':memory:');const item=s.save('stockitems',{name:'Cup 16 oz',unit:'cup',price:1000,minWarehouse:10,maxWarehouse:100,minTeko:5,maxTeko:50});assert.equal(s.list('products').length,0);assert.equal(s.list('units').length,0);const [wh,te]=['Gudang','Teko Marala'].map(location=>s.list('stocks').find(x=>x.stockItemId===item.id&&x.location===location));s.save('movements',{stockId:wh.id,date:'2026-09-22',direction:'Masuk',quantity:20});const t=s.tx(()=>s.save('transfers',{stockItemId:item.id,date:'2026-09-22',from:'Gudang',to:'Teko Marala',quantity:7}));assert.equal(s.stockQuantity(wh.id),13);assert.equal(s.stockQuantity(te.id),7);assert.equal(s.list('stocks').reduce((v,r)=>v+s.stockView(r).value,0),20000);assert.equal(s.list('movements').filter(m=>m.transferId===t.id).length,2);assert.throws(()=>s.save('transfers',{stockItemId:item.id,date:'2026-09-22',from:'Gudang',to:'Teko Marala',quantity:14}));assert.equal(s.stockQuantity(wh.id),13);assert.equal(s.stockQuantity(te.id),7);assert.equal(s.list('transfers').length,1);assert.throws(()=>s.save('transfers',{stockItemId:item.id,date:'2026-09-22',from:'Gudang',to:'Gudang',quantity:1}));assert.throws(()=>s.remove('transfers',t.id));s.db.close();});
test('migrasi stok lama menjaga saldo, riwayat dan melepaskan relasi penjualan',()=>{const s=new Store(':memory:');const u=s.put('units',{name:'Penjualan'}),p=s.put('products',{name:'Cup',unitId:u.id});const stock=s.put('stocks',{name:'Cup',productId:p.id,unitId:u.id,location:'Gudang',unit:'cup',min:2,max:50,price:1000});s.put('movements',{stockId:stock.id,productId:p.id,unitId:u.id,date:'2026-09-22',quantity:10,delta:10,price:1000});s.tx(()=>require('../server/inventory.cjs').normalize(s));assert.equal(s.stockQuantity(stock.id),10);assert.equal(s.list('stockitems').length,1);assert.equal(s.list('stocks').length,2);assert.equal(s.get(stock.id).productId,undefined);assert.equal(s.list('movements')[0].productId,undefined);assert.equal(s.get(p.id).name,'Cup');s.tx(()=>require('../server/inventory.cjs').normalize(s));assert.equal(s.list('stocks').length,2);s.db.close();});

test('dashboard mengikuti pembayaran lintas bulan, filter unit, koreksi dan penjualan tanpa hitung ganda',()=>{
 const f=fixture(),s=f.s;
 const i=s.save('invoices',{...draft(f),date:'2026-08-01',dueDate:'2026-09-30',items:[{productId:f.product.id,name:'Sewa',unit:'Paket',qty:1,price:1950000}],discount:0,other:0});
 assert.equal(s.dashboard({}).revenue,0);
 const dp=s.save('payments',{invoiceId:i.id,date:'2026-08-19',amount:500000,method:'Transfer'});
 const final=s.save('payments',{invoiceId:i.id,date:'2026-09-06',amount:1450000,method:'Transfer'});
 assert.equal(s.dashboard({from:'2026-08-01',to:'2026-08-31',unitId:f.unit.id}).revenue,500000);
 assert.equal(s.dashboard({from:'2026-09-01',to:'2026-09-30',unitId:f.unit.id}).revenue,1450000);
 assert.equal(s.dashboard({q:i.number}).revenue,1950000);
 assert.equal(s.dashboard({unitId:'other'}).revenue,0);
 s.save('sales',{date:'2026-09-07',unitId:f.unit.id,description:'Tunai',amount:50000,cost:5000});
 const d=s.dashboard({from:'2026-07-01',to:'2026-10-31'});
 assert.deepEqual(d.monthly.map(m=>m.revenue),[0,500000,1500000,0]);
 assert.equal(d.revenue,2000000);assert.equal(d.cost,9000);
 assert.equal(d.units.reduce((n,u)=>n+u.revenue,0),d.revenue);
 assert.equal(d.monthly.reduce((n,m)=>n+m.revenue,0),d.revenue);
 s.save('payments',{...final,date:'2026-10-06'},final.id);
 assert.equal(s.dashboard({from:'2026-09-01',to:'2026-09-30'}).revenue,50000);
 s.remove('payments',dp.id);assert.equal(s.dashboard({from:'2026-08-01',to:'2026-08-31'}).revenue,0);
 assert.throws(()=>s.dashboard({from:'2026-10-01',to:'2026-08-01'}));
 s.db.close();
});

test('nomor pengeluaran otomatis, tetap saat edit, batch atomik dan saldo kumulatif',()=>{
 const f=fixture(),s=f.s;
 const a=s.tx(()=>s.save('expenses',{...expense(f),number:''}));
 assert.equal(a.number,'EXP/2026/00001');
 const b=s.tx(()=>s.save('expenses',{...expense(f),number:undefined}));
 assert.equal(b.number,'EXP/2026/00002');
 assert.equal(s.save('expenses',{...a,number:'changed',date:'2026-09-23'},a.id).number,a.number);
 const before=s.list('expenses').length;
 assert.throws(()=>s.tx(()=>[s.save('expenses',{...expense(f),number:'',amount:500000}),s.save('expenses',{...expense(f),number:'',amount:500000})]));
 assert.equal(s.list('expenses').length,before);
 const c=s.tx(()=>s.save('expenses',{...expense(f),number:''}));assert.equal(c.number,'EXP/2026/00003');
 s.remove('expenses',c.id);
 assert.equal(s.tx(()=>s.save('expenses',{...expense(f),number:''})).number,'EXP/2026/00004');
 s.db.close();
});

test('API massal menjaga izin, rollback, pembayaran dan stok kumulatif',async()=>{
 const {server,store:s}=createApp({dbFile:':memory:'});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;let cookie='';
 const call=async(path,body)=>{const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(body)});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')};};
 try{
 assert.equal((await call('/api/batch/customers',{rows:[{name:'A',phone:'1'}]})).status,401);
 await call('/api/setup',{name:'Admin',username:'admin',password:'Password12345'});cookie=(await call('/api/login',{username:'admin',password:'Password12345'})).cookie.split(';')[0];
 assert.equal((await call('/api/batch/customers',{rows:[{name:'A',phone:'1'},{name:'B',phone:'2'}]})).status,201);
 assert.equal((await call('/api/batch/customers',{rows:[{name:'C',phone:'3'},{name:'A',phone:'4'}]})).status,400);assert.equal(s.list('customers').length,2);
 assert.equal((await call('/api/batch/units',{rows:[]})).status,400);
 await call('/api/batch/units',{rows:[{name:'Unit A'},{name:'Unit B'}]});const unit=s.list('units')[0],customer=s.list('customers')[0];
 await call('/api/batch/products',{rows:[{unitId:unit.id,name:'Produk',code:'P1',unit:'buah',price:10000,cost:1000}]});const product=s.list('products')[0];
 const invoice={unitId:unit.id,customerId:customer.id,date:'2026-09-23',dueDate:'2026-09-23',items:[{productId:product.id,name:'Produk',unit:'buah',qty:1,price:10000}]};
 assert.equal((await call('/api/batch/invoices',{rows:[invoice,invoice]})).status,201);const i=s.list('invoices')[0];
 let result=await call('/api/batch/payments',{rows:[{invoiceId:i.id,date:'2026-09-23',amount:6000,method:'Cash'},{invoiceId:i.id,date:'2026-09-23',amount:6000,method:'Cash'}]});assert.equal(result.status,400);assert.match(result.data.error,/Baris 2/);assert.equal(s.paid(i.id),0);
 await call('/api/batch/stockitems',{rows:[{name:'Stok',unit:'kg',price:1000,minTeko:0,minWarehouse:0,maxTeko:100,maxWarehouse:100}]});const stock=s.list('stocks')[0];
 result=await call('/api/batch/movements',{rows:[{stockId:stock.id,date:'2026-09-23',quantity:2,direction:'Masuk'},{stockId:stock.id,date:'2026-09-23',quantity:3,direction:'Keluar'}]});assert.equal(result.status,400);assert.equal(s.stockQuantity(stock.id),0);
 await call('/api/batch/users',{rows:[{name:'Staff',username:'staff',password:'Password12345',role:'STAFF',active:true}]});cookie=(await call('/api/login',{username:'staff',password:'Password12345'})).cookie.split(';')[0];
 assert.equal((await call('/api/batch/users',{rows:[{name:'Bad',username:'bad',password:'Password12345',role:'SUPER ADMIN'}]})).status,403);
 result=await call('/api/batch/requests',{rows:[{number:'R1',letterNumber:'S1',date:'2026-09-23',unitId:unit.id,applicant:'A',description:'Test',amount:1,status:'Disetujui'}]});assert.equal(result.status,403);assert.equal(s.list('requests').length,0);
 }finally{await new Promise(r=>server.close(r));s.db.close();}
});

test('jejak akun tahan pemalsuan, perubahan nama, penghapusan dan rollback massal',()=>{
 const s=new Store(':memory:');try{
 const a=s.saveUser({name:'Operator A',username:'operatora',password:'Password12345',role:'ADMIN'},undefined,'setup');
 const b=s.saveUser({name:'Operator B',username:'operatorb',password:'Password12345',role:'ADMIN'},undefined,'setup');
 const c=s.save('customers',{name:'Customer Trace',phone:'1',_trace:{createdBy:{name:'Palsu'}}},undefined,a.id);
 let v=s.get(c.id);assert.equal(v._trace.createdBy.id,a.id);assert.equal(v._trace.createdBy.name,'Operator A');
 s.save('customers',{...v,phone:'2',_trace:{createdBy:{name:'Palsu'}}},c.id,b.id);v=s.get(c.id);assert.equal(v._trace.createdBy.id,a.id);assert.equal(v._trace.updatedBy.id,b.id);
 s.saveUser({...a,name:'Nama Baru'},a.id,b.id);assert.equal(s.get(c.id)._trace.createdBy.name,'Operator A');
 const before=s.activityEvents().length;assert.throws(()=>s.tx(()=>{s.save('customers',{name:'Rollback',phone:'3'},undefined,b.id);throw Error('cancel');}));assert.equal(s.activityEvents().length,before);
 s.remove('customers',c.id,b.id);assert.equal(s.get(c.id,null,true)._trace.updatedBy.id,b.id);assert(s.activityEvents().some(e=>e.recordId===c.id&&e.action==='delete'));
 const old=s.put('customers',{name:'Tanpa riwayat',phone:'0'});assert.equal(s.provenance({...old,kind:'customers'})._trace.createdBy,null);
 const unit=s.save('units',{name:'Jejak'},undefined,a.id);s.save('units',{...unit,name:'Jejak Edit'},unit.id,b.id);assert.equal(s.get(unit.id)._trace.createdBy.id,a.id);
 }finally{s.db.close();}
});
