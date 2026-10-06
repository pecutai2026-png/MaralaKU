const {Miniflare,convertV4MiniflareOptions}=require('miniflare');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs'),path=require('node:path');
const assert=require('node:assert/strict');
const {Store}=require('../server/store.cjs');
const {exportSnapshot}=require('../server/snapshot.cjs');
(async()=>{
 const token='local-browser-only-setup-token-0123456789';
 const mf=new Miniflare(convertV4MiniflareOptions({workers:[{
  name:'marala',modules:true,scriptPath:path.resolve('dist/worker/worker.js'),compatibilityDate:'2026-09-22',compatibilityFlags:['nodejs_compat'],
  durableObjects:{MARALA_DB:{className:'MaralaDatabase',useSQLite:true}},bindings:{SETUP_TOKEN:token},
  serviceBindings:{ASSETS:request=>{
   const name=new URL(request.url).pathname==='/'?'index.html':new URL(request.url).pathname.slice(1);
   if(!['index.html','styles.css','integrated.css','integrated.js','sw.js','manifest.webmanifest','icon.svg'].includes(name))return new Response('Not found',{status:404});
   const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
   return new Response(fs.readFileSync(path.resolve('dist/public',name)),{headers:{'Content-Type':types[path.extname(name)]}});
  }}
 }]}));
 let browser;const source=new Store(':memory:');
 try{
  source.saveUser({username:'lama',name:'Admin Lama',password:'PasswordLama123',role:'SUPER ADMIN'});
  source.save('units',{name:'Unit dari cadangan'});
  browser=await chromium.launch({headless:true,channel:'msedge'});
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(String(await mf.ready));
  await page.getByLabel('Kode pengaturan awal Cloudflare').fill(token);
  await page.locator('#restoreFile').setInputFiles({name:'cadangan-uji.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exportSnapshot(source.db)))});
  page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'Pulihkan Data Lokal'}).click();
  await page.getByRole('heading',{name:'Selamat datang kembali'}).waitFor();
  await page.getByLabel('Username').fill('lama');
  await page.locator('[name=password]').fill('PasswordLama123');
  await page.getByRole('button',{name:'Masuk',exact:true}).click();
  await page.getByRole('heading',{name:'Dashboard',exact:true}).first().waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.deepEqual(errors,[]);
  console.log('LULUS browser Cloudflare: kode setup, unggah pemulihan, login akun lama, dashboard mobile.');
 }finally{source.db.close();if(browser)await browser.close();await mf.dispose();}
})().catch(error=>{console.error(error);process.exitCode=1;});
