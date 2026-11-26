const {today}=require('./business/server/domain.cjs');
const pos=require('./business/server/pos.cjs');
const lines=require('./public/lines.js');
function seed(store,tenant,user,samples=true){
 const actor=user.id,dt=today(),logo='/assets/logo.png';
 store.setSetting('identity',{name:tenant.name,organization:'MaralaKu untuk usaha',address:'',phone:tenant.phone?'+'+tenant.phone:'',email:tenant.email.endsWith('@marala.invalid')?'':tenant.email,website:'',logo:''});
 store.setSetting('application',{name:tenant.name+' · MaralaKu',shortName:'MaralaKu'});
 store.setSetting('finance',{pettyOpening:1000000,pettyStart:dt.slice(0,7)+'-01'});
 const unit=store.save('units',{name:tenant.name,notes:'Unit utama usaha'},undefined,actor);store.setSetting('posUnit',{id:unit.id});
 if(!samples)return;
 const line=lines.resolve(tenant.line,tenant.type),set=lines.samples(line)||lines.samples(lines.resolve(null,tenant.type)),terms=lines.terms(line);
 const products=set.items,stockNames=set.stock||(tenant.type==='toko'?products.slice(0,3).map(p=>p[0]):['Perlengkapan habis pakai']);
 const main=[];
 for(const [i,p]of products.entries()){
  const product=store.save('products',{unitId:unit.id,code:'CONTOH-'+(i+1),name:p[0],type:tenant.type==='jasa'?'Jasa':'Produk',unit:p[4],price:p[2],cost:p[3]},undefined,actor);main.push(product);
  if(tenant.type!=='jasa')pos.saveProduct(store,{name:p[0],category:p[1],price:p[2],cost:p[3],active:true},undefined,actor);
 }
 const customer=store.save('customers',{name:terms.pelanggan+' Contoh',phone:'081234567890',notes:'Data contoh; bisa diubah atau diarsipkan.'},undefined,actor);
 for(const [i,name]of stockNames.entries()){
  const item=store.save('stockitems',{name,category:'Contoh',unit:i===2&&tenant.type==='kafe'?'kg':'pcs',price:tenant.type==='toko'&&!set.stock?products[i][3]:1000,minTeko:5,maxTeko:100,minWarehouse:10,maxWarehouse:200},undefined,actor);
  for(const stock of store.list('stocks').filter(s=>s.stockItemId===item.id))store.save('movements',{stockId:stock.id,date:dt,direction:'Masuk',quantity:50,notes:'Saldo awal data contoh'},undefined,actor);
 }
 const invoice=store.save('invoices',{unitId:unit.id,customerId:customer.id,date:dt,dueDate:dt,items:[{productId:main[0].id,name:main[0].name,unit:main[0].unit,qty:1,price:main[0].price,discount:0}],discount:0,other:0,notes:terms.invoice+' contoh'},undefined,actor);
 store.save('payments',{invoiceId:invoice.id,date:dt,amount:invoice.total,method:'Cash'},undefined,actor);
 store.save('expenses',{date:dt,unitId:unit.id,category:'Operasional Lainnya',costClass:'Operasional',description:'Biaya operasional contoh',amount:5000,source:'Petty Cash',method:'Cash',status:'Dibayar',notes:'Data contoh'},undefined,actor);
 require('./business/server/modules.cjs').seedSamples(store,lines.features(line,tenant.channel,{}),actor);
 store.setSetting('sampleData',{enabled:true,createdAt:new Date().toISOString()});
}
module.exports={seed};
