const {fail,today}=require('./domain.cjs');
function recipe(store,rows=[]){
 if(!Array.isArray(rows)||rows.length>50)fail('Maksimal 50 barang stok per produk.');
 const seen=new Set(),stocks=store.list('stocks');
 return rows.map(r=>{const stock=stocks.find(s=>s.id===r.stockId&&s.location==='Teko Marala');if(!stock)fail('Pilih barang dari Stok Teko Marala.');if(seen.has(stock.id))fail('Barang stok tidak boleh berulang.');seen.add(stock.id);const quantity=Number(r.quantity);if(!Number.isFinite(quantity)||quantity<=0||quantity>1000000||Math.abs(quantity*1000-Math.round(quantity*1000))>1e-6)fail('Pemakaian stok harus lebih dari nol, maksimal tiga desimal.');return {stockId:stock.id,name:stock.name,unit:stock.unit,quantity};});
}
function approve(store,day,tickets,actor){
 const totals=new Map();for(const t of tickets)for(const i of t.items)for(const r of i.stockRecipe||[]){const old=totals.get(r.stockId)||{...r,quantity:0};old.quantity=Math.round((old.quantity+r.quantity*i.qty)*1000)/1000;totals.set(r.stockId,old);}
 const postingDate=today(),shortages=[];
 for(const r of totals.values()){const stock=store.get(r.stockId,'stocks');if(stock.unit!==r.unit)fail('Satuan stok berubah: '+r.name+'. Periksa master stok.');const available=store.stockQuantity(r.stockId,postingDate);if(available<r.quantity)shortages.push(stock.name+' — dibutuhkan '+r.quantity+' '+r.unit+', tersedia '+available+', kurang '+Math.round((r.quantity-available)*1000)/1000+' '+r.unit);}
 if(shortages.length)fail('Stok tidak cukup di Teko Marala pada '+postingDate+': '+shortages.join('; ')+'. Tambahkan stok di Teko Marala lalu ulangi approval.');
 for(const r of totals.values()){const stock=store.get(r.stockId,'stocks');if(stock.unit!==r.unit)fail('Satuan stok berubah: '+r.name+'. Periksa master stok.');const movement=store.save('movements',{stockId:r.stockId,date:postingDate,direction:'Keluar',quantity:r.quantity,posDayId:day.id,notes:'Pemakaian untuk penjualan Teko '+day.date+' · rekap '+(day.batch||0)+' · revisi '+day.revision},undefined,actor);store.put('movements',{...movement,posDayId:day.id,posSaleDate:day.date},movement.id);}
}
function reopen(store,day,actor){for(const r of store.list('movements').filter(m=>m.posDayId===day.id)){store.db.prepare('UPDATE records SET deleted=1 WHERE id=?').run(r.id);store.audit(actor,'delete','movements:'+r.id);}}
module.exports={recipe,approve,reopen};
