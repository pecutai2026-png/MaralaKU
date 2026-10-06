const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createPlatform}=require('../server.cjs');
test('accounts, isolated databases, trial gates, administration and activation',async()=>{
 const dir=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'marala-test-')),app=createPlatform({dataDir:dir});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+app.server.address().port;
 function client(){let cookie='';return async(p,d,method=d?'POST':'GET',headers={})=>{const r=await fetch(base+p,{method,headers:{...(cookie?{cookie}:{}),...(d?{'Content-Type':'application/json'}:{}),...headers},body:d?JSON.stringify(d):undefined});if(r.headers.getSetCookie().length)cookie=r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');const body=await r.json();return {status:r.status,body};};}
 const admin=client(),a=client(),b=client(),anon=client(),password='Marala-test-2026';
 try{
 assert.equal((await anon('/platform/admin/overview')).status,401);
 assert.equal((await admin('/platform/admin/setup',{name:'Pengelola',email:'admin@example.test',password})).status,201);
 assert.equal((await anon('/platform/admin/setup',{name:'Other',email:'other@example.test',password})).status,409);
 const first=await a('/platform/register',{business:'Toko A',owner:'Pemilik A',username:'owner-a',phone:'081234567890',password,type:'toko',samples:true});assert.equal(first.status,201,JSON.stringify(first.body));
 const id=first.body.tenant.id;assert.ok(first.body.tenant.remainingMs>86400000);assert.equal((await a('/platform/session')).body.user.role,'tenant');assert.equal(first.body.tenant.phone,'6281234567890');assert.equal(first.body.tenant.email,'');
 assert.equal((await anon('/platform/register',{business:'Duplicate',owner:'Other',username:'other',phone:'+62 812-3456-7890',password,type:'toko'})).status,409);
 assert.equal((await anon('/platform/register',{business:'Invalid',owner:'Other',username:'other',phone:'not-a-number',password,type:'toko'})).status,400);
 assert.equal((await b('/platform/register',{business:'Jasa B',owner:'Pemilik B',username:'owner-b',phone:'081234567891',password,type:'jasa',samples:false})).status,201);
 const products=await a('/api/records/products');assert.equal(products.status,200);assert.ok(products.body.length>0);
 assert.equal((await b('/api/records/products')).body.length,0);
 assert.equal((await b('/api/records/products/'+products.body[0].id)).status,404);
 assert.equal((await a('/platform/admin/overview')).status,401);
 assert.equal((await admin('/platform/admin/overview')).body.funnel.transacted,0);
 assert.equal((await a('/platform/event',{feature:'dashboard',action:'view'})).status,200);
 assert.equal((await a('/api/records/customers',{name:'Pelanggan Baru',phone:'081234567891'})).status,201);
 assert.equal((await a('/platform/event',{feature:'dashboard',action:'view'},'POST',{origin:'https://evil.example'})).status,403);
 assert.equal((await admin(`/platform/admin/tenants/${id}/expire`,{})).status,200);
 assert.equal((await a('/api/records/customers',{name:'Blocked'})).status,423);
 assert.equal((await a('/api/records/products')).status,200);
 assert.equal((await a('/api/backup')).status,200);
 assert.equal((await admin(`/platform/admin/tenants/${id}/extend`,{days:3})).status,200);
 assert.equal((await a('/api/records/customers',{name:'After extension',phone:'081234567892'})).status,201);
 const before=(await a('/api/records/customers')).body;
 assert.equal((await admin(`/platform/admin/tenants/${id}/activate`,{})).status,200);
 assert.ok(fs.existsSync(path.join(dir,'tenants','paid',id+'.sqlite')));
 assert.ok(!fs.existsSync(path.join(dir,'tenants','trial',id+'.sqlite')));
 assert.deepEqual((await a('/api/records/customers')).body,before);
 assert.equal((await admin(`/platform/admin/tenants/${id}/extend`,{days:2})).status,400);
 assert.equal((await admin(`/platform/admin/tenants/${id}/export`)).status,200);
 assert.equal((await admin(`/platform/admin/tenants/${id}/block`,{})).status,200);
 assert.equal((await a('/api/session')).status,403);
 assert.equal((await admin(`/platform/admin/tenants/${id}/unblock`,{})).status,200);
 assert.equal((await a('/platform/logout',{})).status,200);
 assert.equal((await a('/api/session')).status,401);
 assert.equal((await a('/platform/login',{phone:'+62 812-3456-7890',password})).status,200);
 assert.equal((await a('/api/session')).status,200);
 const settings={duration:2,promo:true,promoDays:5,promoStart:'2020-01-01',promoEnd:'2030-12-31',contact:'6281234567890'};
 assert.equal((await admin('/platform/admin/settings',settings,'PUT')).status,200);
 const c=client(),third=await c('/platform/register',{business:'Kafe C',owner:'C',username:'owner-c',phone:'+6281234567892',password,type:'kafe'});assert.equal(third.status,201);assert.ok(third.body.tenant.remainingMs>4*86400000);
 const over=(await admin('/platform/admin/overview')).body;assert.equal(over.tenants.length,3);assert.equal(over.funnel.paid,1);assert.equal(over.funnel.visited,1);assert.ok(over.features.some(f=>f.feature==='customers'&&f.action==='write'&&f.count===2));assert.equal(over.tenants.find(t=>t.id===id).phone,'6281234567890');
 assert.equal((await b('/platform/profile',{type:'jasa',phone:'081234567890'},'PUT')).status,409);
 const oldTenant=over.tenants.find(t=>t.type==='jasa');app.db.prepare('UPDATE tenants SET phone=NULL,email=? WHERE id=?').run('legacy@example.test',oldTenant.id);
 assert.equal((await b('/platform/logout',{})).status,200);assert.equal((await b('/platform/login',{slug:oldTenant.slug,username:'owner-b',password})).status,200);
 assert.equal((await b('/platform/profile',{type:'jasa',phone:'081234567891'},'PUT')).status,200);
 }finally{await new Promise(r=>app.server.close(r));app.close();}
});
test('phone migration preserves existing registrations',()=>{
 const dir=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'marala-migration-'));
 const old=createPlatform({dataDir:dir});old.db.exec('DROP INDEX tenant_phone_unique; ALTER TABLE tenants DROP COLUMN phone');
 old.db.prepare('INSERT INTO tenants(id,name,slug,type,email,owner_id,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?)').run('legacy','Usaha Lama','usaha-lama','toko','legacy@example.test','owner',1,2);old.close();
 const next=createPlatform({dataDir:dir});try{assert.equal(next.tenant('legacy').name,'Usaha Lama');assert.equal(next.tenant('legacy').email,'legacy@example.test');assert.equal(next.tenant('legacy').phone,null);}finally{next.close();}
});

