const {mock}=require('node:test');mock.timers.enable({apis:['Date'],now:new Date('2026-09-22T12:00:00Z')});
const {test}=require('node:test'),assert=require('node:assert/strict');const {Store}=require('../server/store.cjs');const pos=require('../server/pos.cjs');const {xlsxSheets,readXlsx}=require('../server/workbook.cjs');
const admin={id:'admin',role:'SUPER ADMIN'};
function fixture(){const s=new Store(':memory:');const a=pos.saveProduct(s,{name:'Es Teh',category:'Teh',price:5000,cost:2000},undefined,'admin'),b=pos.saveProduct(s,{name:'Green Tea',category:'Teh',price:15000,cost:7000},undefined,'admin');return {s,a,b};}
function ticket(f,key='test-key-0000000001',date='2026-09-21'){mock.timers.setTime(Date.parse(date+'T12:00:00Z'));return pos.createSale(f.s,{key,date,method:'Cash',cash:50000,items:[{productId:f.a.id,qty:3},{productId:f.b.id,qty:1}]},'kasir');}
test('POS snapshots, discounts, retry safety, cash and reports by product per date',()=>{const f=fixture();try{
 const t=ticket(f);assert.equal(t.amount,30000);assert.equal(t.cost,13000);assert.equal(t.change,20000);assert.equal(f.s.dashboard({}).revenue,0);
 assert.equal(ticket(f).id,t.id);assert.equal(f.s.list('postickets').length,1);
 pos.saveProduct(f.s,{...f.a,price:6000,cost:3000},f.a.id,'admin');assert.equal(f.s.get(t.id).items[0].price,5000);
 mock.timers.setTime(Date.parse('2026-09-22T12:00:00Z'));const b=pos.createSale(f.s,{key:'test-key-0000000002',date:'2026-09-22',method:'QRIS',qrisConfirmed:true,discount:1,discountReason:'Promo',items:[{productId:f.a.id,qty:2},{productId:f.b.id,qty:1}]},'kasir');assert.equal(b.items.reduce((s,i)=>s+i.amount,0),b.amount);
 assert.throws(()=>pos.createSale(f.s,{key:'test-key-0000000003',date:'2026-09-22',method:'Cash',cash:0,items:[{productId:f.a.id,qty:1}]},'kasir'),/kurang/);
 let r=pos.report(f.s,'2026-09');assert.equal(r.details.find(x=>x.date==='2026-09-21'&&x.name==='Es Teh').qty,3);assert.equal(r.products.find(x=>x.name==='Es Teh').days,2);assert.equal(r.dates.length,30);assert.equal(r.final,false);
 const sheets=pos.sheets(r),bytes=xlsxSheets(sheets);assert.equal(readXlsx(bytes)[0][0],'Laporan Teko Marala');assert(bytes.includes(Buffer.from('Matriks Disetujui')));assert(bytes.includes(Buffer.from('sheet9.xml')));
 }finally{f.s.db.close();}});
test('daily approval single total, locking, revision, split HPP and no double counting',()=>{const f=fixture();try{
 const t=ticket(f);const d=pos.changeDay(f.s,{date:t.date,countedCash:29000,reason:'Selisih hitung kas'},'submit',admin);assert.equal(d.difference,-1000);
 assert.throws(()=>ticket(f,'test-key-0000000004'),/diajukan/);
 assert.throws(()=>pos.changeDay(f.s,{date:t.date},'approve',{id:'x',role:'ADMIN'}),/Super Admin/);
 pos.changeDay(f.s,{date:t.date},'approve',admin);assert.equal(f.s.list('sales').length,1);let dashboard=f.s.dashboard({});assert.equal(dashboard.revenue,30000);assert.equal(dashboard.tekoCost,13000);assert.equal(dashboard.otherCost,0);
 assert.throws(()=>pos.changeDay(f.s,{date:t.date},'approve',admin));assert.equal(f.s.dashboard({}).revenue,30000);
 const sale=f.s.list('sales')[0];assert.throws(()=>f.s.remove('sales',sale.id),/revisi/);assert.throws(()=>f.s.save('sales',sale,sale.id),/revisi/);
 pos.changeDay(f.s,{date:t.date,reason:'Koreksi transaksi'},'reopen',admin);assert.equal(f.s.dashboard({}).revenue,0);assert.equal(f.s.list('poshistory').length,1);
 pos.voidSale(f.s,t.id,'Pesanan dibatalkan','kasir');ticket(f,'test-key-0000000005');
 pos.changeDay(f.s,{date:t.date,countedCash:30000},'submit',admin);pos.changeDay(f.s,{date:t.date},'approve',admin);assert.equal(f.s.list('sales').length,1);assert.equal(f.s.dashboard({}).revenue,30000);assert.equal(pos.report(f.s,'2026-09').approvedAmount,30000);
 }finally{f.s.db.close();}});
const {createApp}=require('../server/server.cjs');
test('POS API approval permissions, export workbook and protected approved sale',async()=>{
 mock.timers.setTime(Date.parse('2026-09-22T12:00:00Z'));const {server,store}=createApp({dbFile:':memory:'});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;let cookie='';
 const call=async(path,method='GET',body)=>{const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',Cookie:cookie},body:body?JSON.stringify(body):undefined});return {status:r.status,cookie:r.headers.get('set-cookie'),data:r.headers.get('content-type')?.includes('json')?await r.json():Buffer.from(await r.arrayBuffer())};};
 try{await call('/api/setup','POST',{name:'Admin',username:'admin',password:'Password12345'});cookie=(await call('/api/login','POST',{username:'admin',password:'Password12345'})).cookie.split(';')[0];const adminCookie=cookie;
 const p=await call('/api/pos/products','POST',{name:'Teh',category:'Minuman',price:5000,cost:2000});assert.equal(p.status,201);
 const t=await call('/api/pos/tickets','POST',{key:'api-ticket-00000001',date:'2026-09-22',method:'QRIS',qrisConfirmed:true,items:[{productId:p.data.id,qty:3}]});assert.equal(t.status,201);assert.equal(store.dashboard({}).revenue,0);
 assert.equal((await call('/api/pos/day/submit','POST',{date:'2026-09-22',countedCash:0})).status,200);
 await call('/api/users','POST',{name:'Operator',username:'operator',password:'Password12345',role:'ADMIN',permissions:{pos:['view','create'],posapproval:['view','approve']}});cookie=(await call('/api/login','POST',{username:'operator',password:'Password12345'})).cookie.split(';')[0];
 assert.equal((await call('/api/pos/day/approve','POST',{date:'2026-09-22'})).status,403);assert.equal((await call('/api/pos/products','POST',{name:'Bad'})).status,403);assert.equal((await call('/api/pos/export?month=2026-09')).status,403);
 cookie=adminCookie;assert.equal((await call('/api/pos/day/approve','POST',{date:'2026-09-22'})).status,200);assert.equal(store.dashboard({}).revenue,15000);
 const x=await call('/api/pos/export?month=2026-09');assert.equal(x.status,200);assert.equal(readXlsx(x.data)[3][1],'15000');
 const sale=store.list('sales')[0];assert.equal((await call('/api/records/sales/'+sale.id,'DELETE',{})).status,409);
 assert.equal((await call('/api/pos/day/approve','POST',{date:'2026-09-22'})).status,409);
 }finally{await new Promise(r=>server.close(r));store.db.close();}
});

test('kasir UI menampilkan pilihan dan menyelesaikan simpan tanpa error reset',async()=>{
 const vm=require('node:vm'),fs=require('node:fs');
 const controls=[{dataset:{posPlus:'a'}},{dataset:{posMinus:'a'}}];const checks=[{checked:true},{checked:true}],quantities=[{value:'3'},{value:'1'}];
 const fields={date:{value:'2026-09-23'},discount:{value:'0'},cash:{value:'50000'},method:{value:'Cash'},qrisConfirmed:{closest:()=>({hidden:false})}};
 const form={elements:fields,reset(){fields.discount.value='0';fields.cash.value='0';}};
 const nodes={'#content':{},'#posPay':form,'#posSelection':{},'#posTotals':{},'#posError':{},'.pos-products':{classList:{toggle(){}}},'#posViewGrid':{setAttribute(){}},'#posViewRows':{setAttribute(){}},'[name=posCategory]':{value:''},'#posSearch':{value:''},'#posCatalogCount':{},'#posCatalogPage':{},'#posPrev':{},'#posNext':{},'#posDates':{},'#posCartCount':{},'#posMobileCount':{},'#posMobileTotal':{},'#posOpenPayment':{}};
 const products=[{id:'a',name:'Es Teh',category:'Teh',price:5000,active:true},{id:'b',name:'Green Tea',category:'Teh',price:15000,active:true}];
 let writes=0,receipt=null;const context=vm.createContext({
  $:selector=>{const m=selector.match(/^\[data-pos-(check|qty)="([ab])"\]$/);if(m)return (m[1]==='check'?checks:quantities)[m[2]==='a'?0:1];return nodes[selector];},
  $$:selector=>selector==='[data-pos-check]'?checks:selector==='[data-pos-plus],[data-pos-minus]'?controls:[],
  api:async(url,opts)=>{if(opts?.method==='POST'){writes++;return {id:'saved',number:'POS-test'};}return url.includes('products')?products:[];},
  crypto:{randomUUID:()=> 'test-key-0000000001'},header:()=>'',field:()=>'',can:()=>true,today:()=> '2026-09-23',esc:String,money:n=>'Rp '+n,formData:()=>({discount:0,cash:50000,method:'Cash'}),toast:()=>{},safe:fn=>fn,identity:{},recordReceipt:t=>receipt=t,console
 });
 vm.runInContext(fs.readFileSync(require.resolve('../pos-ui.js'),'utf8')+'\nshowPosReceipt=t=>recordReceipt(t);',context);
 await vm.runInContext('posCashier()',context);
 assert.match(nodes['#posSelection'].innerHTML,/Es Teh/);assert.match(nodes['#posSelection'].innerHTML,/Green Tea/);assert.match(nodes['#posSelection'].innerHTML,/30000/);
 nodes['#posViewRows'].onclick();assert.equal(quantities[0].value,'3');assert(checks.every(c=>c.checked));nodes['#posViewGrid'].onclick();controls[0].onclick();assert.equal(quantities[0].value,4);assert.equal(nodes['#posMobileTotal'].textContent,'Rp 35000');controls[1].onclick();assert.equal(quantities[0].value,3);assert.equal(nodes['#posMobileTotal'].textContent,'Rp 30000');const button={disabled:false};await form.onsubmit({preventDefault(){},submitter:button});
 assert.equal(writes,1);assert.equal(receipt.id,'saved');assert(checks.every(c=>!c.checked));assert.equal(nodes['#posError'].textContent,undefined);assert.match(nodes['#posSelection'].innerHTML,/Belum ada produk/);assert.equal(button.disabled,false);
});

test('tanggal kasir dikunci server, laporan lintas bulan dan peringkat nol penjualan',()=>{
 const f=fixture();try{
 mock.timers.setTime(Date.parse('2026-09-23T12:00:00Z'));
 for(const dt of ['2026-09-22','2026-09-24'])assert.throws(()=>pos.createSale(f.s,{key:'locked-date-0000001',date:dt,method:'Cash',cash:5000,items:[{productId:f.a.id,qty:1}]},'kasir'),/harus hari ini/);
 ticket(f,'range-ticket-0000001','2026-08-31');ticket(f,'range-ticket-0000002','2026-09-01');
 pos.saveProduct(f.s,{name:'Belum Laku',category:'Teh',price:10000,cost:2000},undefined,'admin');
 const r=pos.report(f.s,'2026-09',{from:'2026-08-31',to:'2026-09-01'});assert.equal(r.count,2);assert.equal(r.amount,60000);assert.equal(r.daily.length,2);assert.equal(r.top[0].name,'Es Teh');assert.equal(r.least[0].name,'Belum Laku');assert.equal(r.least[0].qty,0);
 const single=pos.report(f.s,'2026-09',{from:'2026-09-01',to:'2026-09-01'});assert.equal(single.amount,30000);assert.equal(single.details.length,2);
 assert.throws(()=>pos.report(f.s,'2026-09',{from:'2026-09-02',to:'2026-09-01'}));
 }finally{f.s.db.close();}
});

test('arsip produk menjaga snapshot, laporan dan pembatalan transaksi lama',()=>{const f=fixture();try{const t=ticket(f);f.s.remove('posproducts',f.a.id,'admin');assert.equal(f.s.list('posproducts').length,1);assert.equal(f.s.get(t.id).items[0].name,'Es Teh');assert.equal(pos.report(f.s,'2026-09').amount,30000);assert.throws(()=>ticket(f,'test-key-deleted-product'),/tidak ditemukan/);pos.voidSale(f.s,t.id,'Pesanan dibatalkan','admin');assert.equal(f.s.get(t.id).status,'Batal');assert.equal(pos.report(f.s,'2026-09').amount,0);}finally{f.s.db.close();}});
