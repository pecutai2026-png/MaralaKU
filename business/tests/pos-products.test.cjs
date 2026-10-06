const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
test('filter kategori menampilkan hanya produk pilihan dan kembali ke semua kategori',async()=>{
 const products=[{id:'a',name:'Teh',category:'Tea',price:4000,cost:2000},{id:'b',name:'Kopi',category:'Kopi',price:10000,cost:5000}];
 const elements={'#content':{},'#masterPosCategory':{}};let rows;
 const context=vm.createContext({$:s=>elements[s],$$:()=>[],api:async()=>products,can:()=>false,header:()=>'',esc:String,money:String,traceSummary:()=>'',posTable:(_,r)=>{rows=r;return '';}});
 vm.runInContext(fs.readFileSync(require.resolve('../pos-ui.js'),'utf8'),context);context.posTable=(_,r)=>{rows=r;return '';};
 await vm.runInContext('posProducts()',context);assert.match(elements['#content'].innerHTML,/Semua Kategori/);assert.match(elements['#content'].innerHTML,/<td>Teh<\/td>/);assert.match(elements['#content'].innerHTML,/<td>Kopi<\/td>/);
 await elements['#masterPosCategory'].onchange({target:{value:'Tea'}});assert.match(elements['#content'].innerHTML,/<td>Teh<\/td>/);assert.doesNotMatch(elements['#content'].innerHTML,/<td>Kopi<\/td>/);
 await elements['#masterPosCategory'].onchange({target:{value:''}});assert.match(elements['#content'].innerHTML,/<td>Kopi<\/td>/);
});
test('master produk mengaktifkan tambah, edit, massal dan hapus setelah daftar dirender',async()=>{
 const products=[{id:'a',name:'Teh',category:'Tea',price:4000,cost:2000,active:true},{id:'b',name:'Kopi',category:'Kopi',price:10000,cost:5000,active:true}];
 const elements={'#content':{},'#newPosProduct':{},'#batchPosProduct':{},'#addPosProduct':{},'#posProductRows':{append(){}}};
 const edits=products.map(p=>({dataset:{posProduct:p.id}})),deletes=products.map(p=>({dataset:{posDelete:p.id}}));let dialog,calls=[];
 const context=vm.createContext({$:(selector)=>selector==='[data-pos-delete]'?deletes[0]:elements[selector],$$:selector=>({'[data-pos-product]':edits,'[data-pos-delete]':deletes})[selector]||[],api:async(path,options)=>{calls.push({path,options});return products;},can:()=>true,header:x=>x,esc:String,money:String,traceSummary:()=>'',field:()=>'',safe:fn=>fn,confirm:()=>true,toast:()=>{},modal:(title,html,save)=>{dialog={title,html,save};},document:{createElement:()=>({querySelector:()=>({}),remove(){}})}});
 vm.runInContext(fs.readFileSync(require.resolve('../pos-ui.js'),'utf8'),context);
 await vm.runInContext('posProducts()',context);
 elements['#newPosProduct'].onclick();assert.equal(dialog.title,'Tambah Produk');await dialog.save({name:'Baru'});assert.equal(calls.at(-1).options.method,'POST');
 edits[1].onclick();assert.equal(dialog.title,'Edit Produk');await dialog.save({name:'Kopi Baru'});assert.equal(calls.at(-1).path,'/api/pos/products/b');assert.equal(calls.at(-1).options.method,'PUT');
 elements['#batchPosProduct'].onclick();assert.equal(dialog.title,'Produk Teko — Input Massal');assert.equal(typeof elements['#addPosProduct'].onclick,'function');
 await dialog.save({}, {querySelectorAll:()=>[{querySelectorAll:()=>[{name:'name',type:'text',value:'Produk Massal'}]}]});assert.equal(calls.at(-1).path,'/api/pos/products-batch');assert.equal(calls.at(-1).options.body.rows[0].name,'Produk Massal');
 await deletes[0].onclick();assert(calls.some(c=>c.path==='/api/pos/products/a'&&c.options?.method==='DELETE'));
});
test('master produk kosong dan akun tanpa izin menulis tetap bisa dibuka',async()=>{
 const context=vm.createContext({$:selector=>selector==='#content'?{}:null,$$:()=>[],api:async()=>[],can:()=>false,header:x=>x,esc:String,money:String,traceSummary:()=>''});
 vm.runInContext(fs.readFileSync(require.resolve('../pos-ui.js'),'utf8'),context);await vm.runInContext('posProducts()',context);
});
