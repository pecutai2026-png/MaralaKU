const {fail}=require('./domain.cjs');
const {readXlsx}=require('./workbook.cjs');
function phone(value){
 let s=String(value??'').trim().replace(/^'/,'');
 if(/^[0-9]+(?:\.[0-9]+)?e\+?[0-9]+$/i.test(s)){const n=Number(s);if(!Number.isSafeInteger(n))return '';s=String(n);}
 if(!/^\+?[0-9\s().-]+$/.test(s))return '';
 const international=s.startsWith('+')||s.startsWith('00');s=s.replace(/\D/g,'');if(/^0+$/.test(s))return '';if(s.startsWith('00'))s=s.slice(2);if(!international){if(s.startsWith('0'))s='62'+s.slice(1);else if(s.startsWith('8'))s='62'+s;}
 return /^[1-9][0-9]{7,14}$/.test(s)&&!/^([0-9])\1+$/.test(s)?s:'';
}
function all(store){return ['customers','contacts'].flatMap(kind=>store.list(kind).map(r=>({...store.provenance({...r,kind}),source:kind==='customers'?'Customer':'Kontak tambahan',phoneKey:phone(r.phone)})));}
function list(store,f={}){
 const data=all(store),counts=new Map();for(const r of data)if(r.phoneKey)counts.set(r.phoneKey,(counts.get(r.phoneKey)||0)+1);
 const q=String(f.q||'').toLowerCase(),key=phone(q);
 return data.map(r=>({...r,duplicate:!!r.phoneKey&&counts.get(r.phoneKey)>1})).filter(r=>(!f.source||r.kind===f.source)&&(!q||[r.name,r.phone,r.notes,r.category].join(' ').toLowerCase().includes(q)||(key&&r.phoneKey===key)));
}
function clean(input){const d={};for(const k of ['name','phone','category','notes'])d[k]=String(input[k]??'').trim().slice(0,k==='notes'?2000:200);if(!d.name)fail('Nama kontak wajib diisi.');const key=phone(d.phone);if(!key)fail('Nomor telepon tidak valid. Gunakan 08…, 628…, atau +kode negara.');d.phone='+'+key;return d;}
function save(store,input,id,actor){return store.tx(()=>{if(id)store.get(id,'contacts');const d=clean(input),existing=all(store).find(r=>r.id!==id&&r.phoneKey===phone(d.phone));if(existing)fail('Nomor sudah tersimpan atas nama '+existing.name+' ('+existing.source+').',409);const r=store.put('contacts',d,id);store.audit(actor,id?'edit':'create','contacts:'+r.id);return r;});}
const aliases={name:['nama','name','namacustomer','namakontak','namalengkap','customer','pelanggan'],phone:['whatsapp','wa','nomorwa','nowa','nomorwhatsapp','nowhatsapp','phone','telepon','nomortelepon','notelepon','nohp','nomorhp','hp','nomorhandphone','handphone'],category:['kategori','category','jenis','kelompok'],notes:['keterangan','catatan','notes','note','alamat','address']};
const norm=s=>String(s??'').toLowerCase().replace(/[^a-z0-9]/g,'');
function readDelimited(s){
 s=s.replace(/^\uFEFF/,'');let quoted=false;const counts={',':0,';':0,'\t':0};
 for(let i=0;i<s.length;i++){const c=s[i];if(c==='"'){if(quoted&&s[i+1]==='"'){i++;continue;}quoted=!quoted;}if(!quoted){if(c==='\r'||c==='\n')break;if(c in counts)counts[c]++;}}
 const delimiter=Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0];let row=[],cell='',table=[];quoted=false;
 for(let i=0;i<s.length;i++){const c=s[i];if(c==='"'){if(quoted&&s[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(!quoted&&c===delimiter){row.push(cell);cell='';}else if(!quoted&&(c==='\n'||c==='\r')){row.push(cell);table.push(row);row=[];cell='';if(c==='\r'&&s[i+1]==='\n')i++;}else cell+=c;}
 if(quoted)fail('Tanda kutip pada CSV belum ditutup.');if(cell||row.length){row.push(cell);table.push(row);}return table;
}
function parse(input){
 let table;if(input.format==='xlsx')table=readXlsx(Buffer.from(String(input.content||''),'base64'));else if(input.format==='csv'){
 table=readDelimited(String(input.content||''));
 }else fail('Gunakan file Excel (.xlsx) atau CSV.');
 if(!table.length)fail('File kosong.');if(table.length>2001)fail('Maksimal 2.000 baris per unggahan.');
 const headers=table[0].map(v=>String(v??'')),mapping=input.mapping||Object.fromEntries(Object.entries(aliases).map(([k,values])=>[k,headers.findIndex(h=>values.includes(norm(h)))]));
 for(const k of ['name','phone'])if(!Number.isInteger(Number(mapping[k]))||Number(mapping[k])<0||Number(mapping[k])>=headers.length) return {headers,mapping,needsMapping:true,rows:[]};
 if(Number(mapping.name)===Number(mapping.phone))fail('Kolom nama dan nomor harus berbeda.');
 return {headers,mapping,rows:table.slice(1).map((r,i)=>({line:i+2,...Object.fromEntries(Object.keys(aliases).map(k=>[k,r[Number(mapping[k])]??'']))})).filter(r=>[r.name,r.phone,r.category,r.notes].some(v=>String(v).trim()))};
}
function preview(store,input){const parsed=parse(input);if(parsed.needsMapping)return parsed;const existing=new Map(all(store).filter(r=>r.phoneKey).map(r=>[r.phoneKey,r.name]));return {...parsed,rows:parsed.rows.map(r=>{try{const d=clean(r),key=phone(d.phone),match=existing.get(key);if(match)return {...d,line:r.line,status:'Duplikat',message:'Nomor sudah ada: '+match};existing.set(key,d.name);return {...d,line:r.line,status:'Siap',message:''};}catch(e){return {...r,status:'Perlu diperbaiki',message:e.message};}})};}
function commit(store,input,actor){return store.tx(()=>{const result=preview(store,input);if(result.needsMapping)fail('Pilih kolom nama dan nomor telepon.');let inserted=0;for(const r of result.rows)if(r.status==='Siap'){const d=clean(r),saved=store.put('contacts',d);store.audit(actor,'create','contacts:'+saved.id);inserted++;}return {inserted,duplicates:result.rows.filter(r=>r.status==='Duplikat').length,invalid:result.rows.filter(r=>r.status==='Perlu diperbaiki').length};});}
module.exports={phone,list,save,parse,preview,commit};
