const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Store,today}=require('../business/server/store.cjs');
const pos=require('../business/server/pos.cjs');
const m=require('../business/server/modules.cjs');

function setup(){const store=new Store(':memory:');store.setSetting('posImmediatePayments',{enabled:true});const user=store.saveUser({name:'Pemilik',username:'pemilik',password:'Marala-test-2026',role:'SUPER ADMIN'},undefined,'setup');const unit=store.save('units',{name:'Usaha'},undefined,user.id);store.setSetting('posUnit',{id:unit.id});return {store,user,unit};}

test('pesanan online masuk antrian kasir lalu lunas mencatat omzet',()=>{
 const {store,user}=setup();const product=pos.saveProduct(store,{name:'Kopi',category:'Minuman',price:15000,cost:5000,active:true},undefined,user.id);
 assert.throws(()=>m.createOrder(store,'kafe',{items:[{productId:product.id,qty:1}],customerName:'A',phone:'081234567890'}),/tutup/);
 m.settings(store,'shop',{open:true,pickup:true});
 const order=m.publicAction(store,{type:'kafe',line:'kafe',channel:'keduanya'},'order',{items:[{productId:product.id,qty:2}],customerName:'Budi',phone:'081234567890',method:'ambil'});
 assert.equal(order.total,30000);assert.equal(order.status,'Baru');
 const id=m.list(store,'orders')[0].id;
 m.orderAction(store,id,'accept',{},user.id);assert.equal(store.list('posorders').length,1);assert.equal(store.list('postickets').length,0);
 m.orderAction(store,id,'done',{method:'Cash'},user.id);
 assert.equal(store.list('postickets').length,1);assert.equal(store.list('postickets')[0].amount,30000);
 assert.equal(m.publicAction(store,{type:'kafe',line:'kafe',channel:'keduanya'},'orderStatus',{token:order.token}).status,'Selesai');
 assert.throws(()=>m.orderAction(store,id,'accept',{},user.id),/selesai/);
});

test('pesanan online mesin jasa menjadi invoice dan pembayaran',()=>{
 const {store,user,unit}=setup();const product=store.save('products',{unitId:unit.id,code:'J1',name:'Cuci AC',type:'Jasa',unit:'unit',price:85000,cost:20000},undefined,user.id);
 m.settings(store,'shop',{open:true});const o=m.createOrder(store,'jasa',{items:[{productId:product.id,qty:1}],customerName:'Sari',phone:'081299990000'});
 m.orderAction(store,o.id,'accept',{},user.id);assert.equal(store.list('invoices').length,1);
 m.orderAction(store,o.id,'done',{method:'QRIS'},user.id);assert.equal(store.list('payments')[0].amount,85000);
});

test('tagihan berulang dibuat sekali per bulan',()=>{
 const {store,user,unit}=setup();const product=store.save('products',{unitId:unit.id,code:'K1',name:'Kamar A1',type:'Jasa',unit:'bulan',price:800000,cost:0},undefined,user.id);const customer=store.save('customers',{name:'Penghuni',phone:'081211112222'},undefined,user.id);
 m.save(store,'recurring',{customerId:customer.id,productId:product.id,day:1,start:'2026-01-01'});
 const first=m.generateRecurring(store,user.id);assert.equal(first.created.length,1);assert.equal(m.generateRecurring(store,user.id).created.length,0);
 assert.equal(store.list('invoices')[0].total,800000);
});

test('booking menolak jadwal bentrok di tempat yang sama',()=>{
 const {store}=setup();m.save(store,'bookings',{resource:'Lapangan 1',date:'2026-12-01',start:'10:00',end:'11:00',customerName:'A'});
 assert.throws(()=>m.save(store,'bookings',{resource:'Lapangan 1',date:'2026-12-01',start:'10:30',end:'11:30',customerName:'B'}),/bentrok/);
 m.save(store,'bookings',{resource:'Lapangan 2',date:'2026-12-01',start:'10:30',end:'11:30',customerName:'B'});
 m.save(store,'bookings',{resource:'Lapangan 1',date:'2026-12-01',start:'11:00',end:'12:00',customerName:'C'});
});

test('event: kuota, tiket, pembayaran, dan check-in',()=>{
 const {store}=setup();const e=m.save(store,'events',{name:'Fun Run',date:'2026-12-10',categories:[{name:'5K',price:150000,quota:1},{name:'Gratis',price:0,quota:0}],questions:[{label:'Ukuran jersey',required:true}]});
 const q=e.questions[0].id;
 assert.throws(()=>m.publicAction(store,{type:'jasa'},'register',{eventId:e.id,categoryId:e.categories[0].id,name:'A',phone:'081200000001'}),/Ukuran jersey/);
 const t=m.publicAction(store,{type:'jasa'},'register',{eventId:e.id,categoryId:e.categories[0].id,name:'A',phone:'081200000001',answers:{[q]:'M'}});
 assert.equal(t.status,'Menunggu pembayaran');assert.match(t.code,/^[A-Z2-9]{8}$/);
 assert.throws(()=>m.publicAction(store,{type:'jasa'},'register',{eventId:e.id,categoryId:e.categories[0].id,name:'B',phone:'081200000002',answers:{[q]:'L'}}),/penuh/);
 assert.throws(()=>m.checkin(store,t.code),/belum lunas/);
 const reg=m.list(store,'registrations')[0];m.registrationAction(store,reg.id,'pay');
 assert.ok(m.checkin(store,t.code.toLowerCase()).checkedInAt);assert.equal(m.checkin(store,t.code).already,true);
 assert.equal(m.publicAction(store,{type:'jasa'},'register',{eventId:e.id,categoryId:e.categories[1].id,name:'C',phone:'081200000003',answers:{[q]:'S'}}).status,'Lunas');
});

test('anggota: saldo dan pinjaman tidak boleh minus',()=>{
 const {store}=setup();const member=m.save(store,'members',{name:'Ani'});
 m.save(store,'ledger',{memberId:member.id,type:'setoran',amount:100000});
 assert.throws(()=>m.save(store,'ledger',{memberId:member.id,type:'penarikan',amount:150000}),/Saldo tidak cukup/);
 m.save(store,'ledger',{memberId:member.id,type:'pinjaman',amount:500000});m.save(store,'ledger',{memberId:member.id,type:'angsuran',amount:100000});
 assert.deepEqual(m.balance(store,member.id),{saldo:100000,pinjaman:400000});
 assert.throws(()=>m.save(store,'ledger',{memberId:member.id,type:'angsuran',amount:500000}),/melebihi/);
});

test('produksi memotong stok bahan dan menghitung HPP per unit',()=>{
 const {store,user}=setup();const item=store.save('stockitems',{name:'Tepung',category:'Bahan',unit:'kg',price:12000,minTeko:0,maxTeko:100,minWarehouse:0,maxWarehouse:100},undefined,user.id);
 const stock=store.list('stocks').find(s=>s.stockItemId===item.id&&/teko|outlet/i.test(s.location))||store.list('stocks').find(s=>s.stockItemId===item.id);
 store.save('movements',{stockId:stock.id,date:today(),direction:'Masuk',quantity:10},undefined,user.id);
 const b=m.save(store,'batches',{product:'Roti',qty:20,cost:10000,expiry:'2026-12-31',materials:[{stockItemId:item.id,qty:2}]},undefined,user.id);
 assert.equal(b.materialCost,24000);assert.equal(b.unitCost,1700);
 assert.ok(store.list('movements').some(x=>x.direction==='Keluar'&&x.quantity===2));
});

test('siklus, data per ekor, komisi, dan laporan publik',()=>{
 const {store,user}=setup();const c=m.save(store,'cycles',{name:'Kolam A',start:'2026-11-01',initial:1000,unit:'ekor'});
 m.addLog(store,'cycles',c.id,{type:'pakan',qty:120,amount:1200000});m.addLog(store,'cycles',c.id,{type:'panen',qty:100,amount:2500000});m.addLog(store,'cycles',c.id,{type:'kematian',qty:50});
 const s=m.cycleSummary(m.get(store,'cycles',c.id));assert.equal(s.fcr,1.2);assert.equal(s.profit,1300000);assert.equal(s.alive,950);
 const a=m.save(store,'animals',{tag:'K-01',species:'Kambing'});assert.throws(()=>m.save(store,'animals',{tag:'k-01'}),/sudah dipakai/);
 m.addLog(store,'animals',a.id,{type:'timbang',qty:30});assert.equal(m.get(store,'animals',a.id).logs.length,1);
 m.save(store,'staff',{name:'Rina',rate:40});m.save(store,'bookings',{date:'2026-12-02',start:'09:00',end:'10:00',customerName:'X',price:50000,staff:'Rina',status:'Selesai'});
 assert.equal(m.commissionReport(store).totals[0].commission,20000);
 const product=pos.saveProduct(store,{name:'Infak',category:'Infak',price:1000,cost:0,active:true},undefined,user.id);
 pos.createSale(store,{key:'test-public-report-0001',date:today(),method:'Cash',cash:5000,items:[{productId:product.id,qty:5}]},user.id);
 assert.throws(()=>m.publicAction(store,{type:'toko',line:'masjid',channel:'kasir'},'report'),/belum dibuka/);
 m.settings(store,'publicReport',{enabled:true});const r=m.publicAction(store,{type:'toko',line:'masjid',channel:'kasir'},'report');
 assert.equal(r.totalIncome.at(-1),5000);assert.equal(r.months.length,6);
});

test('akses publik mengikuti fitur aktif lini',()=>{
 const {store,user}=setup();const product=pos.saveProduct(store,{name:'Beras',category:'Sembako',price:70000,cost:60000,active:true},undefined,user.id);m.settings(store,'shop',{open:true});
 const warung={type:'toko',line:'warung',channel:'kasir'};
 assert.throws(()=>m.publicAction(store,warung,'order',{items:[{productId:product.id,qty:1}],customerName:'A',phone:'081234567890'}),/belum menerima pesanan online/);
 assert.throws(()=>m.publicAction(store,warung,'booking',{date:'2026-12-01',start:'10:00',end:'11:00',customerName:'A'}),/Booking online belum dibuka/);
 m.settings(store,'features',{on:['pesanan','booking'],off:[]});
 assert.equal(m.publicAction(store,warung,'order',{items:[{productId:product.id,qty:1}],customerName:'A',phone:'081234567890'}).status,'Baru');
 assert.equal(m.publicAction(store,warung,'booking',{date:'2026-12-01',start:'10:00',end:'11:00',customerName:'A'}).status,'Diminta');
 const cat=m.publicAction(store,warung,'catalog');assert.ok(cat.features.includes('pesanan'));assert.equal(cat.items[0].name,'Beras');
});
