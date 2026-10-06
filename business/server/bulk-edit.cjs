const crypto=require('node:crypto');
const {GROUP,fail}=require('./domain.cjs');
const fields={
 units:'name notes',products:'unitId code name type unit cost price',customers:'name phone notes',contacts:'name phone category notes',banks:'name account owner active',stockitems:'name category unit minTeko minWarehouse maxTeko maxWarehouse price',
 referrals:'customerId marketing amount date notes',sales:'number date unitId productId description quantity unit salePrice unitCost amount cost method',payments:'invoiceId date amount method notes',
 expenses:'number date unitId category costClass invoiceId description quantity unit unitPrice recipient payPeriod amount method source status proof notes',requests:'number letterNumber date applicant unitId description amount status proof notes',funds:'date amount description',
 procurements:'number date type unitId stockItemId location name unit assetCategory assetLocation description quantity price amount source bankId method status notes',
 invoices:'customerId unitId date dueDate bankId eventDate eventStart eventEnd discount other notes items',users:'name username password role active permissions',posproducts:'name category price cost active stockRecipe',posorders:'customerName phone discount discountReason notes items'
};
const moduleFor=k=>({users:'users',posproducts:'posmaster',posorders:'pos'})[k]||GROUP[k];
function check(store,user,kind){if(!fields[kind])fail('Menu ini tidak mendukung edit massal.',404);for(const action of ['view','edit'])if(!store.can(user,moduleFor(kind),action))fail('Anda tidak memiliki izin edit '+kind+'.',403);}
function current(store,kind,id){if(kind==='users'){const u=store.user(id);if(!u)fail('Pengguna tidak ditemukan.',404);return u;}return store.get(id,kind);}
const version=r=>crypto.createHash('sha256').update(JSON.stringify(r)).digest('hex');
function entries(rows){if(!Array.isArray(rows)||!rows.length||rows.length>100)fail('Pilih 1–100 data.');const seen=new Set();for(const r of rows){if(!r||typeof r.id!=='string'||typeof r.kind!=='string')fail('Pilihan data tidak valid.');const key=r.kind+':'+r.id;if(seen.has(key))fail('Data dipilih dua kali.');seen.add(key);}return rows;}
function read(store,user,rows){return entries(rows).map(r=>{check(store,user,r.kind);const data=current(store,r.kind,r.id);return {kind:r.kind,id:r.id,data,version:version(data)};});}
function save(store,user,rows){return store.tx(()=>{
 const checked=entries(rows).map((r,index)=>{check(store,user,r.kind);const old=current(store,r.kind,r.id);if(r.version!==version(old))fail('Baris '+(index+1)+': data sudah berubah. Tutup dan buka kembali Edit Massal.',409);if(!r.patch||typeof r.patch!=='object'||Array.isArray(r.patch))fail('Data perubahan tidak valid.');const allowed=fields[r.kind].split(' ');for(const k of Object.keys(r.patch))if(!allowed.includes(k))fail('Kolom tidak dapat diubah: '+k);return {...r,old};});
 return checked.map((r,index)=>{try{const d={...r.old,...r.patch};
  if(r.kind==='requests'&&[r.old.status,d.status].some(v=>['Disetujui','Ditolak','Dicairkan','Selesai'].includes(v))&&!store.can(user,'requests','approve'))fail('Izin persetujuan pengajuan diperlukan.',403);
  if(r.kind==='users')return store.saveUser({...d,active:!!d.active},r.id,user.id);
  if(r.kind==='posproducts')return require('./pos.cjs').saveProduct(store,d,r.id,user.id);
  if(r.kind==='posorders')return require('./pos.cjs').changeOrder(store,r.id,d,'edit',user.id);
  return store.save(r.kind,d,r.id,user.id);
 }catch(e){fail('Baris '+(index+1)+': '+(e.message.includes('UNIQUE')?'Nomor atau nama sudah digunakan.':e.message),e.status||400);}});
});}
module.exports={read,save};
