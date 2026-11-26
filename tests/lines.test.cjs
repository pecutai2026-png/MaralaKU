const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const lines=require('../public/lines.js');
const {createPlatform}=require('../server.cjs');

test('katalog lini lengkap dan konsisten',()=>{
 const ids=new Set();
 for(const line of lines.LINES){
  assert.ok(!ids.has(line.id),'id ganda '+line.id);ids.add(line.id);
  assert.ok(lines.ENGINES[line.engine],'mesin '+line.id);
  assert.ok(lines.CATEGORIES.some(c=>c[0]===line.category),'kategori '+line.id);
  assert.ok(lines.CHANNELS[line.channel],'jalur '+line.id);
  assert.ok(lines.samples(line)?.items.length,'data contoh '+line.id);
  for(const step of lines.terms(line).steps)assert.doesNotMatch(step,/\{|undefined/,'langkah '+line.id);
  for(const group of lines.menu(line))assert.ok(group[0]&&group[1].length,'menu '+line.id);
 }
 assert.ok(lines.LINES.length>=100);
 for(const type of ['toko','kafe','jasa'])assert.equal(lines.resolve(null,type).engine,type);
 assert.deepEqual(lines.search('kambing').map(l=>l.id),['kambing']);
 assert.equal(lines.menu(lines.get('masjid'))[1][0],'Catat penerimaan');
});

test('pendaftaran dan perubahan memakai lini usaha serta cara jualan',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'marala-lines-')),app=createPlatform({dataDir:dir});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+app.server.address().port,password='Marala-test-2026';
 function client(){let cookie='';return async(p,d,method=d?'POST':'GET')=>{const r=await fetch(base+p,{method,headers:{...(cookie?{cookie}:{}),...(d?{'Content-Type':'application/json'}:{})},body:d?JSON.stringify(d):undefined});if(r.headers.getSetCookie().length)cookie=r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');return {status:r.status,body:await r.json()};};}
 const masjid=client(),kos=client(),anon=client();
 try{
  const first=await masjid('/platform/register',{business:'Masjid Al-Ikhlas',owner:'Takmir',username:'takmir',phone:'081200000101',password,line:'masjid',channel:'online',samples:true});
  assert.equal(first.status,201,JSON.stringify(first.body));
  assert.equal(first.body.tenant.line,'masjid');assert.equal(first.body.tenant.type,'toko');assert.equal(first.body.tenant.channel,'online');
  assert.ok((await masjid('/api/records/products')).body.some(p=>p.name==='Infak (per Rp1.000)'));
  const second=await kos('/platform/register',{business:'Kos Melati',owner:'Ibu Kos',username:'ibukos',phone:'081200000102',password,line:'kos',samples:true});
  assert.equal(second.status,201,JSON.stringify(second.body));
  assert.equal(second.body.tenant.type,'jasa');assert.equal(second.body.tenant.channel,'online');
  assert.ok((await kos('/api/records/customers')).body.some(c=>c.name==='Penghuni Contoh'));
  assert.equal((await anon('/platform/register',{business:'Tidak dikenal',owner:'X',username:'xxx',phone:'081200000103',password,line:'tidak-ada'})).status,400);
  assert.equal((await masjid('/platform/profile',{line:'fun-run'},'PUT')).status,200);
  let tenant=(await masjid('/platform/session')).body.tenant;
  assert.equal(tenant.line,'fun-run');assert.equal(tenant.type,'jasa');assert.equal(tenant.channel,'online');
  assert.equal((await masjid('/platform/profile',{channel:'keduanya'},'PUT')).status,200);
  tenant=(await masjid('/platform/session')).body.tenant;
  assert.equal(tenant.line,'fun-run');assert.equal(tenant.channel,'keduanya');
  assert.equal((await masjid('/platform/profile',{channel:'teleport'},'PUT')).status,200);
  assert.equal((await masjid('/platform/session')).body.tenant.channel,'keduanya');
  app.db.prepare('UPDATE tenants SET line=NULL,channel=NULL,type=? WHERE id=?').run('kafe',second.body.tenant.id);
  tenant=(await kos('/platform/session')).body.tenant;
  assert.equal(tenant.line,'kafe');assert.equal(tenant.channel,'keduanya');
  assert.equal((await fetch(base+'/lines.js')).status,200);
 }finally{await new Promise(r=>app.server.close(r));app.close();}
});
