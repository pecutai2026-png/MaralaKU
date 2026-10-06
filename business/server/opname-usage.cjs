// Informational daily totals only; never writes or adjusts stock balances.
function enrich(store,rows){
 if(!rows.length)return rows;
 const dates=rows.map(r=>r.date).sort(),range={from:dates[0],to:dates.at(-1)};
 const approved=new Set(store.list('posdays').filter(d=>d.status==='Approved').map(d=>d.id));
 const linked=new Set(store.list('posproducts').flatMap(p=>(p.stockRecipe||[]).map(r=>r.stockId)));
 const totals=new Map();
 for(const m of store.list('movements',range)){
  if(!m.posDayId||!approved.has(m.posDayId)||m.direction!=='Keluar'||m.location!=='Teko Marala')continue;
  const key=m.date+'|'+m.stockId;totals.set(key,Math.round(((totals.get(key)||0)+Number(m.quantity))*1000)/1000);
 }
 return rows.map(r=>({...r,salesUsed:r.location==='Teko Marala'?(totals.get(r.date+'|'+r.stockId)??(linked.has(r.stockId)?0:null)):null}));
}
module.exports={enrich};
