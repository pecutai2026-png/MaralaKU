// Recalculate draft HPP without changing prices, invoices or payment amounts.
function calculator(store){
 const all=kind=>store.db.prepare('SELECT id,data FROM records WHERE kind=?').all(kind).map(r=>({...JSON.parse(r.data),id:r.id}));
 const masters=new Map(all('products').map(p=>[p.id,p]));
 const pos=new Map(all('posproducts').map(p=>[p.id,p]));
 const item=(i,map=masters)=>({...i,cost:map.get(i.productId)?.cost??i.cost??0});
 const ticket=t=>{const items=t.items.map(i=>{const next=item(i,pos);return {...next,hpp:Math.round(next.cost*next.qty)};});return {...t,items,cost:items.reduce((n,i)=>n+i.hpp,0)};};
 const days=new Map();
 const dayCost=s=>{if(!days.has(s.date)){const batches=new Map();for(const t of store.list('postickets',{from:s.date,to:s.date}).filter(t=>t.status==='Selesai')){const r=ticket(t),batch=t.batch||0;batches.set(batch,(batches.get(batch)||0)+r.cost);}days.set(s.date,batches);}return days.get(s.date).get(store.get(s.posDayId,'posdays').batch||0)??s.cost??0;};
 return {item,ticket,invoice:i=>({...i,items:(i.items||[]).map(i=>item(i))}),sale:s=>({...s,cost:s.posDayId?dayCost(s):masters.has(s.productId)&&Number(s.quantity)>0?Math.round(masters.get(s.productId).cost*Number(s.quantity)):s.cost||0})};
}
module.exports={calculator};
