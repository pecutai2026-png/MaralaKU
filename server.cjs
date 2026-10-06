const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {DatabaseSync}=require('node:sqlite');
const {Store}=require('./business/server/store.cjs');
const {createHandler}=require('./business/server/api.cjs');
const {passwordOK,fail}=require('./business/server/domain.cjs');
const {seed}=require('./seed.cjs');
const normalizePhone=require('./business/server/contacts.cjs').phone;
function whatsapp(value){const result=normalizePhone(value);if(!result)fail('Nomor WhatsApp tidak valid. Gunakan 08…, 628…, atau +kode negara.');return result;}
const ROOT=__dirname,TYPES=['toko','kafe','jasa'];
const hashToken=t=>crypto.createHash('sha256').update(t).digest('hex');
const localDate=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Jakarta'});
function passwordHash(p){if(typeof p!=='string'||p.length<10||p.length>200)fail('Password harus 10–200 karakter.');const salt=crypto.randomBytes(16).toString('hex');return salt+':'+crypto.scryptSync(p,salt,64).toString('hex');}
const text=(s,max=100)=>String(s??'').trim().slice(0,max);
const slugify=s=>s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,45)||'usaha';
function createPlatform({dataDir=path.join(ROOT,'data'),secureCookies=process.env.SECURE_COOKIES==='1'}={}){
 fs.mkdirSync(dataDir,{recursive:true});
 const db=new DatabaseSync(path.join(dataDir,'platform.sqlite'));db.exec(`PRAGMA foreign_keys=ON;PRAGMA journal_mode=WAL;
 CREATE TABLE IF NOT EXISTS admins(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS tenants(id TEXT PRIMARY KEY,name TEXT NOT NULL,slug TEXT UNIQUE NOT NULL,type TEXT NOT NULL,email TEXT UNIQUE NOT NULL,owner_id TEXT NOT NULL,created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'trial',storage TEXT NOT NULL DEFAULT 'trial',last_active INTEGER,sample INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,role TEXT NOT NULL,tenant_id TEXT REFERENCES tenants(id),user_id TEXT NOT NULL,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY,tenant_id TEXT REFERENCES tenants(id),user_id TEXT,feature TEXT NOT NULL,action TEXT NOT NULL,at INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS event_tenant_date ON events(tenant_id,at);
 CREATE TABLE IF NOT EXISTS admin_audit(id INTEGER PRIMARY KEY,admin_id TEXT,action TEXT,target TEXT,details TEXT,at INTEGER NOT NULL);`);
 if(!db.prepare('PRAGMA table_info(tenants)').all().some(c=>c.name==='phone'))db.exec('ALTER TABLE tenants ADD COLUMN phone TEXT');
 db.exec('CREATE UNIQUE INDEX IF NOT EXISTS tenant_phone_unique ON tenants(phone) WHERE phone IS NOT NULL');
 const stores=new Map(),attempts=new Map();
 const config=()=>JSON.parse(db.prepare("SELECT value FROM settings WHERE key='trial'").get()?.value||'{"duration":2,"promo":false,"promoDays":5,"promoStart":"","promoEnd":"","contact":"","retentionDays":30}');
 const tenant=id=>db.prepare('SELECT * FROM tenants WHERE id=?').get(id);
 const dbPath=t=>path.join(dataDir,'tenants',t.storage,t.id+'.sqlite');
 function business(t){if(!stores.has(t.id)){const s=new Store(dbPath(t)),handler=createHandler({store:s,secureCookies,authorizeSetup(){fail('Gunakan halaman pendaftaran Marala.',403);},legacySeed(){return {};}});s.setSetting('posImmediatePayments',{enabled:true});stores.set(t.id,{store:s,handler});}return stores.get(t.id);}
 function publicTenant(t){return {id:t.id,name:t.name,slug:t.slug,type:t.type==='all'?'toko':t.type,email:t.email.endsWith('@marala.invalid')?'':t.email,phone:t.phone||'',createdAt:t.created_at,expiresAt:t.expires_at,status:t.status,expired:t.status==='trial'&&Date.now()>=t.expires_at,blocked:t.status==='blocked',remainingMs:Math.max(0,t.expires_at-Date.now()),lastActive:t.last_active,sample:!!t.sample};}
 function publicConfig(){const c=config();return {...c,offerDays:c.promo&&localDate()>=c.promoStart&&localDate()<=c.promoEnd?c.promoDays:c.duration};}
 function json(res,data,status=200){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
 async function body(req){let chunks=[],size=0;for await(const part of req){size+=part.length;if(size>1000000)fail('Permintaan terlalu besar.',413);chunks.push(part);}try{return JSON.parse(Buffer.concat(chunks).toString()||'{}');}catch{fail('Format permintaan tidak valid.');}}
 function session(req){const token=(req.headers.cookie||'').match(/(?:^|;\s*)marala_access=([a-f0-9]{64})/)?.[1];if(!token)return null;const s=db.prepare('SELECT * FROM sessions WHERE token=? AND expires>?').get(hashToken(token),Date.now());if(!s)return null;if(s.role==='admin'){if(!db.prepare('SELECT id FROM admins WHERE id=?').get(s.user_id))return null;}else{const t=tenant(s.tenant_id);if(!t)return null;const user=business(t).store.user(s.user_id);if(!user?.active)return null;}return {...s,rawToken:token};}
 function cookies(res,token,businessToken=token){const secure=secureCookies?'; Secure':'';res.setHeader('Set-Cookie',[`marala_access=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${secure}`,`marala_session=${businessToken}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${secure}`]);}
 function login(res,role,userId,t){const token=crypto.randomBytes(32).toString('hex'),expiry=Date.now()+43200000;db.prepare('INSERT INTO sessions VALUES(?,?,?,?,?)').run(hashToken(token),role,t?.id||null,userId,expiry);if(t)business(t).store.db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hashToken(token),userId,expiry);cookies(res,token,role==='admin'?'':token);return token;}
 function gate(s,role){if(!s||s.role!==role)fail('Silakan masuk dengan akun '+(role==='admin'?'Admin BUMM':'usaha')+'.',401);}
 function owner(s,t){if(s.user_id!==t.owner_id)fail('Hanya pemilik usaha dapat melakukan tindakan ini.',403);}
 function log(s,feature,action){db.prepare('INSERT INTO events(tenant_id,user_id,feature,action,at) VALUES(?,?,?,?,?)').run(s.tenant_id,s.user_id,feature,action,Date.now());db.prepare('UPDATE tenants SET last_active=? WHERE id=?').run(Date.now(),s.tenant_id);}
 function audit(s,action,target,details={}){db.prepare('INSERT INTO admin_audit(admin_id,action,target,details,at) VALUES(?,?,?,?,?)').run(s?.user_id||'setup',action,target,JSON.stringify(details),Date.now());}
 function attempt(req,key){const ip=req.socket.remoteAddress,entry=attempts.get(ip+':'+key);if(entry?.until>Date.now())fail('Terlalu banyak percobaan. Coba lagi dalam 15 menit.',429);return ip+':'+key;}
 function failed(key){const item=attempts.get(key)||{count:0};item.count++;if(item.count>=8)item.until=Date.now()+900000;attempts.set(key,item);}
 function clearSession(req,res,s){if(s){db.prepare('DELETE FROM sessions WHERE token=?').run(s.token);if(s.tenant_id)business(tenant(s.tenant_id)).store.db.prepare('DELETE FROM sessions WHERE token=?').run(s.token);}cookies(res,'','');}
 const allowedFeatures=new Set(['dashboard','attendance','attendanceadmin','posdashboard','poscashier','posqueue','poshistory','posdebt','posproducts','posapproval','posmonthly','units','products','customers','contacts','referrals','invoices','payments','sales','stockitems','warehouse','teko','allstock','movements','transfers','opnames','shopping','expenses','procurements','requests','petty','profit','revenue','opnamereport','reportapproval','identity','banks','invoiceSettings','appearance','users','application','activity']);
 async function platform(req,res,url){const p=url.pathname,method=req.method,s=session(req);
  if(p==='/platform/public'&&method==='GET')return json(res,{config:publicConfig(),setup:db.prepare('SELECT count(*) n FROM admins').get().n===0});
  if(p==='/platform/session'&&method==='GET'){if(!s)return json(res,{user:null});if(s.role==='admin')return json(res,{user:{role:'admin',...db.prepare('SELECT id,name,email FROM admins WHERE id=?').get(s.user_id)}});const t=tenant(s.tenant_id);return json(res,{user:{...business(t).store.user(s.user_id),businessRole:business(t).store.user(s.user_id).role,role:'tenant'},tenant:publicTenant(t),config:publicConfig()});}
  if(p==='/platform/admin/setup'&&method==='POST'){
   if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress))fail('Pengaturan pertama hanya dapat dilakukan dari komputer server.',403);
   if(db.prepare('SELECT count(*) n FROM admins').get().n)fail('Admin BUMM sudah tersedia.',409);
   const d=await body(req),name=text(d.name),email=text(d.email,254).toLowerCase();if(!name||!/^\S+@\S+\.\S+$/.test(email))fail('Nama dan email valid wajib diisi.');const encoded=passwordHash(d.password),id=crypto.randomUUID();db.prepare('INSERT INTO admins VALUES(?,?,?,?)').run(id,name,email,encoded);login(res,'admin',id);audit({user_id:id},'setup','platform');return json(res,{ok:true},201);
  }
  if(p==='/platform/register'&&method==='POST'){
   const key=attempt(req,'register'),d=await body(req);if(!TYPES.includes(d.type))fail('Pilih jenis usaha.');const name=text(d.business),ownerName=text(d.owner),phone=whatsapp(d.phone),username=text(d.username,80).toLowerCase();if(!name||!ownerName||!/^[a-z0-9._-]{3,80}$/.test(username))fail('Lengkapi nama usaha, pemilik, nomor WhatsApp, dan username minimal 3 karakter.');passwordHash(d.password);if(db.prepare('SELECT id FROM tenants WHERE phone=?').get(phone))fail('Nomor WhatsApp sudah terdaftar. Silakan masuk.',409);
   const id=crypto.randomUUID(),email=id+'@marala.invalid',created=Date.now(),c=publicConfig();let slug=slugify(name);if(db.prepare('SELECT id FROM tenants WHERE slug=?').get(slug))slug+='-'+crypto.randomBytes(3).toString('hex');
   const t={id,name,slug,type:d.type,email,phone,storage:'trial'};const file=dbPath(t);let entry;
   try{entry=business(t);const u=entry.store.tx(()=>{const user=entry.store.saveUser({name:ownerName,username,password:d.password,role:'SUPER ADMIN'},undefined,'setup');seed(entry.store,t,user,d.samples!==false);return user;});db.prepare('INSERT INTO tenants(id,name,slug,type,email,owner_id,created_at,expires_at,sample,last_active,phone) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(id,name,slug,d.type,email,u.id,created,created+c.offerDays*86400000,Number(d.samples!==false),created,phone);login(res,'tenant',u.id,tenant(id));log({tenant_id:id,user_id:u.id},'registration','register');failed(key);return json(res,{ok:true,tenant:publicTenant(tenant(id)),redirect:'/workspace'},201);}catch(e){stores.delete(id);try{entry?.store.db.close();for(const suffix of ['','-wal','-shm'])if(fs.existsSync(file+suffix))fs.unlinkSync(file+suffix);}catch{}throw e;}
  }
  if(p==='/platform/login'&&method==='POST'){
   const d=await body(req),key=attempt(req,'login');let user,t;const email=text(d.email,254).toLowerCase();
   if(d.role==='admin'){user=db.prepare('SELECT * FROM admins WHERE email=?').get(email);}
   else{t=d.slug?db.prepare('SELECT * FROM tenants WHERE slug=?').get(text(d.slug).toLowerCase()):d.phone?db.prepare('SELECT * FROM tenants WHERE phone=?').get(whatsapp(d.phone)):db.prepare('SELECT * FROM tenants WHERE email=?').get(email);if(t)user=d.username?business(t).store.db.prepare('SELECT * FROM users WHERE username=? AND active=1 AND deleted=0').get(text(d.username).toLowerCase()):business(t).store.db.prepare('SELECT * FROM users WHERE id=? AND active=1 AND deleted=0').get(t.owner_id);}
   if(!user||!passwordOK(d.password,user.password)){failed(key);fail('Akun atau password tidak sesuai.',401);}if(t?.status==='blocked')fail('Akses usaha dinonaktifkan. Hubungi BUMM.',403);attempts.delete(key);login(res,d.role==='admin'?'admin':'tenant',user.id,t);if(t)log({tenant_id:t.id,user_id:user.id},'login','login');return json(res,{ok:true,redirect:d.role==='admin'?'/admin':'/workspace'});
  }
  if(p==='/platform/logout'&&method==='POST'){clearSession(req,res,s);return json(res,{ok:true});}
  if(p==='/platform/event'&&method==='POST'){gate(s,'tenant');const d=await body(req);if(!allowedFeatures.has(d.feature)||d.action!=='view')fail('Aktivitas tidak valid.');log(s,d.feature,'view');return json(res,{ok:true});}
  if(p==='/platform/profile'&&method==='PUT'){gate(s,'tenant');const t=tenant(s.tenant_id);owner(s,t);const d=await body(req);if(!TYPES.includes(d.type))fail('Jenis usaha tidak valid.');const phone=d.phone===undefined?t.phone:whatsapp(d.phone);if(phone&&db.prepare('SELECT id FROM tenants WHERE phone=? AND id<>?').get(phone,t.id))fail('Nomor WhatsApp sudah digunakan usaha lain.',409);db.prepare('UPDATE tenants SET type=?,phone=? WHERE id=?').run(d.type,phone,t.id);return json(res,{ok:true});}
  if(p.startsWith('/platform/admin/')){gate(s,'admin');
   if(p==='/platform/admin/overview'&&method==='GET'){
    const items=db.prepare('SELECT * FROM tenants ORDER BY created_at DESC').all().map(t=>({...publicTenant(t),owner:business(t).store.user(t.owner_id)?.name||'',sessions:db.prepare("SELECT count(*) n FROM events WHERE tenant_id=? AND action='login'").get(t.id).n+1,features:db.prepare('SELECT feature,action,count(*) count FROM events WHERE tenant_id=? GROUP BY feature,action ORDER BY count DESC').all(t.id)}));
    const featureRows=db.prepare("SELECT feature,action,count(*) count,count(DISTINCT tenant_id) businesses FROM events WHERE action IN ('view','write') GROUP BY feature,action ORDER BY count DESC").all();
    const counts={registered:items.length,visited:db.prepare("SELECT count(DISTINCT tenant_id) n FROM events WHERE action='view'").get().n,transacted:db.prepare("SELECT count(DISTINCT tenant_id) n FROM events WHERE action='write' AND feature IN ('postickets','pospayments','invoices','payments','sales')").get().n,reports:db.prepare("SELECT count(DISTINCT tenant_id) n FROM events WHERE feature IN ('profit','revenue','posmonthly','reportapproval') AND action='view'").get().n,paid:items.filter(t=>t.status==='paid').length};
    return json(res,{tenants:items,features:featureRows,funnel:counts,config:publicConfig(),audit:db.prepare('SELECT action,target,details,at FROM admin_audit ORDER BY id DESC LIMIT 30').all()});
   }
   if(p==='/platform/admin/settings'&&method==='PUT'){const d=await body(req),days=Number(d.duration),promoDays=Number(d.promoDays);if(!Number.isInteger(days)||days<1||days>365||!Number.isInteger(promoDays)||promoDays<1||promoDays>365)fail('Durasi harus 1–365 hari.');if(d.promo&&(!/^\d{4}-\d{2}-\d{2}$/.test(d.promoStart||'')||!/^\d{4}-\d{2}-\d{2}$/.test(d.promoEnd||'')||d.promoStart>d.promoEnd))fail('Periode promo tidak valid.');const contact=String(d.contact||'').replace(/[^0-9]/g,'');if(contact&&!/^\d{8,16}$/.test(contact))fail('Nomor WhatsApp harus 8–16 digit, dengan kode negara.');const c={duration:days,promo:!!d.promo,promoDays,promoStart:text(d.promoStart,10),promoEnd:text(d.promoEnd,10),contact,retentionDays:30};db.exec('BEGIN');try{db.prepare("INSERT INTO settings VALUES('trial',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(JSON.stringify(c));let affected=0;if(d.applyExisting){const update=db.prepare("UPDATE tenants SET expires_at=max(expires_at,?) WHERE status='trial'").run(Date.now()+days*86400000);affected=update.changes;}audit(s,'trial-settings','platform',{...c,affected});db.exec('COMMIT');return json(res,{ok:true,affected,config:publicConfig()});}catch(e){db.exec('ROLLBACK');throw e;}}
   const match=p.match(/^\/platform\/admin\/tenants\/([a-f0-9-]{36})\/(extend|expire|activate|block|unblock|export)$/);
   if(match){const t=tenant(match[1]);if(!t)fail('Usaha tidak ditemukan.',404);const action=match[2];
    if(action==='export'&&method==='GET'){const snapshot=require('./business/server/snapshot.cjs').exportSnapshot(business(t).store.db);audit(s,'export-private-backup',t.id);res.writeHead(200,{'Content-Type':'application/json','Content-Disposition':`attachment; filename="marala-${t.slug}-private.json"`,'Cache-Control':'no-store'});return res.end(JSON.stringify(snapshot));}
    if(method!=='POST')fail('Gunakan POST.',405);const d=await body(req);
    if(action==='extend'){if(t.status!=='trial')fail('Perpanjangan hanya untuk usaha trial.');const days=Number(d.days);if(!Number.isInteger(days)||days<1||days>365)fail('Tambahan harus 1–365 hari.');db.prepare('UPDATE tenants SET expires_at=? WHERE id=?').run(Math.max(Date.now(),t.expires_at)+days*86400000,t.id);}
    if(action==='expire'){if(t.status!=='trial')fail('Hanya trial yang dapat diakhiri.');db.prepare('UPDATE tenants SET expires_at=? WHERE id=?').run(Date.now()-1000,t.id);}
    if(action==='block')db.prepare("UPDATE tenants SET status='blocked' WHERE id=?").run(t.id);
    if(action==='unblock')db.prepare('UPDATE tenants SET status=? WHERE id=?').run(t.storage==='paid'?'paid':'trial',t.id);
    if(action==='activate'){
     if(t.status==='paid')return json(res,{ok:true,tenant:publicTenant(t)});if(t.status==='blocked')fail('Buka blokir terlebih dahulu.');
     const oldPath=dbPath(t),newPath=dbPath({...t,storage:'paid'});fs.mkdirSync(path.dirname(newPath),{recursive:true});if(fs.existsSync(newPath))fail('Database tujuan sudah tersedia. Perlu pemeriksaan manual.',409);const entry=business(t);entry.store.db.exec('PRAGMA wal_checkpoint(TRUNCATE)');entry.store.db.close();stores.delete(t.id);fs.renameSync(oldPath,newPath);try{db.prepare("UPDATE tenants SET status='paid',storage='paid' WHERE id=?").run(t.id);}catch(e){fs.renameSync(newPath,oldPath);throw e;}business(tenant(t.id));
    }
    audit(s,action,t.id,{days:d.days||null});return json(res,{ok:true,tenant:publicTenant(tenant(t.id))});
   }
  }
  fail('Halaman API tidak ditemukan.',404);
 }
 function serveFile(res,file,head=false){const ext=path.extname(file),types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream','Cache-Control':'no-cache'});res.end(head?undefined:fs.readFileSync(file));}
 const server=http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://localhost'),p=url.pathname;res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','SAMEORIGIN');res.setHeader('Referrer-Policy','same-origin');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-src 'self' blob:; frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self'");
  if(!['GET','HEAD'].includes(req.method)){if(req.headers['sec-fetch-site']==='cross-site')fail('Permintaan lintas situs ditolak.',403);if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)fail('Origin tidak diizinkan.',403);if(!String(req.headers['content-type']).startsWith('application/json'))fail('Gunakan JSON.',415);}
  if(p.startsWith('/platform/'))return await platform(req,res,url);
  if(p.startsWith('/api/')||p==='/manifest.webmanifest'){
   const s=session(req);gate(s,'tenant');const t=tenant(s.tenant_id);if(t.status==='blocked')fail('Usaha dinonaktifkan. Hubungi BUMM.',403);
   if(p==='/api/logout'){clearSession(req,res,s);return json(res,{ok:true});}if(p==='/api/login'||p==='/api/setup')fail('Gunakan halaman akun Marala.',403);
   if(t.status==='trial'&&Date.now()>=t.expires_at&&!['GET','HEAD'].includes(req.method))return json(res,{error:'Masa coba selesai. Data tetap bisa dilihat dan diekspor. Hubungi BUMM untuk aktivasi.',code:'TRIAL_EXPIRED'},423);
   if(p==='/api/application-brand')return json(res,{name:t.name+' · MaralaKu',icon:'/assets/logo.png'});
   const entry=business(t);req.headers.cookie=(req.headers.cookie||'').replace(/(?:^|;\s*)marala_session=[^;]*/g,'')+'; marala_session='+s.rawToken;
   res.once('finish',()=>{if(res.statusCode>=200&&res.statusCode<300&&!['GET','HEAD'].includes(req.method)){const feature=p.startsWith('/api/records/')?p.split('/')[3]:p.startsWith('/api/pos/tickets')?'postickets':/^\/api\/pos\/orders\/[^/]+\/pay$/.test(p)?'pospayments':p.startsWith('/api/pos/')?'pos'+p.split('/')[3]:p.split('/')[2]||'system';log(s,feature,'write');}});
   return await entry.handler(req,res);
  }
  if(!['GET','HEAD'].includes(req.method))fail('Metode tidak diizinkan.',405);
  if(p==='/workspace'||(p==='/'&&url.searchParams.has('workspace'))){const s=session(req);if(s?.role!=='tenant'){res.writeHead(302,{Location:'/login'});return res.end();}if(tenant(s.tenant_id).status==='blocked'){res.writeHead(302,{Location:'/account'});return res.end();}return serveFile(res,path.join(ROOT,'business','index.html'),req.method==='HEAD');}
  if(['/','/login','/register','/admin','/account','/paket-usaha'].includes(p))return serveFile(res,path.join(ROOT,'public',p==='/admin'?'admin.html':'index.html'),req.method==='HEAD');
  if(p.startsWith('/assets/')&&/^\/assets\/[a-zA-Z0-9_.-]+$/.test(p)){const file=path.join(ROOT,'public',p);if(fs.existsSync(file))return serveFile(res,file,req.method==='HEAD');}
  const publicNames=['platform.js','platform.css','workspace.js','workspace.css','workspace-menu.js','contact.js','contact.css','packages.js','packages.css'];if(publicNames.includes(p.slice(1)))return serveFile(res,path.join(ROOT,'public',p.slice(1)),req.method==='HEAD');
  const businessNames=['integrated.js','pos-ui.js','bulk-edit.js','attendance-ui.js','styles.css','integrated.css','icon.svg'];if(businessNames.includes(p.slice(1)))return serveFile(res,path.join(ROOT,'business',p.slice(1)),req.method==='HEAD');
  // This product uses the network directly; never serve the prototype's offline shell.
  if(p==='/sw.js'){res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'});return res.end("self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(self.registration.unregister()));");}
  fail('Halaman tidak ditemukan.',404);
 }catch(e){if(!res.headersSent)json(res,{error:e.status?e.message:'Pemrosesan gagal. Silakan coba kembali.'},e.status||500);else res.end();}});
 function close(){for(const entry of stores.values())entry.store.db.close();stores.clear();db.close();}
 return {server,db,business,tenant,close};
}
if(require.main===module){const app=createPlatform(),host=process.env.HOST||'127.0.0.1',port=Number(process.env.PORT||4180);app.server.listen(port,host,()=>console.log(`Marala lokal siap: http://${host}:${port}\nAdmin BUMM: http://${host}:${port}/admin`));const stop=()=>app.server.close(()=>{app.close();process.exit(0);});process.on('SIGINT',stop);process.on('SIGTERM',stop);}
module.exports={createPlatform};


