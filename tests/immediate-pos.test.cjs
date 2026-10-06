const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {Store}=require('../business/server/store.cjs'),pos=require('../business/server/pos.cjs'),{today}=require('../business/server/domain.cjs'),{seed}=require('../seed.cjs');
test('paid sales post immediately once, unpaid orders wait, cancellations restore stock, failures rollback',()=>{
 const dir=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'marala-paid-')),s=new Store(path.join(dir,'business.sqlite'));
 try{
 const user=s.saveUser({name:'Kasir',username:'cashier',password:'Marala-test-2026',role:'STAFF'},undefined,'setup');seed(s,{name:'Toko',type:'toko',email:'',phone:'6281234567890'},user,true);s.setSetting('posImmediatePayments',{enabled:true});
 const stock=s.list('stocks').find(x=>x.location==='Teko Marala'),initial=s.stockQuantity(stock.id,today()),base=s.list('sales').reduce((n,x)=>n+x.amount,0),p=s.list('posproducts')[0];pos.saveProduct(s,{...p,stockRecipe:[{stockId:stock.id,quantity:1}]},p.id,user.id);
 const sale=(key,qty=1,extra={})=>pos.createSale(s,{key,date:today(),items:[{productId:p.id,qty}],method:'Cash',cash:1000000,...extra},user.id);
 const first=sale('immediate-test-key-0001',2);assert.equal(s.list('sales').length,1);assert.equal(s.list('sales')[0].amount,p.price*2);assert.equal(s.stockQuantity(stock.id,today()),initial-2);assert.equal(pos.report(s,today().slice(0,7)).approvedAmount,p.price*2);
 assert.equal(sale('immediate-test-key-0001',2).id,first.id);assert.equal(s.list('sales').length,1);assert.equal(s.stockQuantity(stock.id,today()),initial-2);
 sale('immediate-test-key-0002');assert.equal(s.list('sales').reduce((n,x)=>n+x.amount,0),base+p.price*3);assert.equal(s.stockQuantity(stock.id,today()),initial-3);
 pos.voidSale(s,first.id,'Salah input',user.id);assert.equal(s.stockQuantity(stock.id,today()),initial-1);assert.equal(s.list('sales').reduce((n,x)=>n+x.amount,0),base+p.price);assert.throws(()=>pos.voidSale(s,first.id,'Ulang',user.id));
 const debt=sale('immediate-test-key-0003',3,{method:'Hutang',customerName:'Customer'});assert.equal(s.list('sales').length,1);assert.equal(s.stockQuantity(stock.id,today()),initial-1);
 const paid=pos.changeOrder(s,debt.id,{method:'QRIS',qrisConfirmed:true},'pay',user.id);assert.equal(s.list('sales').length,2);assert.equal(s.stockQuantity(stock.id,today()),initial-4);assert.equal(pos.changeOrder(s,debt.id,{method:'QRIS',qrisConfirmed:true},'pay',user.id).id,paid.id);assert.equal(s.list('sales').length,2);
 const count=s.list('postickets').length;assert.throws(()=>sale('immediate-test-key-0004',100));assert.equal(s.list('postickets').length,count);assert.equal(s.stockQuantity(stock.id,today()),initial-4);
 const queue=sale('immediate-test-key-0005',100,{mode:'queue'});assert.throws(()=>pos.changeOrder(s,queue.id,{method:'Cash',cash:10000000},'pay',user.id));assert.equal(s.get(queue.id,'posorders').status,'Menunggu');assert.equal(s.list('postickets').length,count);
 assert.throws(()=>sale('immediate-test-key-0006',1,{method:'QRIS',qrisConfirmed:false}));assert.throws(()=>pos.changeDay(s,{date:today()},'submit',user));
 }finally{s.db.close();}
});
