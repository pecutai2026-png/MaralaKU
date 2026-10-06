const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {Miniflare,convertV4MiniflareOptions}=require('miniflare');
const TOKEN='test-only-maralaku-setup-secret-0123456789';
function runtime(persist){
 return new Miniflare(convertV4MiniflareOptions({resourcePersistencePath:persist,workers:[{name:'maralaku',
  modules:true,scriptPath:path.resolve('dist/worker/worker.js'),compatibilityDate:'2026-10-01',compatibilityFlags:['nodejs_compat'],
  durableObjects:{PLATFORM:{className:'MaralaPlatform',useSQLite:true},TENANTS:{className:'MaralaTenant',useSQLite:true}},
  bindings:{SETUP_TOKEN:TOKEN},serviceBindings:{ASSETS:r=>{
   const file=path.join(path.resolve('dist/public'),new URL(r.url).pathname);
   if(!fs.existsSync(file))return new Response('Not found',{status:404});
   return new Response(fs.readFileSync(file),{headers:{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream'}});
  }}
 }]}));
}
function client(mf){let cookie='';return {get cookie(){return cookie;},async call(p,method='GET',body,extra={}){const r=await mf.dispatchFetch('https://marala.test'+p,{method,redirect:'manual',headers:{'Content-Type':'application/json',Cookie:cookie,'CF-Connecting-IP':'192.0.2.12',...extra},body:body===undefined?undefined:JSON.stringify(body)});if(r.headers.get('set-cookie'))cookie=r.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ');const data=r.headers.get('content-type')?.includes('json')?await r.json():await r.text();return {status:r.status,headers:r.headers,data};}};}
async function register(c,type,phone,name){const r=await c.call('/platform/register','POST',{type,phone,business:name,owner:'Dewo',username:'dewo',password:'Password12345',samples:true});assert.equal(r.status,201,JSON.stringify(r.data));return r.data.tenant;}
test('Cloudflare: isolated tenants, immediate cashier, trial gates, admin control and persistent data',{timeout:180000},async()=>{
 const persist=fs.mkdtempSync(path.join(os.tmpdir(),'maralaku-cloud-'));let mf=runtime(persist);
 try{
 const admin=client(mf),a=client(mf),b=client(mf),j=client(mf),anon=client(mf);
 assert.equal((await anon.call('/')).status,200);assert.match((await anon.call('/')).data,/MaralaKu/);
 assert.equal((await anon.call('/workspace')).headers.get('location'),'/login');
 for(const p of ['/server.cjs','/server/store.cjs','/cloudflare/worker.mjs','/data/platform.sqlite','/workspace.html','/internal'])assert.equal((await anon.call(p)).status,404,p);
 const publicData=await admin.call('/platform/public');assert.equal(publicData.data.requiresSetupToken,true);
 const setup={name:'Admin',email:'admin@example.test',password:'Password12345'};
 assert.equal((await admin.call('/platform/admin/setup','POST',setup)).status,403);
 assert.equal((await admin.call('/platform/admin/setup','POST',{...setup,setupToken:TOKEN})).status,201);
 assert.equal((await admin.call('/platform/admin/setup','POST',{...setup,setupToken:TOKEN})).status,409);
 assert.equal((await admin.call('/api/records/units')).status,401);
 const ta=await register(a,'toko','081234567890','Toko A'),tb=await register(b,'kafe','081234567891','Kafe B');await register(j,'jasa','081234567892','Jasa C');
 assert.equal((await a.call('/platform/admin/overview')).status,401);
 const ua=(await a.call('/api/records/units')).data,ub=(await b.call('/api/records/units')).data;assert.notEqual(ua[0].id,ub[0].id);
 const product=await a.call('/api/pos/products','POST',{name:'Produk hanya A',category:'Tes',price:10000,cost:2000,active:true});assert.equal(product.status,201,JSON.stringify(product.data));
 assert.ok(!(await b.call('/api/pos/products')).data.some(p=>p.id===product.data.id));
 const dt=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Jakarta'}),ticket={key:'cloud-sale-0000001',date:dt,method:'Cash',cash:10000,items:[{productId:product.data.id,qty:1}]};
 const sale=await a.call('/api/pos/tickets','POST',ticket);assert.equal(sale.status,201,JSON.stringify(sale.data));assert.equal((await a.call('/api/pos/tickets','POST',ticket)).data.id,sale.data.id);
 assert.equal((await a.call('/api/pos/report?from='+dt+'&to='+dt)).data.approvedAmount,10000);
 assert.equal((await b.call('/api/pos/tickets')).data.length,0);
 const forged=client(mf);assert.equal((await forged.call('/api/pos/products','GET',undefined,{Cookie:'marala_session='+a.cookie.match(/marala_access=([^;]+)/)[1]})).status,401);
 assert.equal((await a.call('/platform/profile','PUT',{type:'toko',phone:'081234567891'})).status,409);
 assert.equal((await a.call('/platform/event','POST',{feature:'dashboard',action:'view'})).status,200);
 const overview=await admin.call('/platform/admin/overview');assert.equal(overview.status,200,JSON.stringify(overview.data));assert.equal(overview.data.tenants.length,3);assert.ok(overview.data.features.some(f=>f.feature==='postickets'&&f.action==='write'));
 assert.equal((await admin.call('/platform/admin/tenants/'+ta.id+'/expire','POST',{})).status,200);
 assert.equal((await a.call('/api/pos/tickets','POST',{...ticket,key:'cloud-expired-0001'})).status,423);assert.equal((await a.call('/api/pos/products')).status,200);
 assert.equal((await admin.call('/platform/admin/tenants/'+ta.id+'/extend','POST',{days:5})).status,200);
 assert.equal((await admin.call('/platform/admin/tenants/'+ta.id+'/activate','POST',{})).status,200);
 assert.equal((await a.call('/api/pos/tickets')).data[0].id,sale.data.id);
 const backup=await admin.call('/platform/admin/tenants/'+ta.id+'/export');assert.equal(backup.status,200);assert.ok(backup.headers.get('content-disposition'));
 assert.equal((await admin.call('/platform/admin/tenants/'+tb.id+'/block','POST',{})).status,200);assert.equal((await b.call('/api/pos/products')).status,403);assert.equal((await admin.call('/platform/admin/tenants/'+tb.id+'/unblock','POST',{})).status,200);
 const config={duration:2,promo:true,promoDays:5,promoStart:dt,promoEnd:dt,contact:'6282317393231',applyExisting:true};assert.equal((await admin.call('/platform/admin/settings','PUT',config)).status,200);assert.equal((await anon.call('/platform/public')).data.config.offerDays,5);
 assert.equal((await anon.call('/platform/login','POST',{role:'admin',email:setup.email,password:setup.password},{Origin:'https://other.test'})).status,403);
 await a.call('/platform/logout','POST',{});assert.equal((await a.call('/api/pos/products')).status,401);
 await mf.dispose();mf=runtime(persist);const after=client(mf);const login=await after.call('/platform/login','POST',{phone:'081234567890',password:'Password12345'});assert.equal(login.status,200,JSON.stringify(login.data));assert.equal((await after.call('/platform/session')).data.tenant.status,'paid');assert.equal((await after.call('/api/pos/tickets')).data[0].id,sale.data.id);
 }finally{await mf.dispose();}
});
test('Cloudflare browser: public pages, protected admin setup, registration and mobile workspace',{timeout:120000},async()=>{
 const mf=runtime(fs.mkdtempSync(path.join(os.tmpdir(),'maralaku-cloud-ui-')));
 const {chromium}=require('C:/Users/LENOVO.MGA23/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
 let browser;try{
 const base=String(await mf.ready);browser=await chromium.launch({headless:true,channel:'msedge'});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.locator('.choice').first().waitFor();assert.equal(await page.locator('#package-order').count(),0);
 await page.locator('a[href="/paket-usaha"]').click();await page.locator('#package-order').waitFor();
 await page.goto(base+'admin');await page.locator('[name="setupToken"]').fill(TOKEN);
 for(const [name,value]of Object.entries({name:'Admin Cloud',email:'cloud@example.test',password:'Password12345'}))await page.locator('#login [name="'+name+'"]').fill(value);
 await page.locator('#login button').click();await page.locator('#adminLogout').waitFor();await page.locator('#adminLogout').click();await page.locator('#login [name="email"]').waitFor();
 await page.goto(base+'register?type=kafe');for(const [name,value]of Object.entries({business:'Kafe Browser',owner:'Dewo',username:'dewo',phone:'081234567899',password:'Password12345'}))await page.locator('#register [name="'+name+'"]').fill(value);
 await page.locator('input[type=checkbox][required]').check();await page.locator('#register button').click();await page.waitForURL('**/workspace');await page.locator('#guide-close').click();await page.locator('#marala-trial-bar').waitFor();
 assert.equal(await page.locator('.nav > a,.nav > details').count(),8);await page.locator('[data-nav="poscashier"]').click();await page.locator('#posPay').waitFor();
 const out=path.join(__dirname,'artifacts');fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,'cloud-cashier.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(out,'cloud-mobile.png'),fullPage:true});assert.deepEqual(errors,[]);
 }finally{await browser?.close();await mf.dispose();}
});

