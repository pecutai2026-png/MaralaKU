const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {Store,fail}=require('./store.cjs');
const {createHandler}=require('./api.cjs');
const ROOT=path.resolve(__dirname,'..');
function legacySeed(){
 const source=fs.readFileSync(path.join(ROOT,'legacy','app.js'),'utf8');
 const seed=require('node:vm').runInNewContext(source.slice(source.indexOf('const db ='),source.indexOf('const icon='))+';db');
 seed.payments=[{date:'22 Sep 2026',invoice:'INV/MARALA/2026/0024',customer:'Aisyah Rahman',method:'Transfer',amount:2000000},{date:'21 Sep 2026',invoice:'INV/MARALA/2026/0023',customer:'PT Harmoni',method:'Transfer',amount:2500000}];
 return seed;
}
function createApp({dbFile=path.join(ROOT,'data','marala.sqlite')}={}){
 const store=new Store(dbFile);
 const handler=createHandler({store,secureCookies:process.env.SECURE_COOKIES==='1',legacySeed,authorizeSetup(req){
  if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress))fail('Pengaturan awal hanya dari komputer server.',403);
 }});
 const server=http.createServer((req,res)=>{
  const p=new URL(req.url,'http://localhost').pathname;
  if(p.startsWith('/api/')||p==='/manifest.webmanifest')return handler(req,res);
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','SAMEORIGIN');res.setHeader('Referrer-Policy','same-origin');
  const filename=p==='/'?'index.html':p.slice(1);
  const allowed=['index.html','app.js','styles.css','integrated.js','pos-ui.js','bulk-edit.js','attendance-ui.js','integrated.css','sw.js','icon.svg','manifest.webmanifest'];
  if(!['GET','HEAD'].includes(req.method)||!/^[a-zA-Z0-9_.-]+$/.test(filename)||(!allowed.includes(filename)&&!filename.endsWith('.css'))||!fs.existsSync(path.join(ROOT,filename))){res.writeHead(404);return res.end('Halaman tidak ditemukan.');}
  const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
  res.writeHead(200,{'Content-Type':types[path.extname(filename)]+'; charset=utf-8','Cache-Control':'no-cache','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-src 'self' blob:; frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self'"});
  res.end(req.method==='HEAD'?undefined:fs.readFileSync(path.join(ROOT,filename)));
 });
 return {server,store};
}
if(require.main===module){const {server}=createApp();const host=process.env.HOST||'127.0.0.1',port=Number(process.env.PORT||4173);server.listen(port,host,()=>console.log(`BUMM Marala siap di http://${host}:${port}`));}
module.exports={createApp};
