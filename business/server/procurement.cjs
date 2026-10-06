// Procurement uses existing records, stock movements and petty-cash sources.
const {date,money,fail}=require('./domain.cjs');
const clean=v=>String(v??'').trim().slice(0,500);
function save(store,input,id,actor){return store.tx(()=>{
 const old=id?store.get(id,'procurements'):null;
 const d={number:old?.number||store.nextNumber('procurements','PGD',input.date||''),date:date(input.date),type:input.type,unitId:input.unitId,description:clean(input.description),notes:clean(input.notes),quantity:Number(input.quantity),price:money(input.price),source:input.source,method:input.method,status:input.status};
 store.ref(d.unitId,'units');
 if(!['Persediaan','Aset/Peralatan'].includes(d.type))fail('Pilih jenis pengadaan.');
 if(!Number.isFinite(d.quantity)||d.quantity<=0||d.quantity>1e9||Math.abs(d.quantity*1000-Math.round(d.quantity*1000))>1e-6)fail('Quantity harus lebih dari nol, maksimal 3 desimal.');
 d.amount=money(Math.round(d.quantity*d.price));if(!d.amount)fail('Total pengadaan harus lebih dari nol.');
 if(!['Draft','Dibayar','Dibatalkan'].includes(d.status))fail('Status pengadaan tidak valid.');
 if(!['Petty Cash','Rekening','Lainnya'].includes(d.source))fail('Pilih sumber dana.');
 if(!['Cash','Transfer','QRIS'].includes(d.method))fail('Pilih metode pembayaran.');
 if(d.source==='Rekening'){const bank=store.ref(input.bankId,'banks');if(!bank.active)fail('Rekening tidak aktif.');d.bankId=bank.id;}
 if(d.type==='Persediaan'){
  const item=old?.stockItemId===input.stockItemId?store.get(input.stockItemId,'stockitems',true):store.ref(input.stockItemId,'stockitems');if(!['Gudang','Teko Marala'].includes(input.location))fail('Pilih lokasi penerimaan stok.');
  const stock=store.list('stocks').find(s=>s.stockItemId===item.id&&s.location===input.location);if(!stock)fail('Lokasi barang tidak tersedia.');
  Object.assign(d,{stockItemId:item.id,stockId:stock.id,name:item.name,unit:item.unit,location:stock.location});
 }else{d.name=clean(input.name);d.unit=clean(input.unit);if(!d.name||!d.unit)fail('Nama aset dan satuan wajib diisi.');d.assetCategory=clean(input.assetCategory);d.assetLocation=clean(input.assetLocation);}
 if(!d.description)d.description=d.name;
 const plan=(store.setting('assetPlans')||{})[id];
 if(plan&&d.status==='Dibayar'&&d.type==='Aset/Peralatan'&&(plan.residual>d.amount||plan.start<d.date.slice(0,7)))fail('Sesuaikan penyusutan aset terlebih dahulu: nilai sisa atau bulan mulai tidak sesuai pengadaan baru.');
 if(old)store.put('procurementrevisions',{procurementId:id,before:old,at:new Date().toISOString(),actor:actor||'system'});
 const oldCash=old?.cashEntryId,oldMovement=old?.movementId;
 require('./finance.cjs').validateCashChange(store,'procurementcash',d.status==='Dibayar'?d:null,oldCash);
 if(oldCash)archive(store,'procurementcash',oldCash,actor);
 if(oldMovement&&(d.status!=='Dibayar'||d.type!=='Persediaan'))archive(store,'movements',oldMovement,actor);
 const saved=store.put('procurements',d,id);
 if(d.status==='Dibayar'){
  // A purchase is cash out, never an operating expense. The acquisition itself is the asset register entry.
  const cash=store.put('procurementcash',{procurementId:saved.id,date:d.date,unitId:d.unitId,source:d.source,bankId:d.bankId||null,method:d.method,amount:d.amount,delta:-d.amount,description:'Pengadaan '+d.number+' — '+d.name});
  store.audit(actor,'create','procurementcash:'+cash.id);saved.cashEntryId=cash.id;
  if(d.type==='Persediaan'){
   const stock=store.get(d.stockId,'stocks');
   const movement=store.put('movements',{date:d.date,stockId:d.stockId,location:stock.location,name:stock.name,unit:stock.unit,direction:'Masuk',quantity:d.quantity,delta:d.quantity,notes:'Pengadaan '+d.number,price:d.price,acquisitionValue:d.amount,procurementId:saved.id},oldMovement);
   store.audit(actor,oldMovement?'edit':'create','movements:'+movement.id);
   saved.movementId=movement.id;
  }else{saved.acquiredAt=d.date;saved.acquisitionValue=d.amount;}
  store.put('procurements',saved,saved.id);
 }
 if(oldMovement||saved.movementId)reconcileStock(store,actor);
 if(plan&&(d.status!=='Dibayar'||d.type!=='Aset/Peralatan')){const plans=store.setting('assetPlans');delete plans[id];store.setSetting('assetPlans',plans);}
 store.audit(actor,old?'edit':'create','procurements:'+saved.id);return store.get(saved.id,'procurements');
});}
function archive(store,kind,id,actor){store.db.prepare('UPDATE records SET deleted=1,updated_at=? WHERE id=?').run(new Date().toISOString(),id);store.audit(actor,'delete',kind+':'+id);}
// Replay the ledger so later physical counts and transfer valuations stay consistent.
function reconcileStock(store,actor){
 const balances=new Map(),transferValues=new Map();
 const rows=['movements','opnames'].flatMap(kind=>store.list(kind).map(r=>({...r,kind}))).sort((a,b)=>a.date.localeCompare(b.date)||a._sequence-b._sequence);
 for(const row of rows){const stock=store.get(row.stockId,'stocks'),base=stock.stockItemId?store.get(stock.stockItemId,'stockitems',true).price:stock.price;
  const b=balances.get(stock.id)||{q:0,v:0},price=b.q?b.v/b.q:base;let changed=false;
  if(row.kind==='opnames'){const delta=Math.round((row.actual-b.q)*1000)/1000;if(row.system!==b.q||row.delta!==delta){row.system=b.q;row.delta=delta;row.difference=delta;row.differenceValue=Math.round(delta*row.price);changed=true;}}
  if(row.transferId&&row.direction==='Keluar'){const value=Math.round(row.quantity*price);transferValues.set(row.transferId,{value,price});const t=store.get(row.transferId,'transfers');if(t.value!==value||t.price!==price){store.put('transfers',{...t,value,price},t.id);store.audit(actor,'edit','transfers:'+t.id);}}
  if(row.transferId&&row.direction==='Masuk'){const t=transferValues.get(row.transferId);if(!t)fail('Urutan transfer stok tidak valid.');if(row.acquisitionValue!==t.value||row.price!==t.price){row.acquisitionValue=t.value;row.price=t.price;changed=true;}}
  const next=Math.round((b.q+row.delta)*1000)/1000;if(next<0)fail('Perubahan ditolak: stok '+stock.name+' menjadi negatif pada '+row.date+'. Koreksi pemakaian/transfer terkait terlebih dahulu.',409);
  b.v+=row.delta>0?(row.acquisitionValue??Math.round(row.delta*price)):row.delta*price;b.q=next;if(!next)b.v=0;balances.set(stock.id,b);
  if(changed){const {kind,...data}=row;store.put(kind,data,row.id);store.audit(actor,'edit',kind+':'+row.id);}
 }
}
function remove(store,id,actor){return store.tx(()=>{const old=store.get(id,'procurements');store.put('procurementrevisions',{procurementId:id,before:old,action:'delete',at:new Date().toISOString(),actor:actor||'system'});if(old.cashEntryId)archive(store,'procurementcash',old.cashEntryId,actor);if(old.movementId){archive(store,'movements',old.movementId,actor);reconcileStock(store,actor);}const plans=store.setting('assetPlans')||{};if(plans[id]){delete plans[id];store.setSetting('assetPlans',plans);}archive(store,'procurements',id,actor);});}
module.exports={save,remove};
