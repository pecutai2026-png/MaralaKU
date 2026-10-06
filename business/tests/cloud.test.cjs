const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const {Miniflare,convertV4MiniflareOptions}=require('miniflare');
const {Store}=require('../server/store.cjs');
const {exportSnapshot}=require('../server/snapshot.cjs');
const {readXlsx}=require('../server/workbook.cjs');
const TOKEN='local-test-only-setup-token-0123456789';
test('Cloudflare pembayaran antrian setelah approval masuk rekap tambahan',async()=>{const mf=runtime(),c=client(mf);try{
 const setup={username:'admin',name:'Admin',password:'Password12345',setupToken:TOKEN};await c.call('/api/setup','POST',setup);await c.call('/api/login','POST',setup);
 const dt=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Jakarta'}),p=await c.call('/api/pos/products','POST',{name:'Teh',category:'Tea',price:5000,cost:2000,active:true});
 const b={key:'cloud-batch-000001',date:dt,method:'Cash',cash:5000,items:[{productId:p.data.id,qty:1}]};await c.call('/api/pos/tickets','POST',b);
 const order=await c.call('/api/pos/tickets','POST',{...b,key:'cloud-queue-000001',mode:'queue'});await c.call('/api/pos/day/submit','POST',{date:dt,countedCash:5000});await c.call('/api/pos/day/approve','POST',{date:dt});
 const paid=await c.call('/api/pos/orders/'+order.data.id+'/pay','POST',{method:'QRIS',qrisConfirmed:true});assert.equal(paid.status,200,JSON.stringify(paid.data));assert.equal(paid.data.batch,1);
 let r=await c.call('/api/pos/report?from='+dt+'&to='+dt);assert.equal(r.data.approvedAmount,5000);assert.equal(r.data.amount,10000);
 assert.equal((await c.call('/api/pos/day/submit','POST',{date:dt+'~1',countedCash:0})).status,200);assert.equal((await c.call('/api/pos/day/approve','POST',{date:dt+'~1'})).status,200);
 r=await c.call('/api/pos/report?from='+dt+'&to='+dt);assert.equal(r.data.approvedAmount,10000);assert.equal(r.data.approvedCost,4000);
 const h=await c.call('/api/pos/history?from='+dt+'&to='+dt+'&product=Teh&method=QRIS');assert.equal(h.status,200);assert.equal(h.data.length,1);assert.equal(h.data[0].inputUser.username,'admin');assert(h.data[0].inputAt);assert.equal(h.data[0].items[0].name,'Teh');
 }finally{await mf.dispose();}});
test('Cloudflare koreksi pengadaan dan ekspor master',async()=>{const mf=runtime(),c=client(mf);try{const setup={username:'admin',name:'Admin',password:'Password12345',setupToken:TOKEN};await c.call('/api/setup','POST',setup);await c.call('/api/login','POST',setup);const u=await c.call('/api/records/units','POST',{name:'Teko'});const body={date:'2026-09-01',unitId:u.data.id,type:'Aset/Peralatan',name:'Teko',unit:'buah',quantity:1,price:100000,source:'Petty Cash',method:'Cash',status:'Dibayar'};const p=await c.call('/api/records/procurements','POST',body);assert.equal(p.status,201);const edited=await c.call('/api/records/procurements/'+p.data.id,'PUT',{...body,price:150000});assert.equal(edited.status,200,JSON.stringify(edited.data));assert.equal((await c.call('/api/petty?period=2026-09')).data.outgoing,150000);assert.equal((await c.call('/api/records/procurements/'+p.data.id,'DELETE')).status,200);assert.equal((await c.call('/api/petty?period=2026-09')).data.outgoing,0);await c.call('/api/pos/products','POST',{name:'Es Teh',category:'Tea',price:5000,cost:2000,active:true});const exported=await c.call('/api/pos/products/export');assert.equal(exported.status,200);assert.match(JSON.stringify(readXlsx(exported.data)),/Es Teh/);const asset=await mf.dispatchFetch('https://marala.test/?workspace=1');assert.equal(asset.headers.get('x-frame-options'),'SAMEORIGIN');}finally{await mf.dispose();}});
test('Cloudflare approval laporan dengan password, arsip tetap dan ekspor',async()=>{const mf=runtime(),c=client(mf);try{
 const setup={username:'admin',name:'Admin',password:'Password12345',setupToken:TOKEN};await c.call('/api/setup','POST',setup);await c.call('/api/login','POST',setup);
 const period={from:'2026-09-01',to:'2026-09-30'},preview=await c.call('/api/report-approvals/preview?'+new URLSearchParams(period));assert.equal(preview.status,200);
 assert.equal((await c.call('/api/report-approvals','POST',{...period,fingerprint:preview.data.fingerprint,password:'bad'})).status,403);
 const approved=await c.call('/api/report-approvals','POST',{...period,fingerprint:preview.data.fingerprint,password:setup.password});assert.equal(approved.status,201,JSON.stringify(approved.data));
 const report=await c.call('/api/report?'+new URLSearchParams(period));assert.equal(report.data.approval.id,approved.data.id);
 const exported=await c.call('/api/report-approvals/'+approved.data.id+'/export?kind=profit');assert.equal(exported.status,200);assert.equal(exported.data.subarray(0,2).toString(),'PK');
 assert.equal((await c.call('/api/records/reportarchives/'+approved.data.id,'DELETE')).status,404);
 }finally{await mf.dispose();}});
function runtime(token=TOKEN,persist){return new Miniflare(convertV4MiniflareOptions({resourcePersistencePath:persist,workers:[{
  name:'marala',modules:true,scriptPath:path.resolve('dist/worker/worker.js'),
  compatibilityDate:'2026-09-22',compatibilityFlags:['nodejs_compat'],
  durableObjects:{MARALA_DB:{className:'MaralaDatabase',useSQLite:true}},
  bindings:{SETUP_TOKEN:token},serviceBindings:{ASSETS:()=>new Response('public asset')}
}]}));}
function client(mf){let cookie='';return {
  async call(p,method='GET',body,extra={}){
    const res=await mf.dispatchFetch('https://marala.test'+p,{method,headers:{'Content-Type':'application/json',Cookie:cookie,'CF-Connecting-IP':'192.0.2.1',...extra},body:body===undefined?undefined:JSON.stringify(body)});
    if(res.headers.get('set-cookie'))cookie=res.headers.get('set-cookie').split(';')[0];
    const data=res.headers.get('content-type')?.includes('json')?await res.json():Buffer.from(await res.arrayBuffer());
    return {status:res.status,headers:res.headers,data};
  }
};}

test('Cloudflare asli: setup terkunci, akun, pembayaran serentak, stok, impor dan export',async()=>{
  const mf=runtime(),c=client(mf);
  try {
    assert.equal((await c.call('/api/session')).data.setupTokenRequired,true);
    const setup={username:'admin',name:'Admin',password:'Password12345'};
    assert.equal((await c.call('/api/setup','POST',setup)).status,403);
    assert.equal((await c.call('/api/setup','POST',{...setup,setupToken:TOKEN})).status,201);
    const login=await c.call('/api/login','POST',setup);assert.equal(login.status,200,JSON.stringify(login.data));assert.match(login.headers.get('set-cookie'),/Secure/);
    const shown=await c.call('/api/users/'+login.data.user.id+'/password','POST',{});assert.equal(shown.status,200);assert.equal(shown.data.password,setup.password);assert.match(shown.headers.get('cache-control'),/no-store/);
    assert.equal((await c.call('/api/setup','POST',{...setup,setupToken:TOKEN})).status,409);
    const unit=(await c.call('/api/records/units','POST',{name:'Teko Marala'})).data;
    const customer=(await c.call('/api/records/customers','POST',{name:'Pelanggan',phone:'0812'})).data;
    const product=(await c.call('/api/records/products','POST',{name:'Teh',code:'TEH',unitId:unit.id,unit:'cup',price:10000,cost:4000})).data;
    const invoice=(await c.call('/api/records/invoices','POST',{unitId:unit.id,customerId:customer.id,date:'2026-09-22',dueDate:'2026-09-30',items:[{productId:product.id,name:'Teh khusus',unit:'cup',price:12000,qty:2,discount:2000}],discount:1000,other:1000})).data;
    assert.equal(invoice.total,22000);
    const payments=await Promise.all([1,2].map(()=>c.call('/api/records/payments','POST',{invoiceId:invoice.id,date:'2026-09-22',amount:15000,method:'Transfer'})));
    assert.deepEqual(payments.map(r=>r.status).sort(),[201,400]);
    assert.equal((await c.call('/api/records/invoices/'+invoice.id)).data.balance,7000);
    assert.equal((await c.call('/api/records/products/'+product.id)).data.price,10000);
    const item=(await c.call('/api/records/stockitems','POST',{name:'Cup',unit:'cup',price:1000,minWarehouse:2,maxWarehouse:50,minTeko:1,maxTeko:20})).data;
    const stocks=(await c.call('/api/records/stocks')).data;
    const warehouse=stocks.find(s=>s.location==='Gudang');
    assert.equal((await c.call('/api/records/movements','POST',{stockId:warehouse.id,date:'2026-09-22',quantity:10,direction:'Masuk'})).status,201);
    const transfers=await Promise.all([1,2].map(()=>c.call('/api/records/transfers','POST',{stockItemId:item.id,date:'2026-09-22',from:'Gudang',to:'Teko Marala',quantity:7})));
    assert.deepEqual(transfers.map(r=>r.status).sort(),[201,400]);
    assert.equal((await c.call('/api/records/transfers')).data.length,1);
    assert.equal((await c.call('/api/dashboard')).data.stockValue,10000);
    const csv='number,date,category,description,unit,amount,method,source,status,notes\nA,2026-09-22,ATK,Satu,Teko Marala,600000,Cash,Petty Cash,Dibayar,\nB,2026-09-22,ATK,Dua,Teko Marala,600000,Cash,Petty Cash,Dibayar,';
    const preview=await c.call('/api/import/preview','POST',{format:'csv',content:csv});
    assert.equal(preview.status,200,JSON.stringify(preview.data));assert.equal(preview.data[0].error,'');assert.match(preview.data[1].error,/Saldo/);
    assert.equal((await c.call('/api/records/expenses')).data.length,0);
    const row={...preview.data[0].data,amount:100000};
    assert.equal((await c.call('/api/import/commit','POST',{rows:[row,row]})).status,409);
    assert.equal((await c.call('/api/records/expenses')).data.length,0);
    assert.equal((await c.call('/api/import/commit','POST',{rows:[row]})).status,200);
    assert.equal((await c.call('/api/petty?period=2026-09')).data.balance,900000);
    assert.equal((await c.call('/api/petty?period=2026-10')).data.balance,900000);
    const management=await c.call('/api/report?from=2026-09-01&to=2026-09-30');
    assert.equal(management.data.revenue,15000);
    assert.equal(management.data.cost,5455);
    const financeExport=await c.call('/api/export?kind=profit&from=2026-09-01&to=2026-09-30');
    assert.equal(financeExport.status,200);
    assert(financeExport.data.includes(Buffer.from('xl/styles.xml')));
    assert(financeExport.data.includes(Buffer.from('Penyusutan')));
    assert.equal((await c.call('/api/finance/settings')).status,200);
    const xlsx=await c.call('/api/export?kind=expenses&from=2026-10-01&to=2026-10-31');
    assert.equal(readXlsx(xlsx.data).length,1);
    assert.equal((await c.call('/api/records/units','POST',{name:'CSRF'},{Origin:'https://evil.test'})).status,403);
    const viewer=await c.call('/api/users','POST',{username:'viewer',name:'Viewer',password:'Password67890',role:'VIEWER'});assert.equal(viewer.status,201);
    await c.call('/api/login','POST',{username:'viewer',password:'Password67890'});
    assert.equal((await c.call('/api/users')).status,403);
    assert.equal((await c.call('/api/records/units','POST',{name:'Ditolak'})).status,403);
    for(let i=0;i<8;i++)assert.equal((await c.call('/api/login','POST',{username:'absent',password:'bad'})).status,401);
    assert.equal((await c.call('/api/login','POST',setup)).status,429);
  } finally {await mf.dispose();}
});

test('Cloudflare: migrasi menjaga akun lama, lampiran besar, rollback dan mencegah overwrite',async()=>{
  const mf=runtime(),c=client(mf),source=new Store(':memory:');
  try {
    source.saveUser({username:'lama',name:'Admin Lama',password:'PasswordLama123',role:'SUPER ADMIN'});
    const logo='data:image/png;base64,'+Buffer.alloc(1800000,17).toString('base64');
    source.setSetting('identity',{...source.setting('identity'),name:'Usaha Lama',logo});
    const backup=exportSnapshot(source.db);
    const broken=structuredClone(backup);broken.tables.records.push({id:'bad',kind:'products',unit_id:'missing',product_id:null,invoice_id:null,date:null,number:null,data:'{}',deleted:0,created_at:'2026-09-22',updated_at:'2026-09-22',_rowid:1});
    assert.equal((await c.call('/api/cloud/restore','POST',backup)).status,403);
    assert.notEqual((await c.call('/api/cloud/restore','POST',broken,{'X-Setup-Token':TOKEN})).status,200);
    assert.equal((await c.call('/api/session')).data.setup,true);
    const restored=await c.call('/api/cloud/restore','POST',backup,{'X-Setup-Token':TOKEN});assert.equal(restored.status,200,JSON.stringify(restored.data));
    assert.equal((await c.call('/api/login','POST',{username:'lama',password:'PasswordLama123'})).status,200);
    assert.equal((await c.call('/api/identity')).data.logo,logo);
    assert.equal((await c.call('/api/cloud/restore','POST',backup,{'X-Setup-Token':TOKEN})).status,409);
    const settings=(await c.call('/api/settings')).data;
    assert.equal((await c.call('/api/settings','POST',{identity:{...settings.identity,logo:''}})).status,200);
    assert.equal((await c.call('/api/identity')).data.logo,'');
  } finally {source.db.close();await mf.dispose();}
});

test('Cloudflare: tanpa secret tidak ada orang yang dapat mengklaim admin',async()=>{
 const mf=runtime(''),c=client(mf);try {assert.equal((await c.call('/api/setup','POST',{username:'admin',name:'Admin',password:'Password12345',setupToken:TOKEN})).status,403);}finally{await mf.dispose();}
});

test('Cloudflare: akun, sesi dan data tetap tersimpan setelah runtime dimulai ulang',async()=>{
 fs.mkdirSync('tests/artifacts',{recursive:true});
 const persist=fs.mkdtempSync(path.resolve('tests/artifacts/cloud-persist-'));
 let mf=runtime(TOKEN,persist);
 try {
  let c=client(mf);
  await c.call('/api/setup','POST',{username:'admin',name:'Admin',password:'Password12345',setupToken:TOKEN});
  const login=await c.call('/api/login','POST',{username:'admin',password:'Password12345'});
  const cookie=login.headers.get('set-cookie').split(';')[0];
  const unit=(await c.call('/api/records/units','POST',{name:'Tetap tersimpan'})).data;
  await mf.dispose();mf=runtime(TOKEN,persist);c=client(mf);
  const session=await c.call('/api/session','GET',undefined,{Cookie:cookie});assert.equal(session.data.user.username,'admin');
  assert.equal((await c.call('/api/records/units/'+unit.id,'GET',undefined,{Cookie:cookie})).data.name,'Tetap tersimpan');
  assert.equal((await c.call('/api/backup?full=1','GET',undefined,{Cookie:cookie})).data.format,'marala-cloud-snapshot');
 } finally {await mf.dispose();}
});
test('Cloudflare resep stok Teko approval dan revisi',async()=>{const mf=runtime(),c=client(mf);try{const setup={username:'admin',name:'Admin',password:'Password12345',setupToken:TOKEN};await c.call('/api/setup','POST',setup);await c.call('/api/login','POST',setup);const dt=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Jakarta'});await c.call('/api/records/stockitems','POST',{name:'Cup',unit:'Pcs',price:100,minTeko:0,maxTeko:100,minWarehouse:0,maxWarehouse:100});const opts=await c.call('/api/pos/stock-options');assert.equal(opts.status,200);const stock=opts.data[0];await c.call('/api/records/movements','POST',{stockId:stock.id,date:dt,direction:'Masuk',quantity:10});const p=await c.call('/api/pos/products','POST',{name:'Teh',category:'Tea',price:5000,cost:2000,stockRecipe:[{stockId:stock.id,quantity:1}]});assert.equal(p.status,201);await c.call('/api/pos/tickets','POST',{key:'cloud-stock-000001',date:dt,method:'Cash',cash:10000,items:[{productId:p.data.id,qty:2}]});await c.call('/api/pos/day/submit','POST',{date:dt,countedCash:10000});const a=await c.call('/api/pos/day/approve','POST',{date:dt});assert.equal(a.status,200,JSON.stringify(a.data));let stocks=await c.call('/api/records/stocks?location=Teko%20Marala');assert.equal(stocks.data[0].quantity,8);await c.call('/api/pos/day/reopen','POST',{date:dt,reason:'Koreksi'});stocks=await c.call('/api/records/stocks?location=Teko%20Marala');assert.equal(stocks.data[0].quantity,10);}finally{await mf.dispose();}});
test('Cloudflare edit massal rollback dan perubahan dua produk',async()=>{const mf=runtime(),c=client(mf);try{const account={username:'admin',name:'Admin',password:'Password12345',setupToken:TOKEN};await c.call('/api/setup','POST',account);await c.call('/api/login','POST',account);const ps=[];for(const name of ['Teh','Kopi'])ps.push((await c.call('/api/pos/products','POST',{name,category:'Minuman',price:5000,cost:2000})).data);const rows=(await c.call('/api/bulk-edit/read','POST',{rows:ps.map(p=>({id:p.id,kind:'posproducts'}))})).data;let r=await c.call('/api/bulk-edit','PUT',{rows:rows.map((p,i)=>({...p,patch:{price:i?-1:6000}}))});assert.equal(r.status,400);assert.equal((await c.call('/api/pos/products')).data.find(p=>p.id===ps[0].id).price,5000);r=await c.call('/api/bulk-edit','PUT',{rows:rows.map(p=>({...p,patch:{price:6000}}))});assert.equal(r.status,200);assert.equal(r.data.count,2);assert((await c.call('/api/pos/products')).data.every(p=>p.price===6000));}finally{await mf.dispose();}});
test('Cloudflare absensi per akun dan rekap khusus Super Admin',async()=>{const mf=runtime(),c=client(mf);try{const owner={username:'owner',name:'Owner',password:'Password12345',setupToken:TOKEN};await c.call('/api/setup','POST',owner);await c.call('/api/login','POST',owner);const u=(await c.call('/api/users','POST',{name:'Rifai',username:'rifai',password:'Password12345',role:'STAFF',active:true})).data;assert.equal((await c.call('/api/attendance/settings','POST',{userId:u.id,start:'08:00',end:'17:00',enabled:true})).status,200);await c.call('/api/login','POST',{username:'rifai',password:'Password12345'});assert.equal((await c.call('/api/attendance/recap')).status,403);assert.equal((await c.call('/api/attendance/punch','POST',{action:'in'})).status,200);assert.equal((await c.call('/api/attendance/punch','POST',{action:'in'})).status,400);assert.equal((await c.call('/api/attendance/punch','POST',{action:'out'})).status,200);assert.equal((await c.call('/api/attendance')).data.rows.length,1);await c.call('/api/login','POST',owner);assert.equal((await c.call('/api/attendance')).data.rows.length,0);assert.equal((await c.call('/api/attendance/recap')).data.length,1);}finally{await mf.dispose();}});
