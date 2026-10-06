// Read history without changing sales, approval, or revenue calculations.
function history(store,f={}){
 const range={from:f.from,to:f.to};
 const users=new Map(store.db.prepare('SELECT id,name,username FROM users').all().map(u=>[u.id,u]));
 const orders=store.list('posorders'),byId=new Map(orders.map(o=>[o.id,o]));
 const author=r=>{const u=r._trace?.createdBy||users.get(r.actor);return u?{name:u.name||'',username:u.username||''}:null;};
 const paid=store.list('postickets',range).map(t=>{const o=byId.get(t.orderId);return {...t,inputUser:author(o||t),inputAt:(o||t).at||null,paymentUser:author(t),paidAt:t.at||null,wasDebt:o?.orderType==='debt'};});
 const unpaid=orders.filter(o=>o.orderType==='debt'&&!['Lunas','Batal'].includes(o.status)&&(!f.from||o.date>=f.from)&&(!f.to||o.date<=f.to)).map(o=>({...o,method:'Hutang',unpaid:true,inputUser:author(o),inputAt:o.at||null}));
 return [...paid,...unpaid].filter(t=>(!f.product||(t.items||[]).some(i=>String(i.name||'').toLowerCase().includes(f.product.toLowerCase())))&&(!f.method||t.method===f.method||(f.method==='Hutang'&&t.wasDebt))).sort((a,b)=>String(b.paidAt||b.inputAt||b.date).localeCompare(String(a.paidAt||a.inputAt||a.date)));
}
module.exports={history};
