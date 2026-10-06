const crypto=require('node:crypto');
const {date,fail,passwordOK}=require('./domain.cjs');
const writer=require('./finance-export.cjs');
function period(d){const from=date(d.from),to=date(d.to);if(from>to)fail('Tanggal mulai melebihi tanggal akhir.');if((Date.parse(to)-Date.parse(from))/86400000>366)fail('Maksimal 367 hari per approval.');return {from,to};}
function list(s){return s.list('reportarchives').map(({id,from,to,approvedAt,approvedBy,number})=>({id,from,to,approvedAt,approvedBy,number}));}
function exact(s,f){if(!f.from||!f.to||f.unitId||f.q||f.category||f.location)return null;return list(s).find(a=>a.from===f.from&&a.to===f.to)||null;}
function get(s,id){const saved=s.get(id,'reportarchives');if(saved.storageVersion!==2)return saved;
 const chunks=saved.parts.map(part=>{const row=s.get(part,'reportarchiveparts');if(row.archiveId!==id)fail('Bagian arsip tidak sesuai.',409);return Buffer.from(row.content,'base64');});
 const bytes=Buffer.concat(chunks);if(crypto.createHash('sha256').update(bytes).digest('hex')!==saved.digest)fail('Isi arsip tidak lengkap atau rusak.',409);
 return {...JSON.parse(bytes.toString('utf8')),id};}
// Reports need financial facts, not repeated invoice logos or binary attachments.
function compact(value){return JSON.parse(JSON.stringify(value,(key,v)=>['proof','logo','icon192','icon512'].includes(key)?undefined:v));}
function prepare(s,d){const f=period(d),raw=s.report(f),{invoices,sales,...facts}=raw,report=compact(facts),opnames=compact(require('./opname-usage.cjs').enrich(s,s.list('opnames',f)));const context={identity:compact(s.setting('identity')),finance:s.setting('finance'),units:s.list('units'),tickets:s.list('postickets',f),sales:s.list('sales',f),cash:compact(require('./finance.cjs').cashRows(s).filter(r=>r.date<=f.to))};
 const fingerprint=crypto.createHash('sha256').update(JSON.stringify({report,opnames,context})).digest('hex');return {...f,report,opnames,fingerprint};}
function approve(s,d,user){
 if(user.role!=='SUPER ADMIN'||!user.active)fail('Hanya Super Admin dapat menyetujui laporan.',403);
 return s.tx(()=>{const credential=s.db.prepare('SELECT password FROM users WHERE id=? AND active=1 AND deleted=0').get(user.id);if(!credential||!passwordOK(d.password,credential.password))fail('Password Super Admin tidak sesuai.',403);
 const data=prepare(s,d);if(list(s).some(a=>a.from<=data.to&&a.to>=data.from))fail('Periode bertumpang tindih dengan laporan yang sudah disetujui. Pilih periode yang belum diarsipkan.',409);
 if(data.fingerprint!==d.fingerprint)fail('Data berubah sejak pratinjau. Muat ulang laporan lalu periksa kembali sebelum approve.',409);
 const approvedAt=new Date().toISOString(),approvedBy={id:user.id,name:user.name,username:user.username},number='APPROVAL/'+data.from+'/'+data.to;
 const sheets=writer.sheets(s,data.report,user);sheets[0].rows[4]=['DISETUJUI '+approvedAt+' oleh '+user.name+' | '+number];
 const revenueRows=[['LAPORAN OMZET — DISETUJUI'],[data.from+' s.d. '+data.to],['Disetujui oleh',user.name,approvedAt],['Tanggal','Referensi','Unit bisnis','Keterangan','Omzet','HPP'],...data.report.entries.map(e=>[e.date,e.number,e.unitName,e.description,e.amount,e.cost]),['TOTAL','','','',data.report.revenue,data.report.entries.reduce((n,e)=>n+e.cost,0)]];
 const opnameRows=[['LAPORAN STOCK OPNAME — DISETUJUI'],[data.from+' s.d. '+data.to],['Disetujui oleh',user.name,approvedAt],['Tanggal','Barang','Lokasi','Satuan','Terpakai dari Penjualan','Stok sistem','Stok aktual','Selisih','Harga','Nilai selisih','Catatan'],...data.opnames.map(r=>[r.date,r.name,r.location,r.unit,r.salesUsed??'—',r.system,r.actual,r.difference,r.price,r.differenceValue,r.notes||''])];
 const payload={...data,number,approvedAt,approvedBy,sheets,revenueRows,opnameRows},bytes=Buffer.from(JSON.stringify(payload)),id=crypto.randomUUID(),parts=[];
 for(let offset=0;offset<bytes.length;offset+=128*1024){const part=s.put('reportarchiveparts',{archiveId:id,content:bytes.subarray(offset,offset+128*1024).toString('base64')});parts.push(part.id);}
 const saved=s.put('reportarchives',{storageVersion:2,from:data.from,to:data.to,number,approvedAt,approvedBy,parts,digest:crypto.createHash('sha256').update(bytes).digest('hex')},id);s.audit(user.id,'report-approve',number);return {id:saved.id,from:data.from,to:data.to,number,approvedAt,approvedBy};});
}
module.exports={period,list,exact,get,prepare,approve};
