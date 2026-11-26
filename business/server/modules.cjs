// Modul tambahan MaralaKu: etalase & pesanan online, tagihan berulang, booking, event & tiket, data per ekor,
// siklus produksi, anggota & saldo, komisi, produksi & batch, barcode, serta laporan publik.
// Semua data disimpan di tabel mod_records milik database usaha, sehingga berjalan sama di server lokal dan cloud.
const crypto=require('node:crypto');
const {fail,today}=require('./domain.cjs');
const pos=require('./pos.cjs');

const ROUTE_GROUP={onlineorders:'pos',shopsettings:'settings',recurring:'invoices',bookings:'sales',events:'sales',registrations:'sales',checkin:'sales',publicreport:'reports',animals:'stock',cycles:'stock',members:'customers',ledger:'customers',commissions:'reports',batches:'stock',barcodes:'posmaster',variants:'posmaster',features:'settings'};
const KIND_GROUP={orders:'pos',recurring:'invoices',bookings:'sales',events:'sales',registrations:'sales',animals:'stock',cycles:'stock',members:'customers',ledger:'customers',staff:'reports',commissions:'reports',batches:'stock',barcodes:'posmaster'};
const ORDER_STATUS=['Baru','Diterima','Siap','Selesai','Ditolak'];
const BOOKING_STATUS=['Diminta','Dipesan','Datang','Selesai','Batal'];
const REG_STATUS=['Menunggu pembayaran','Lunas','Batal'];
const ANIMAL_STATUS=['Ada','Terjual','Mati'];
const ANIMAL_LOG=['timbang','kesehatan','vaksin','kawin','lahir','catatan'];
const CYCLE_LOG=['biaya','pakan','produksi','panen','kematian','catatan'];
const LEDGER_TYPES=['setoran','penarikan','pinjaman','angsuran'];

const text=(v,max=200)=>String(v??'').trim().slice(0,max);
const amount=(v,label='Nominal')=>{const n=Number(v||0);if(!Number.isFinite(n)||n<0||n>1e12)fail(label+' tidak valid.');return Math.round(n);};
const qty=(v,label='Jumlah')=>{const n=Number(v||0);if(!Number.isFinite(n)||n<0||n>1e9)fail(label+' tidak valid.');return Math.round(n*1000)/1000;};
const day=(v,label='Tanggal',required=true)=>{const s=text(v,10);if(!s&&!required)return '';if(!/^\d{4}-\d{2}-\d{2}$/.test(s))fail(label+' tidak valid.');return s;};
const time=(v,label)=>{const s=text(v,5);if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(s))fail(label+' tidak valid.');return s;};
const pick=(v,list,label)=>{if(!list.includes(v))fail(label+' tidak valid.');return v;};
const phone=v=>text(v,25).replace(/[^\d+]/g,'');
const token=(n=12)=>crypto.randomBytes(n).toString('hex');
const code=()=>Array.from(crypto.randomBytes(8),b=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b%32]).join('');

function ensure(store){
 if(store._modulesReady)return;
 store.db.exec(`CREATE TABLE IF NOT EXISTS mod_records(id TEXT PRIMARY KEY,kind TEXT NOT NULL,data TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,deleted INTEGER NOT NULL DEFAULT 0);
 CREATE INDEX IF NOT EXISTS mod_records_kind ON mod_records(kind,deleted);`);
 store._modulesReady=true;
}
function list(store,kind){ensure(store);return store.db.prepare('SELECT id,data,created_at FROM mod_records WHERE kind=? AND deleted=0 ORDER BY created_at DESC,rowid DESC').all(kind).map(r=>({...JSON.parse(r.data),id:r.id,createdAt:r.created_at}));}
function get(store,kind,id){ensure(store);const r=store.db.prepare('SELECT id,data,created_at FROM mod_records WHERE kind=? AND id=? AND deleted=0').get(kind,id);if(!r)fail('Data tidak ditemukan.',404);return {...JSON.parse(r.data),id:r.id,createdAt:r.created_at};}
function write(store,kind,data,id){ensure(store);const now=new Date().toISOString();const {id:_,createdAt:__,...clean}=data;
 if(id)store.db.prepare('UPDATE mod_records SET data=?,updated_at=? WHERE id=? AND kind=?').run(JSON.stringify(clean),now,id,kind);
 else{id=crypto.randomUUID();store.db.prepare('INSERT INTO mod_records(id,kind,data,created_at,updated_at) VALUES(?,?,?,?,?)').run(id,kind,JSON.stringify(clean),now,now);}
 return get(store,kind,id);}
function remove(store,kind,id){get(store,kind,id);store.db.prepare('UPDATE mod_records SET deleted=1,updated_at=? WHERE id=? AND kind=?').run(new Date().toISOString(),id,kind);return {ok:true};}

// Validasi per jenis data. old = data lama saat mengubah.
const VALIDATE={
 recurring(store,d){const customer=store.get(d.customerId,'customers'),product=store.get(d.productId,'products');return {customerId:customer.id,customerName:customer.name,productId:product.id,productName:product.name,amount:amount(d.amount??product.price),day:Math.min(28,Math.max(1,Number(d.day)||1)),start:day(d.start||today(),'Tanggal mulai'),end:day(d.end,'Tanggal selesai',false),active:d.active!==false,notes:text(d.notes,300)};},
 bookings(store,d,old){const out={resource:text(d.resource,80)||'Utama',date:day(d.date),start:time(d.start,'Jam mulai'),end:time(d.end,'Jam selesai'),customerName:text(d.customerName,100),phone:phone(d.phone),service:text(d.service,100),price:amount(d.price,'Harga'),deposit:amount(d.deposit,'DP'),staff:text(d.staff,80),status:pick(d.status||old?.status||'Dipesan',BOOKING_STATUS,'Status'),notes:text(d.notes,300)};
  if(!out.customerName)fail('Nama pemesan wajib diisi.');if(out.end<=out.start)fail('Jam selesai harus setelah jam mulai.');
  if(out.status!=='Batal'){const clash=list(store,'bookings').find(b=>b.id!==old?.id&&b.status!=='Batal'&&b.resource.toLowerCase()===out.resource.toLowerCase()&&b.date===out.date&&b.start<out.end&&out.start<b.end);if(clash)fail(`Jadwal bentrok dengan ${clash.customerName} (${clash.start}–${clash.end}) di ${clash.resource}.`,409);}
  return out;},
 events(store,d){const categories=(Array.isArray(d.categories)?d.categories:[]).slice(0,20).map(c=>({id:text(c.id,40)||token(4),name:text(c.name,80),price:amount(c.price,'Harga tiket'),quota:Math.max(0,Math.round(Number(c.quota)||0))})).filter(c=>c.name);
  if(!categories.length)fail('Tambahkan minimal satu kategori tiket.');
  const questions=(Array.isArray(d.questions)?d.questions:[]).slice(0,10).map(q=>({id:text(q.id,40)||token(4),label:text(q.label,120),required:!!q.required})).filter(q=>q.label);
  const out={name:text(d.name,120),date:day(d.date),endDate:day(d.endDate,'Tanggal selesai',false),location:text(d.location,200),description:text(d.description,1000),open:d.open!==false,certificate:!!d.certificate,categories,questions};
  if(!out.name)fail('Nama event wajib diisi.');return out;},
 registrations(store,d,old){const event=get(store,'events',d.eventId),category=event.categories.find(c=>c.id===d.categoryId);if(!category)fail('Kategori tiket tidak ditemukan.');
  const out={eventId:event.id,eventName:event.name,categoryId:category.id,categoryName:category.name,amount:category.price,name:text(d.name,100),phone:phone(d.phone),email:text(d.email,120),answers:Object.fromEntries(event.questions.map(q=>[q.id,text(d.answers?.[q.id],300)])),status:pick(d.status||old?.status||(category.price?'Menunggu pembayaran':'Lunas'),REG_STATUS,'Status'),code:old?.code||code(),checkedInAt:old?.checkedInAt||null,paidAt:old?.paidAt||null};
  if(!out.name)fail('Nama peserta wajib diisi.');if(!out.phone)fail('Nomor WhatsApp peserta wajib diisi.');
  for(const q of event.questions)if(q.required&&!out.answers[q.id])fail('Jawab pertanyaan: '+q.label);
  if(!old||old.categoryId!==category.id){const used=list(store,'registrations').filter(r=>r.eventId===event.id&&r.categoryId===category.id&&r.status!=='Batal').length;if(category.quota&&used>=category.quota)fail('Kuota '+category.name+' sudah penuh.',409);}
  if(out.status==='Lunas'&&!out.paidAt)out.paidAt=new Date().toISOString();return out;},
 animals(store,d,old){const out={tag:text(d.tag,40),species:text(d.species,60),breed:text(d.breed,60),sex:pick(d.sex||'Betina',['Jantan','Betina'],'Jenis kelamin'),birthDate:day(d.birthDate,'Tanggal lahir',false),origin:pick(d.origin||'Beli',['Beli','Lahir di kandang'],'Asal'),buyPrice:amount(d.buyPrice,'Harga beli'),status:pick(d.status||old?.status||'Ada',ANIMAL_STATUS,'Status'),salePrice:amount(d.salePrice,'Harga jual'),saleDate:day(d.saleDate,'Tanggal jual',false),mother:text(d.mother,40),father:text(d.father,40),notes:text(d.notes,500),logs:old?.logs||[]};
  if(!out.tag)fail('Nomor/eartag wajib diisi.');if(list(store,'animals').some(a=>a.id!==old?.id&&a.tag.toLowerCase()===out.tag.toLowerCase()))fail('Nomor/eartag sudah dipakai.',409);return out;},
 cycles(store,d,old){const out={name:text(d.name,100),kind:text(d.kind,60)||'Produksi',start:day(d.start),end:day(d.end,'Tanggal selesai',false),initial:qty(d.initial,'Jumlah awal'),unit:text(d.unit,20)||'ekor',status:pick(d.status||old?.status||'Berjalan',['Berjalan','Selesai'],'Status'),notes:text(d.notes,500),logs:old?.logs||[]};if(!out.name)fail('Nama siklus wajib diisi.');return out;},
 members(store,d,old){const out={number:text(d.number,30)||old?.number||String(list(store,'members').length+1).padStart(4,'0'),name:text(d.name,100),phone:phone(d.phone),joinDate:day(d.joinDate||today(),'Tanggal gabung'),status:pick(d.status||old?.status||'Aktif',['Aktif','Keluar'],'Status'),notes:text(d.notes,300)};if(!out.name)fail('Nama anggota wajib diisi.');if(list(store,'members').some(m=>m.id!==old?.id&&m.number===out.number))fail('Nomor anggota sudah dipakai.',409);return out;},
 ledger(store,d){const member=get(store,'members',d.memberId);const out={memberId:member.id,memberName:member.name,date:day(d.date||today()),type:pick(d.type,LEDGER_TYPES,'Jenis transaksi'),amount:amount(d.amount),notes:text(d.notes,300)};if(!out.amount)fail('Nominal wajib lebih dari 0.');
  const b=balance(store,member.id);if(out.type==='penarikan'&&out.amount>b.saldo)fail('Saldo tidak cukup untuk penarikan.',409);if(out.type==='angsuran'&&out.amount>b.pinjaman)fail('Angsuran melebihi sisa pinjaman.',409);return out;},
 staff(store,d){const out={name:text(d.name,80),rate:Math.min(100,Math.max(0,Number(d.rate)||0)),phone:phone(d.phone),active:d.active!==false};if(!out.name)fail('Nama karyawan wajib diisi.');return out;},
 commissions(store,d){const out={staff:text(d.staff,80),date:day(d.date||today()),description:text(d.description,200),amount:amount(d.amount,'Nilai pekerjaan'),rate:Math.min(100,Math.max(0,Number(d.rate)||0))};if(!out.staff)fail('Pilih karyawan.');return out;},
 batches(store,d,old){const out={product:text(d.product,100),date:day(d.date||today()),qty:qty(d.qty,'Jumlah produksi'),unit:text(d.unit,20)||'pcs',expiry:day(d.expiry,'Tanggal kedaluwarsa',false),batch:text(d.batch,40)||old?.batch||('B'+today().replace(/-/g,'')+'-'+String(list(store,'batches').length+1).padStart(2,'0')),cost:amount(d.cost,'Biaya lain'),remaining:qty(d.remaining??d.qty,'Sisa'),materials:old?.materials||[],notes:text(d.notes,300)};if(!out.product)fail('Nama produk wajib diisi.');if(!out.qty)fail('Jumlah produksi wajib lebih dari 0.');return out;},
 barcodes(store,d){const product=store.get(d.productId,'posproducts');const c=text(d.code,64).replace(/\s/g,'');if(!/^[\w.-]{3,64}$/.test(c))fail('Kode barcode tidak valid.');if(list(store,'barcodes').some(b=>b.code===c&&b.productId!==product.id))fail('Barcode sudah dipakai produk lain.',409);return {productId:product.id,productName:product.name,code:c};}
};

function balance(store,memberId){const rows=list(store,'ledger').filter(r=>r.memberId===memberId);const sum=t=>rows.filter(r=>r.type===t).reduce((n,r)=>n+r.amount,0);return {saldo:sum('setoran')-sum('penarikan'),pinjaman:sum('pinjaman')-sum('angsuran')};}

function save(store,kind,d,id,actor){if(!VALIDATE[kind])fail('Jenis data tidak dikenal.',404);return store.tx(()=>{const old=id?get(store,kind,id):null;const data=VALIDATE[kind](store,d||{},old);
 if(kind==='batches'&&!old){data.materials=consume(store,d.materials,data,actor);data.materialCost=data.materials.reduce((n,m)=>n+m.cost,0);data.unitCost=Math.round((data.materialCost+data.cost)/data.qty);}
 if(kind==='barcodes'){const same=list(store,'barcodes').find(b=>b.productId===data.productId);if(same&&!old)return write(store,kind,data,same.id);}
 return write(store,kind,{...(old||{}),...data},id);});}

// Produksi mengurangi bahan dari stok outlet melalui mutasi stok biasa, sehingga tercatat di riwayat stok.
function consume(store,materials,batch,actor){return (Array.isArray(materials)?materials:[]).slice(0,30).filter(m=>m&&m.stockItemId&&Number(m.qty)>0).map(m=>{const item=store.get(m.stockItemId,'stockitems'),stocks=store.list('stocks').filter(s=>s.stockItemId===item.id),stock=stocks.find(s=>/teko|outlet/i.test(s.location))||stocks[0];if(!stock)fail('Stok untuk '+item.name+' tidak ditemukan.');const used=qty(m.qty,'Pemakaian '+item.name);store.save('movements',{stockId:stock.id,date:batch.date,direction:'Keluar',quantity:used,notes:'Produksi '+batch.product+' ('+batch.batch+')'},undefined,actor);return {stockItemId:item.id,name:item.name,unit:item.unit,qty:used,cost:Math.round(used*(item.price||0))};});}

function addLog(store,kind,id,d){const allowed=kind==='animals'?ANIMAL_LOG:CYCLE_LOG;return store.tx(()=>{const old=get(store,kind,id);const log={id:token(4),date:day(d.date||today()),type:pick(d.type,allowed,'Jenis catatan'),qty:qty(d.qty),unit:text(d.unit,20),amount:amount(d.amount),notes:text(d.notes,300)};return write(store,kind,{...old,logs:[...(old.logs||[]),log].sort((a,b)=>a.date.localeCompare(b.date))},id);});}
function removeLog(store,kind,id,logId){return store.tx(()=>{const old=get(store,kind,id);return write(store,kind,{...old,logs:(old.logs||[]).filter(l=>l.id!==logId)},id);});}

// Ringkasan siklus: biaya, panen, produksi harian, dan FCR (pakan dibagi hasil panen) bila satuannya kg.
function cycleSummary(c){const logs=c.logs||[],sum=(t,k)=>logs.filter(l=>l.type===t).reduce((n,l)=>n+(l[k]||0),0);const feed=sum('pakan','qty'),harvest=sum('panen','qty'),income=sum('panen','amount'),cost=sum('biaya','amount')+sum('pakan','amount'),deaths=sum('kematian','qty');return {feed,harvest,income,cost,profit:income-cost,deaths,production:sum('produksi','qty'),alive:Math.max(0,c.initial-deaths),fcr:harvest&&feed?Math.round(feed/harvest*100)/100:null};}

function settings(store,key,value){const defaults={shop:{open:false,about:'',address:'',hours:'',pickup:true,delivery:false,deliveryNote:'',minOrder:0,payment:'',whatsapp:'',hidden:[]},features:{on:[],off:[]},publicReport:{enabled:false,showExpenses:true}};if(!defaults[key])fail('Pengaturan tidak dikenal.',404);
 if(value===undefined)return {...defaults[key],...(store.setting('mod_'+key)||{})};
 let v;if(key==='shop')v={open:!!value.open,about:text(value.about,600),address:text(value.address,200),hours:text(value.hours,120),pickup:value.pickup!==false,delivery:!!value.delivery,deliveryNote:text(value.deliveryNote,200),minOrder:amount(value.minOrder,'Minimal order'),payment:text(value.payment,500),whatsapp:phone(value.whatsapp),hidden:(Array.isArray(value.hidden)?value.hidden:[]).slice(0,500).map(x=>text(x,60))};
 if(key==='features')v={on:(value.on||[]).slice(0,30).map(x=>text(x,30)),off:(value.off||[]).slice(0,30).map(x=>text(x,30))};
 if(key==='publicReport')v={enabled:!!value.enabled,showExpenses:value.showExpenses!==false};
 store.setSetting('mod_'+key,v);return v;}

// Katalog etalase: produk kasir aktif (mesin toko/kafe) atau daftar jasa (mesin jasa).
function catalog(store,engine){const shop=settings(store,'shop'),hidden=new Set(shop.hidden);if(engine==='jasa')return store.list('products').filter(p=>!hidden.has(p.id)).map(p=>({id:p.id,name:p.name,category:p.type||'Layanan',price:p.price,unit:p.unit||''}));return store.list('posproducts').filter(p=>p.active&&!hidden.has(p.id)).map(p=>({id:p.id,name:p.name,category:p.category,price:p.price,unit:''}));}

function nextOrderNumber(store){const d=today().replace(/-/g,'').slice(2);const n=list(store,'orders').filter(o=>o.number?.startsWith('ON'+d)).length+1;return 'ON'+d+'-'+String(n).padStart(3,'0');}

function createOrder(store,engine,d){const shop=settings(store,'shop');if(!shop.open)fail('Etalase sedang tutup.',409);const products=new Map(catalog(store,engine).map(p=>[p.id,p]));
 if(!Array.isArray(d.items)||!d.items.length||d.items.length>50)fail('Pilih minimal satu item.');
 const items=d.items.map(x=>{const p=products.get(x.productId);if(!p)fail('Item tidak tersedia.');const q=Math.round(Number(x.qty));if(!Number.isSafeInteger(q)||q<1||q>10000)fail('Jumlah item tidak valid.');return {productId:p.id,name:p.name,qty:q,price:p.price,total:p.price*q};});
 const total=items.reduce((n,i)=>n+i.total,0),method=d.method==='antar'?'antar':'ambil';
 if(method==='antar'&&!shop.delivery)fail('Pengantaran belum tersedia.');if(method==='ambil'&&!shop.pickup)fail('Ambil di tempat belum tersedia.');
 if(shop.minOrder&&total<shop.minOrder)fail('Minimal pesanan Rp'+shop.minOrder.toLocaleString('id-ID')+'.');
 const out={number:nextOrderNumber(store),token:token(),engine,items,total,customerName:text(d.customerName,100),phone:phone(d.phone),address:method==='antar'?text(d.address,300):'',note:text(d.note,300),method,status:'Baru',linkedId:null,history:[{status:'Baru',at:new Date().toISOString()}]};
 if(!out.customerName)fail('Nama pemesan wajib diisi.');if(out.phone.replace(/\D/g,'').length<9)fail('Nomor WhatsApp tidak valid.');if(method==='antar'&&!out.address)fail('Alamat pengantaran wajib diisi.');
 return store.tx(()=>write(store,'orders',out));}

function findCustomer(store,name,ph){const digits=ph.replace(/\D/g,'');return store.list('customers').find(c=>String(c.phone||'').replace(/\D/g,'').endsWith(digits.slice(-9)))||store.save('customers',{name,phone:ph||'-',notes:'Dari pesanan online'},undefined,'system');}

// Alur pesanan online: Terima membuat antrian kasir (atau invoice untuk mesin jasa), Selesai melunasi dan mencatat omzet serta stok.
function orderAction(store,id,action,d,actor){return store.tx(()=>{const o=get(store,'orders',id),engine=o.engine||'toko',at=new Date().toISOString();
 if(['Selesai','Ditolak'].includes(o.status))fail('Pesanan sudah selesai atau ditolak.',409);
 if(action==='accept'){if(o.status!=='Baru')fail('Pesanan sudah diterima.',409);let linkedId;
  if(engine==='jasa'){const customer=findCustomer(store,o.customerName,o.phone),unitId=store.setting('posUnit')?.id||store.list('units')[0]?.id;const inv=store.save('invoices',{unitId,customerId:customer.id,date:today(),dueDate:today(),items:o.items.map(i=>{const p=store.get(i.productId,'products');return {productId:p.id,name:p.name,unit:p.unit,qty:i.qty,price:i.price,discount:0};}),discount:0,other:0,notes:'Pesanan online '+o.number},undefined,actor);linkedId=inv.id;}
  else{const order=pos.createSale(store,{key:'online-'+o.token.slice(0,24),date:today(),mode:'queue',items:o.items.map(i=>({productId:i.productId,qty:i.qty})),customerName:o.customerName,phone:o.phone,notes:'Pesanan online '+o.number+(o.note?' · '+o.note:'')},actor);linkedId=order.id;}
  return write(store,'orders',{...o,status:'Diterima',linkedId,history:[...o.history,{status:'Diterima',at}]},id);}
 if(action==='ready'){if(o.status!=='Diterima')fail('Terima pesanan terlebih dahulu.',409);return write(store,'orders',{...o,status:'Siap',history:[...o.history,{status:'Siap',at}]},id);}
 if(action==='done'){if(!['Diterima','Siap'].includes(o.status))fail('Terima pesanan terlebih dahulu.',409);const method=d.method==='QRIS'?'QRIS':'Cash';
  if(engine==='jasa'){const inv=store.get(o.linkedId,'invoices');const due=inv.total-store.paid(inv.id);if(due>0)store.save('payments',{invoiceId:inv.id,date:today(),amount:due,method:method==='QRIS'?'Transfer':'Cash'},undefined,actor);}
  else pos.changeOrder(store,o.linkedId,{method,cash:o.total,qrisConfirmed:true,expectedAmount:o.total},'pay',actor);
  return write(store,'orders',{...o,status:'Selesai',paidWith:method,history:[...o.history,{status:'Selesai',at}]},id);}
 if(action==='reject'){if(o.linkedId&&engine!=='jasa')pos.changeOrder(store,o.linkedId,{reason:text(d.reason,200)||'Pesanan online ditolak'},'cancel',actor);return write(store,'orders',{...o,status:'Ditolak',reason:text(d.reason,200),history:[...o.history,{status:'Ditolak',at}]},id);}
 fail('Tindakan tidak dikenal.',404);});}

function period(date){return date.slice(0,7);}
// Membuat invoice untuk setiap tagihan berulang yang jatuh tempo bulan ini dan belum dibuat. Aman dipanggil berkali-kali.
function generateRecurring(store,actor,on=today()){return store.tx(()=>{const p=period(on),dayOfMonth=Number(on.slice(8,10)),created=[];const unitId=store.setting('posUnit')?.id||store.list('units')[0]?.id;
 for(const r of list(store,'recurring')){if(!r.active||r.start>on||(r.end&&r.end<on)||r.lastPeriod===p||dayOfMonth<r.day)continue;const product=store.get(r.productId,'products');const due=p+'-'+String(r.day).padStart(2,'0');
  const inv=store.save('invoices',{unitId,customerId:r.customerId,date:due,dueDate:due,items:[{productId:product.id,name:product.name,unit:product.unit,qty:1,price:r.amount,discount:0}],discount:0,other:0,notes:'Tagihan berulang '+p},undefined,actor);
  write(store,'recurring',{...r,lastPeriod:p,lastInvoiceId:inv.id},r.id);created.push({id:inv.id,number:inv.number,customerName:r.customerName,amount:r.amount});}
 return {period:p,created};});}

function registrationAction(store,id,action){return store.tx(()=>{const r=get(store,'registrations',id),at=new Date().toISOString();
 if(action==='pay'){if(r.status==='Batal')fail('Pendaftaran sudah dibatalkan.',409);return write(store,'registrations',{...r,status:'Lunas',paidAt:r.paidAt||at},id);}
 if(action==='cancel')return write(store,'registrations',{...r,status:'Batal'},id);
 if(action==='checkin')return checkin(store,r.code);
 fail('Tindakan tidak dikenal.',404);});}
function checkin(store,c){const r=list(store,'registrations').find(x=>x.code===text(c,20).toUpperCase());if(!r)fail('Kode tiket tidak ditemukan.',404);if(r.status==='Batal')fail('Tiket sudah dibatalkan.',409);if(r.status!=='Lunas')fail('Tiket belum lunas.',409);if(r.checkedInAt)return {...r,already:true};return write(store,'registrations',{...r,checkedInAt:new Date().toISOString()},r.id);}

function commissionReport(store,from,to){const staff=list(store,'staff'),inRange=d=>(!from||d>=from)&&(!to||d<=to);const rows=[];
 for(const b of list(store,'bookings'))if(b.status==='Selesai'&&b.staff&&inRange(b.date)){const s=staff.find(x=>x.name===b.staff);rows.push({date:b.date,staff:b.staff,description:(b.service||'Booking')+' · '+b.customerName,amount:b.price,rate:s?.rate||0,source:'Booking'});}
 for(const c of list(store,'commissions'))if(inRange(c.date))rows.push({...c,source:'Manual'});
 for(const r of rows)r.commission=Math.round(r.amount*r.rate/100);
 const totals=Object.values(rows.reduce((m,r)=>{m[r.staff]??={staff:r.staff,jobs:0,amount:0,commission:0};m[r.staff].jobs++;m[r.staff].amount+=r.amount;m[r.staff].commission+=r.commission;return m;},{}));
 return {rows:rows.sort((a,b)=>b.date.localeCompare(a.date)),totals};}

function members(store){return list(store,'members').map(m=>({...m,...balance(store,m.id)}));}

// Laporan publik: penerimaan per jenis dana dan pengeluaran per kategori, enam bulan terakhir.
function publicReport(store,months=6){const now=today(),keys=[];for(let i=months-1;i>=0;i--){const d=new Date(now+'T00:00:00Z');d.setUTCMonth(d.getUTCMonth()-i);keys.push(d.toISOString().slice(0,7));}
 const income={},outgoing={};
 for(const t of store.list('postickets'))if(t.status!=='Batal'&&keys.includes(period(t.date)))for(const i of t.items||[]){const k=i.category||i.name;income[k]??=Object.fromEntries(keys.map(x=>[x,0]));income[k][period(t.date)]+=i.gross||0;}
 for(const p of store.list('payments'))if(keys.includes(period(p.date))){income['Pembayaran']??=Object.fromEntries(keys.map(x=>[x,0]));income['Pembayaran'][period(p.date)]+=p.amount||0;}
 for(const e of store.list('expenses'))if(keys.includes(period(e.date))){const k=e.category||'Lainnya';outgoing[k]??=Object.fromEntries(keys.map(x=>[x,0]));outgoing[k][period(e.date)]+=e.amount||0;}
 const sum=o=>keys.map(k=>Object.values(o).reduce((n,r)=>n+r[k],0));const inT=sum(income),outT=sum(outgoing);
 return {months:keys,income,outgoing,totalIncome:inT,totalOutgoing:outT,balance:inT.map((v,i)=>v-outT[i])};}

// Aksi publik tanpa login, dipanggil oleh halaman etalase lewat server platform.
function publicAction(store,tenant,action,d={}){ensure(store);const engine=tenant.type,shop=settings(store,'shop'),lines=require('../../public/lines.js'),line=lines.resolve(tenant.line,engine),features=lines.features(line,tenant.channel,settings(store,'features'));
 if(action==='catalog'){const events=list(store,'events').filter(e=>e.open).map(e=>({id:e.id,name:e.name,date:e.date,endDate:e.endDate,location:e.location,description:e.description,questions:e.questions,categories:e.categories.map(c=>({...c,left:c.quota?Math.max(0,c.quota-list(store,'registrations').filter(r=>r.eventId===e.id&&r.categoryId===c.id&&r.status!=='Batal').length):null}))}));
  return {features,line:{label:line.label,terms:lines.terms(line)},shop:{open:shop.open,about:shop.about,address:shop.address,hours:shop.hours,pickup:shop.pickup,delivery:shop.delivery,deliveryNote:shop.deliveryNote,minOrder:shop.minOrder,payment:shop.payment,whatsapp:shop.whatsapp},items:shop.open?catalog(store,engine):[],events,report:settings(store,'publicReport').enabled,identity:store.setting('identity')?.name||tenant.name};}
 if(action==='order'){if(!features.includes('pesanan'))fail('Usaha ini belum menerima pesanan online.',409);return pickPublic(createOrder(store,engine,d));}
 if(action==='orderStatus'){const o=list(store,'orders').find(x=>x.token===text(d.token,40));if(!o)fail('Pesanan tidak ditemukan.',404);return pickPublic(o);}
 if(action==='register'){const e=get(store,'events',d.eventId);if(!e.open)fail('Pendaftaran event ini sudah ditutup.',409);const r=save(store,'registrations',{...d,status:undefined},undefined,'online');return publicTicket(r,e);}
 if(action==='ticket'){const r=list(store,'registrations').find(x=>x.code===text(d.code,20).toUpperCase());if(!r)fail('Tiket tidak ditemukan.',404);return publicTicket(r,get(store,'events',r.eventId));}
 if(action==='booking'){if(!shop.open||!features.includes('booking'))fail('Booking online belum dibuka.',409);const b=save(store,'bookings',{...d,status:'Diminta',price:0,deposit:0,staff:''},undefined,'online');return {date:b.date,start:b.start,end:b.end,resource:b.resource,status:b.status};}
 if(action==='report'){if(!settings(store,'publicReport').enabled||!features.includes('donasi'))fail('Laporan publik belum dibuka.',404);const r=publicReport(store);if(!settings(store,'publicReport').showExpenses){r.outgoing={};r.totalOutgoing=r.totalOutgoing.map(()=>0);r.balance=r.totalIncome;}return r;}
 fail('Halaman tidak ditemukan.',404);}
function pickPublic(o){return {number:o.number,token:o.token,status:o.status,items:o.items,total:o.total,method:o.method,customerName:o.customerName,history:o.history,createdAt:o.createdAt};}
function publicTicket(r,e){return {code:r.code,name:r.name,status:r.status,amount:r.amount,categoryName:r.categoryName,checkedInAt:r.checkedInAt,event:{name:e.name,date:e.date,endDate:e.endDate,location:e.location,certificate:e.certificate}};}

// Data contoh untuk modul yang aktif pada lini tertentu.
function seedSamples(store,features,actor){ensure(store);const t=today();
 if(features.includes('event')){const e=save(store,'events',{name:'Workshop Contoh',date:t,location:'Aula utama',description:'Event contoh; bisa diubah atau dihapus.',categories:[{name:'Reguler',price:50000,quota:100},{name:'VIP',price:150000,quota:20}],questions:[{label:'Asal kota',required:false}]});for(const [n,c,s] of [['Peserta Contoh 1',0,'Lunas'],['Peserta Contoh 2',1,'Menunggu pembayaran']])save(store,'registrations',{eventId:e.id,categoryId:e.categories[c].id,name:n,phone:'081234567890',status:s});}
 if(features.includes('booking'))save(store,'bookings',{resource:'Utama',date:t,start:'10:00',end:'11:00',customerName:'Pemesan Contoh',phone:'081234567890',service:'Layanan contoh',price:50000,status:'Dipesan'});
 if(features.includes('ternak')){const a=save(store,'animals',{tag:'A-001',species:'Kambing',breed:'Etawa',sex:'Betina',origin:'Beli',buyPrice:2000000});addLog(store,'animals',a.id,{date:t,type:'timbang',qty:32,unit:'kg'});save(store,'animals',{tag:'A-002',species:'Kambing',breed:'Kacang',sex:'Jantan',origin:'Beli',buyPrice:1800000});}
 if(features.includes('siklus')){const c=save(store,'cycles',{name:'Siklus Contoh 1',kind:'Produksi',start:t,initial:500,unit:'ekor'});addLog(store,'cycles',c.id,{date:t,type:'pakan',qty:50,unit:'kg',amount:450000});}
 if(features.includes('anggota')){const m=save(store,'members',{name:'Anggota Contoh',phone:'081234567890'});save(store,'ledger',{memberId:m.id,type:'setoran',amount:100000,notes:'Setoran awal contoh'});}
 if(features.includes('komisi'))save(store,'staff',{name:'Karyawan Contoh',rate:30});
 if(features.includes('tagihan')){const c=store.list('customers')[0],p=store.list('products')[0];if(c&&p)save(store,'recurring',{customerId:c.id,productId:p.id,amount:p.price,day:1,start:t});}
}

module.exports={ROUTE_GROUP,KIND_GROUP,ORDER_STATUS,BOOKING_STATUS,REG_STATUS,LEDGER_TYPES,ensure,list,get,save,remove,addLog,removeLog,cycleSummary,settings,catalog,createOrder,orderAction,generateRecurring,registrationAction,checkin,commissionReport,members,balance,publicReport,publicAction,seedSamples};
